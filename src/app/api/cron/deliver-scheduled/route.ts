import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { sendPushToSubscriptions } from '@/lib/push';

// Note: route handlers already run on the Node.js runtime by default, which
// web-push requires. An explicit `export const runtime` is omitted because it
// is incompatible with this project's Next.js `cacheComponents` config.
export const maxDuration = 60;

const PUSH_ICON = '/icons/icon-192x192.png?v=2';

/**
 * Delivery cron (Slice 11 v2, #96 half B rework). Called every few minutes
 * by a Supabase `pg_cron` job (via `pg_net`, not Vercel Cron — Vercel's
 * Hobby plan only allows once-per-day cron, which is why generation and
 * delivery are split into two routes; see `push-reminders/route.ts` for the
 * daily generation half).
 *
 * Finds every `notifications` row whose `scheduled_for` has arrived but
 * hasn't been delivered yet, groups them by user, and pushes each one via
 * web push. Marks each attempted row `delivered_at = now()` regardless of
 * per-subscription push success/failure (a dead subscription is cleaned up
 * here, per Slice 10's dead-subscription handling, but is not a reason to
 * retry the notification itself — this route does not retry-loop).
 *
 * Runs with no user session, so it uses a service_role Supabase client that
 * bypasses RLS. Per-row failures are logged and skipped so one bad row can
 * never abort the whole batch.
 */
export async function GET(request: Request) {
  // ── Auth ───────────────────────────────────────
  // Deliberately a *different* secret from CRON_SECRET: this route is
  // invoked by Supabase pg_net, not Vercel Cron, and gets its own bearer
  // token so the two trigger paths can be rotated/revoked independently.
  const deliverCronSecret = process.env.DELIVER_CRON_SECRET;
  if (!deliverCronSecret) {
    return NextResponse.json(
      { error: 'DELIVER_CRON_SECRET is not configured on the server' },
      { status: 500 }
    );
  }
  const authHeader = request.headers.get('Authorization');
  if (authHeader !== `Bearer ${deliverCronSecret}`) {
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
    // ── Fetch due, undelivered notifications ─────
    const nowIso = new Date().toISOString();
    const { data: due, error: dueError } = await supabase
      .from('notifications')
      .select('id, user_id, title, message, related_entity_id')
      .is('delivered_at', null)
      .lte('scheduled_for', nowIso);

    if (dueError) {
      console.error('[deliver-scheduled] fetch error:', dueError);
      return NextResponse.json({ error: 'Database error' }, { status: 500 });
    }

    const dueRows = due ?? [];
    if (dueRows.length === 0) {
      return NextResponse.json({ due: 0, users: 0, delivered: 0, pushed: 0 });
    }

    // ── Batch-fetch every needed user's push subscriptions in one query ──
    const userIds = Array.from(
      new Set(dueRows.filter(r => r.user_id).map(r => String(r.user_id)))
    );

    const { data: allSubs, error: subsError } = await supabase
      .from('push_subscriptions')
      .select('id, user_id, endpoint, p256dh, auth')
      .in('user_id', userIds);

    if (subsError) {
      console.error('[deliver-scheduled] subscriptions fetch error:', subsError);
      return NextResponse.json({ error: 'Database error' }, { status: 500 });
    }

    const subsByUser = new Map<string, typeof allSubs>();
    for (const sub of allSubs ?? []) {
      const uid = String(sub.user_id);
      const arr = subsByUser.get(uid);
      if (arr) arr.push(sub);
      else subsByUser.set(uid, [sub]);
    }

    // ── Group due rows by user ────────────────────
    const rowsByUser = new Map<string, typeof dueRows>();
    for (const row of dueRows) {
      if (!row.user_id) continue;
      const uid = String(row.user_id);
      const arr = rowsByUser.get(uid);
      if (arr) arr.push(row);
      else rowsByUser.set(uid, [row]);
    }

    let deliveredTotal = 0;
    let pushedTotal = 0;
    const expiredIds = new Set<string>();
    const deliveredIds: (string | number)[] = [];

    for (const [userId, rows] of rowsByUser) {
      const subscriptions = subsByUser.get(userId) ?? [];

      for (const notif of rows) {
        try {
          if (subscriptions.length > 0) {
            const result = await sendPushToSubscriptions(subscriptions, {
              title: notif.title,
              body: notif.message,
              url: notif.related_entity_id
                ? `/bills?billId=${notif.related_entity_id}`
                : '/',
              icon: PUSH_ICON,
            });
            pushedTotal += result.successCount;
            for (const id of result.expiredIds) expiredIds.add(id);
          }

          // Mark delivered regardless of push outcome (no user subscription,
          // or a partial/full push failure) — this route does not retry.
          deliveredIds.push(notif.id);
          deliveredTotal++;
        } catch (rowErr) {
          console.error(`[deliver-scheduled] failed for notification ${notif.id}:`, rowErr);
          // Continue with the next row.
        }
      }
    }

    if (deliveredIds.length > 0) {
      const { error: updateError } = await supabase
        .from('notifications')
        .update({ delivered_at: new Date().toISOString() })
        .in('id', deliveredIds);
      if (updateError) {
        console.error('[deliver-scheduled] failed to mark rows delivered:', updateError);
      }
    }

    if (expiredIds.size > 0) {
      await supabase
        .from('push_subscriptions')
        .delete()
        .in('id', Array.from(expiredIds));
    }

    return NextResponse.json({
      due: dueRows.length,
      users: rowsByUser.size,
      delivered: deliveredTotal,
      pushed: pushedTotal,
    });
  } catch (error) {
    console.error('[deliver-scheduled] fatal error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
