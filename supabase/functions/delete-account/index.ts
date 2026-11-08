import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient, type SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

// Delete my account (#509). Runs with the service role because it removes the
// caller's storage files, may hand over or delete their household (same owner
// rules as leave-household), and finally deletes their own login with
// auth.admin.deleteUser, none of which an app user can do directly.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Accepted = signed up and not pending. Owner = role "owner" AND accepted.
// Same definitions as src/lib/householdLeave.ts (Deno cannot import from src);
// keep the two in step, including deleteAccountModeFor below.
type MemberRow = {
  id: string;
  role: string | null;
  user_id: string | null;
  invitation_status: string | null;
  created_at: string | null;
};
const isAccepted = (m: MemberRow) => !!m.user_id && (m.invitation_status ?? "accepted") !== "pending";
const isAcceptedOwner = (m: MemberRow) => m.role === "owner" && isAccepted(m);

type DeleteAccountMode = "no-household" | "leave" | "transfer" | "delete-household";

// Keep in step with deleteAccountModeFor in src/lib/householdLeave.ts.
function deleteAccountModeFor(members: MemberRow[], me: MemberRow | null): DeleteAccountMode {
  if (!me) return "no-household";
  if (!isAccepted(me)) return "leave";
  const others = members.filter((m) => m.id !== me.id);
  if (!others.some(isAccepted)) return "delete-household";
  if (me.role === "owner" && !others.some(isAcceptedOwner)) return "transfer";
  return "leave";
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

// Removes every file directly inside one folder of a bucket. Lists 1000 at a
// time, skips folder entries (id === null), then removes in batches.
async function removeFolder(client: SupabaseClient, bucket: string, folder: string): Promise<string | null> {
  const names: string[] = [];
  const pageSize = 1000;
  for (let offset = 0; ; offset += pageSize) {
    const { data, error } = await client.storage.from(bucket).list(folder, { limit: pageSize, offset });
    if (error) return error.message;
    const page = data ?? [];
    for (const entry of page) {
      if (entry.id !== null) names.push(`${folder}/${entry.name}`);
    }
    if (page.length < pageSize) break;
  }
  for (let i = 0; i < names.length; i += pageSize) {
    const { error } = await client.storage.from(bucket).remove(names.slice(i, i + pageSize));
    if (error) return error.message;
  }
  return null;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    // 1. Authenticate the requesting user via Authorization token
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return json({ error: "Unauthorized" }, 401);
    }
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token);

    if (userError || !user) {
      return json({ error: "Unauthorized" }, 401);
    }

    // 2. Only the chosen new owner is read from the body. The household is
    // worked out from the caller's login, never from the client.
    const body = await req.json().catch(() => ({}));
    const newOwnerMemberId = body?.newOwnerMemberId ?? null;

    // 3. The caller's member row (user_id is unique, ADR 0003).
    const { data: meRow, error: meError } = await supabaseClient
      .from("household_members")
      .select("id, role, user_id, invitation_status, created_at, household_id")
      .eq("user_id", user.id)
      .maybeSingle();
    if (meError) {
      return json({ error: "Failed to load your membership: " + meError.message }, 500);
    }

    // 4. Load the household and every member row; every rule is recomputed
    // here from the database.
    let household: { id: string; user_id: string | null } | null = null;
    let members: MemberRow[] = [];
    let me: MemberRow | null = null;
    if (meRow) {
      const { data: householdRow, error: householdError } = await supabaseClient
        .from("households")
        .select("id, user_id")
        .eq("id", meRow.household_id)
        .maybeSingle();
      if (householdError) {
        return json({ error: "Failed to load household: " + householdError.message }, 500);
      }
      household = householdRow;

      if (household) {
        const { data: memberRows, error: membersError } = await supabaseClient
          .from("household_members")
          .select("id, role, user_id, invitation_status, created_at")
          .eq("household_id", household.id);
        if (membersError) {
          return json({ error: "Failed to load household members: " + membersError.message }, 500);
        }
        members = (memberRows ?? []) as MemberRow[];
        me = members.find((m) => m.id === meRow.id) ?? null;
      }
    }

    const mode = deleteAccountModeFor(members, me);

    // 5. Validate the handover before any write.
    let promoteMember: MemberRow | null = null;
    if (mode === "transfer" && me) {
      if (!newOwnerMemberId) {
        return json({ error: "Pick a new owner before you delete your account." }, 400);
      }
      const named = members.find((m) => String(m.id) === String(newOwnerMemberId));
      if (!named || named.id === me.id || named.role === "owner" || !isAccepted(named)) {
        return json({ error: "That person can't take over as owner." }, 400);
      }
      promoteMember = named;
    }

    // 6. Storage first. Storage paths come only from the verified auth id.
    const avatarError = await removeFolder(supabaseClient, "avatars", `avatars/${user.id}`);
    if (avatarError) {
      return json({ error: "Failed to remove your profile photo: " + avatarError }, 500);
    }
    const screenshotError = await removeFolder(supabaseClient, "bug-report-screenshots", `screenshots/${user.id}`);
    if (screenshotError) {
      return json({ error: "Failed to remove your report screenshots: " + screenshotError }, 500);
    }

    // 7. Household step, in order, so a failure part-way never leaves the
    // household without an owner.
    if (household && me) {
      if (mode === "transfer" && promoteMember) {
        const { error: promoteError } = await supabaseClient
          .from("household_members")
          .update({ role: "owner" })
          .eq("id", promoteMember.id)
          .eq("household_id", household.id);
        if (promoteError) {
          return json({ error: "Failed to make the new owner: " + promoteError.message }, 500);
        }
        if (household.user_id === user.id) {
          const { error: creatorError } = await supabaseClient
            .from("households")
            .update({ user_id: promoteMember.user_id })
            .eq("id", household.id);
          if (creatorError) {
            return json({ error: "Failed to hand over the household: " + creatorError.message }, 500);
          }
        }
      } else if (mode === "leave") {
        if (household.user_id === user.id) {
          // Oldest other accepted owner, or null when none remains (ADR 0005/0006).
          const oldest = members
            .filter((m) => m.id !== me!.id && isAcceptedOwner(m))
            .sort((a, b) => (a.created_at ?? "").localeCompare(b.created_at ?? ""))[0];
          const { error: creatorError } = await supabaseClient
            .from("households")
            .update({ user_id: oldest?.user_id ?? null })
            .eq("id", household.id);
          if (creatorError) {
            return json({ error: "Failed to hand over the household: " + creatorError.message }, 500);
          }
        }
      } else if (mode === "delete-household") {
        // notifications.household_id has no cascade, so clear them first.
        const { error: householdNotificationsError } = await supabaseClient
          .from("notifications")
          .delete()
          .eq("household_id", household.id);
        if (householdNotificationsError) {
          return json({ error: "Failed to clear household notifications: " + householdNotificationsError.message }, 500);
        }
        // Every other household table cascades off households.id.
        const { error: deleteHouseholdError } = await supabaseClient
          .from("households")
          .delete()
          .eq("id", household.id);
        if (deleteHouseholdError) {
          return json({ error: "Failed to delete household: " + deleteHouseholdError.message }, 500);
        }
      }
    }

    // 8. Personal rows by user id.
    for (const table of ["notifications", "notification_settings", "push_subscriptions", "user_preferences", "join_attempts"]) {
      const { error: rowsError } = await supabaseClient.from(table).delete().eq("user_id", user.id);
      if (rowsError) {
        return json({ error: `Failed to clear your ${table.replace(/_/g, " ")}: ` + rowsError.message }, 500);
      }
    }

    // 9. The login goes last, retried once. Its cascade removes the caller's
    // member row with their pay schedule, pay history, bill splits and
    // contributions; bills, expenses and goals they were assigned become
    // unassigned.
    let deleteUserError: unknown = null;
    for (let attempt = 0; attempt < 2; attempt++) {
      const { error } = await supabaseClient.auth.admin.deleteUser(user.id);
      deleteUserError = error;
      if (!error) break;
    }
    if (deleteUserError) {
      return json(
        { error: "Your data was removed but we couldn't finish deleting your login. Please try again." },
        500,
      );
    }

    return json({ success: true });
  } catch (err: any) {
    return json({ error: err.message }, 500);
  }
});
