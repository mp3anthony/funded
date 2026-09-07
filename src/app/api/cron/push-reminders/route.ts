import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { generateReminders, type ReminderSettings } from '@/lib/notifications/generateReminders';
import { todayInZone, zonedDateAtHour } from '@/lib/notifications/timezone';

// Note: route handlers already run on the Node.js runtime by default, which
// web-push requires. An explicit `export const runtime` is omitted because it
// is incompatible with this project's Next.js `cacheComponents` config.
export const maxDuration = 60;

/**
 * Reminder-generation cron (GET) that generates due-bill / auto-pay / lodge
 * / payday / goal-milestone reminders for every household member and stores
 * them with a `scheduled_for` delivery timestamp. It does NOT send push
 * notifications itself — actual delivery is handled by a separate Supabase
 * `pg_cron` job that calls `/api/cron/deliver-scheduled` every few minutes
 * and pushes any row whose `scheduled_for` has arrived. See
 * `src/app/api/cron/deliver-scheduled/route.ts`.
 *
 * Slice 11 v2 (#96 half B rework): the original design (PR #127) ran this
 * cron hourly so it could match each household's local `notify_hour`
 * exactly. That couldn't ship as a Vercel Cron — the Vercel Hobby plan only
 * allows once-per-day *Vercel* cron, so the hourly schedule silently failed
 * to deploy to production. A once-daily fixed-UTC-hour run was shipped as a
 * stopgap, but that reintroduced the same underlying problem: whichever
 * timezones had already passed their local `notify_hour` by the time that
 * one daily run happened would get a `scheduled_for` in the past, so the
 * reminder fired almost immediately instead of at the chosen local time
 * (#144).
 *
 * Fix (#144): this route is now invoked frequently (every 15-30 min) by a
 * Supabase `pg_cron` job — the same trigger mechanism deliver-scheduled
 * already uses, which is not subject to Vercel's cron-frequency limit — via
 * a dedicated `GENERATION_CRON_SECRET` (see Auth below). Vercel Cron
 * (`vercel.json`: `0 15 * * *`) is left in place for now as a once-daily
 * fallback/manual-trigger path; retiring it is a separate ops decision.
 *
 * Calling this route frequently is safe because of the existing dedupe-key
 * logic (`existingKeys`, sourced from `notifications.dedupe_key` below):
 * every reminder row carries a dedupe key scoped to the entity + relevant
 * date, and the upsert below uses `onConflict: 'user_id,dedupe_key',
 * ignoreDuplicates: true` — so re-running generation before a household's
 * dedupe key rolls over (next due date / next day, depending on reminder
 * type) is a no-op, not a duplicate insert. Running this every 15-30 min
 * instead of once a day just means the very next run after a household's
 * local day rolls over (or after their `notify_hour`) computes and inserts
 * that day's reminders promptly, with a correct *future* `scheduled_for`,
 * instead of one fixed daily run computing it wrong for whichever
 * timezones don't line up with that hour.
 *
 * Runs with no user session, so it uses a service_role Supabase client that
 * bypasses RLS. Per-user failures are logged and skipped so one bad row can
 * never abort the whole run.
 */
export async function GET(request: Request) {
  // ── Auth ───────────────────────────────────────
  // Accepts EITHER CRON_SECRET (the original Vercel Cron trigger, left in
  // place as a fallback/manual-trigger path — see vercel.json) OR
  // GENERATION_CRON_SECRET (#144: a separate secret for the new frequent
  // Supabase pg_cron trigger, mirroring DELIVER_CRON_SECRET's pattern in
  // deliver-scheduled/route.ts — deliberately distinct so the two trigger
  // paths can be rotated/revoked independently of each other and of
  // CRON_SECRET). At least one of the two env vars must be configured.
  const cronSecret = process.env.CRON_SECRET;
  const generationCronSecret = process.env.GENERATION_CRON_SECRET;
  if (!cronSecret && !generationCronSecret) {
    return NextResponse.json(
      { error: 'Neither CRON_SECRET nor GENERATION_CRON_SECRET is configured on the server' },
      { status: 500 }
    );
  }
  const authHeader = request.headers.get('Authorization');
  const isAuthorized =
    (!!cronSecret && authHeader === `Bearer ${cronSecret}`) ||
    (!!generationCronSecret && authHeader === `Bearer ${generationCronSecret}`);
  if (!isAuthorized) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    return NextResponse.json(
      { error: 'Supabase service-role configuration is missing' },
      { status: 500 }
    );
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });

  try {
    // ── Fetch everything up front ────────────────
    const [
      householdsRes,
      membersRes,
      settingsRes,
      billsRes,
      payHistoryRes,
      paySchedulesRes,
      fundsRes,
      existingNotifsRes,
    ] = await Promise.all([
      supabase.from('households').select('id, timezone'),
      supabase.from('household_members').select('id, user_id, household_id'),
      supabase.from('notification_settings').select('*'),
      supabase.from('bills').select('*'),
      supabase
        .from('pay_history')
        .select('id, member_id, household_id, pay_date, status')
        .eq('status', 'pending'),
      supabase
        .from('pay_schedules')
        .select('id, member_id, household_id, next_pay_date'),
      supabase
        .from('funds')
        .select('id, name, household_id, current_amount, target_amount'),
      supabase.from('notifications').select('user_id, dedupe_key'),
    ]);

    const firstError =
      householdsRes.error ||
      membersRes.error ||
      settingsRes.error ||
      billsRes.error ||
      payHistoryRes.error ||
      paySchedulesRes.error ||
      fundsRes.error ||
      existingNotifsRes.error;
    if (firstError) {
      console.error('[push-reminders] fetch error:', firstError);
      return NextResponse.json({ error: 'Database error' }, { status: 500 });
    }

    const households = householdsRes.data ?? [];
    const members = membersRes.data ?? [];
    const allSettings = settingsRes.data ?? [];
    const allBills = billsRes.data ?? [];
    const pendingPayHistory = payHistoryRes.data ?? [];
    const allPaySchedules = paySchedulesRes.data ?? [];
    const allFunds = fundsRes.data ?? [];
    const existingNotifs = existingNotifsRes.data ?? [];

    // ── Group in memory ──────────────────────────
    const householdTz = new Map<string, string>();
    for (const h of households) {
      householdTz.set(String(h.id), h.timezone || 'Australia/Sydney');
    }

    const settingsByUser = new Map<
      string,
      ReminderSettings & { all_enabled?: boolean; notify_hour?: number }
    >();
    for (const s of allSettings) {
      if (s.user_id) settingsByUser.set(String(s.user_id), s);
    }

    const billsByHousehold = new Map<string, typeof allBills>();
    for (const b of allBills) {
      const hid = String(b.household_id);
      const arr = billsByHousehold.get(hid);
      if (arr) arr.push(b);
      else billsByHousehold.set(hid, [b]);
    }

    const payByHousehold = new Map<string, typeof pendingPayHistory>();
    for (const p of pendingPayHistory) {
      const hid = String(p.household_id);
      const arr = payByHousehold.get(hid);
      if (arr) arr.push(p);
      else payByHousehold.set(hid, [p]);
    }

    const paySchedulesByHousehold = new Map<string, typeof allPaySchedules>();
    for (const s of allPaySchedules) {
      const hid = String(s.household_id);
      const arr = paySchedulesByHousehold.get(hid);
      if (arr) arr.push(s);
      else paySchedulesByHousehold.set(hid, [s]);
    }

    const fundsByHousehold = new Map<string, typeof allFunds>();
    for (const f of allFunds) {
      const hid = String(f.household_id);
      const arr = fundsByHousehold.get(hid);
      if (arr) arr.push(f);
      else fundsByHousehold.set(hid, [f]);
    }

    const keysByUser = new Map<string, Set<string>>();
    for (const n of existingNotifs) {
      if (!n.user_id || !n.dedupe_key) continue;
      const uid = String(n.user_id);
      const set = keysByUser.get(uid);
      if (set) set.add(n.dedupe_key);
      else keysByUser.set(uid, new Set([n.dedupe_key]));
    }

    let usersProcessed = 0;
    let insertedTotal = 0;

    // ── Per household → per member ───────────────
    for (const household of households) {
      const householdId = String(household.id);
      const tz = householdTz.get(householdId) || 'Australia/Sydney';
      const todayYmd = todayInZone(tz);
      const householdBills = billsByHousehold.get(householdId) ?? [];
      const householdPay = payByHousehold.get(householdId) ?? [];
      const householdPaySchedules = paySchedulesByHousehold.get(householdId) ?? [];
      const householdFunds = fundsByHousehold.get(householdId) ?? [];
      const householdMembers = members.filter(m => String(m.household_id) === householdId);

      for (const member of householdMembers) {
        const userId = member.user_id ? String(member.user_id) : null;
        if (!userId) continue;

        try {
          const settings = settingsByUser.get(userId);
          // Skip users with no settings row or notifications disabled.
          if (!settings || settings.all_enabled === false) continue;

          usersProcessed++;

          const existingKeys = keysByUser.get(userId) ?? new Set<string>();

          const rows = generateReminders({
            userId,
            householdId,
            todayYmd,
            bills: householdBills,
            payHistory: householdPay,
            paySchedules: householdPaySchedules,
            funds: householdFunds,
            currentMemberId: member.id != null ? String(member.id) : null,
            settings,
            existingKeys,
          });

          if (rows.length === 0) continue;

          // `notify_hour` defaults to 9 in the DB (see migration
          // 20260903120000_add_notify_hour_and_new_reminder_types.sql), so
          // this fallback only matters for a settings row read before that
          // column existed. `scheduled_for` is today's date in the
          // household's timezone at that local hour, converted to UTC — the
          // separate delivery cron (deliver-scheduled) is what actually
          // pushes it once that instant arrives.
          //
          // #144: with this route now called every 15-30 min (see the
          // module doc comment above), the first run after a household's
          // local day rolls over computes `scheduled_for` as *today* at
          // that household's `notify_hour` — almost always still in the
          // future at that point, so the reminder correctly waits for the
          // chosen local time instead of firing immediately. A
          // `scheduled_for` in the past can still happen on rare occasions
          // (e.g. the generation cron being paused/failing for a stretch
          // spanning a household's notify_hour, or a brand-new dedupe key
          // — such as a bill just created with a near-term due date —
          // first becoming eligible after that hour has already passed
          // today); the delivery cron simply delivers that reminder on its
          // next run rather than skipping it, which remains the correct
          // fallback behavior for an already-missed local time.
          const notifyHour = settings.notify_hour ?? 9;
          const scheduledFor = zonedDateAtHour(todayYmd, notifyHour, tz).toISOString();

          const rowsWithSchedule = rows.map(row => ({
            ...row,
            scheduled_for: scheduledFor,
            delivered_at: null,
          }));

          const { data: inserted, error: upsertError } = await supabase
            .from('notifications')
            .upsert(rowsWithSchedule, { onConflict: 'user_id,dedupe_key', ignoreDuplicates: true })
            .select();

          if (upsertError) {
            console.error(`[push-reminders] upsert failed for user ${userId}:`, upsertError);
            continue;
          }
          if (!inserted || inserted.length === 0) continue;

          insertedTotal += inserted.length;
        } catch (userErr) {
          console.error(`[push-reminders] failed for user ${userId}:`, userErr);
          // Continue with the next user.
        }
      }
    }

    return NextResponse.json({
      households: households.length,
      users: usersProcessed,
      inserted: insertedTotal,
    });
  } catch (error) {
    console.error('[push-reminders] fatal error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
