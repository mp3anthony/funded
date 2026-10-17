import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Accepted = signed up and not pending. Owner = role "owner" AND accepted.
// Same definitions as src/lib/householdLeave.ts (Deno cannot import from src);
// keep the two in step.
type MemberRow = {
  id: string;
  role: string | null;
  user_id: string | null;
  invitation_status: string | null;
  created_at: string | null;
};
const isAccepted = (m: MemberRow) => !!m.user_id && (m.invitation_status ?? "accepted") !== "pending";
const isAcceptedOwner = (m: MemberRow) => m.role === "owner" && isAccepted(m);

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // 1. Service Role client. Needed to move households.user_id (the creator
    // column RLS trusts; a DB trigger blocks app users from changing it) and
    // to set another member's role. Service-role writes have auth.uid() NULL,
    // so the last-owner triggers do not apply; this function enforces the
    // same rules itself below.
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    // 2. Authenticate the requesting user via Authorization token
    const authHeader = req.headers.get("Authorization")!;
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token);

    if (userError || !user) {
      return json({ error: "Unauthorized" }, 401);
    }

    // 3. Parse input body
    const { householdId, newOwnerMemberId } = await req.json();
    if (!householdId) {
      return json({ error: "Missing householdId" }, 400);
    }

    // 4. Load the household and every member row; every rule is recomputed
    // here from the database, never from what the client thinks it saw.
    const { data: household, error: householdError } = await supabaseClient
      .from("households")
      .select("id, user_id")
      .eq("id", householdId)
      .maybeSingle();
    if (householdError) {
      return json({ error: "Failed to load household: " + householdError.message }, 500);
    }
    if (!household) {
      return json({ error: "This household no longer exists." }, 404);
    }

    const { data: memberRows, error: membersError } = await supabaseClient
      .from("household_members")
      .select("id, role, user_id, invitation_status, created_at")
      .eq("household_id", householdId);
    if (membersError) {
      return json({ error: "Failed to load household members: " + membersError.message }, 500);
    }
    const members = (memberRows ?? []) as MemberRow[];

    // 5. The caller must be an accepted member of THIS household; act on
    // their row by id from here on.
    const me = members.find((m) => m.user_id === user.id && isAccepted(m));
    if (!me) {
      return json({ error: "You are not a member of this household." }, 403);
    }

    const otherOwners = members.filter((m) => m.id !== me.id && isAcceptedOwner(m));
    const eligible = members.filter((m) => m.id !== me.id && m.role !== "owner" && isAccepted(m));

    // 6. Apply the rules. Only owner with accepted members must hand over
    // ownership; a sole member (or only pending members) can only delete.
    let promoteId: string | null = null;
    if (me.role === "owner" && otherOwners.length === 0) {
      if (eligible.length === 0) {
        return json({ error: "You are the only member here. Delete the household instead." }, 400);
      }
      if (!newOwnerMemberId) {
        return json({ error: "Pick a new owner before you leave." }, 400);
      }
      const named = members.find((m) => String(m.id) === String(newOwnerMemberId));
      if (!named || !isAccepted(named) || named.id === me.id) {
        return json({ error: "That person can't take over as owner." }, 400);
      }
      if (named.role !== "owner") promoteId = named.id;
    }
    // Any other case is a plain leave: a newOwnerMemberId is ignored.

    // 7. Work out who the household's creator column (households.user_id)
    // should point at if the leaver is the creator. Never leave it null.
    let nextCreatorUserId: string | null = null;
    if (household.user_id === user.id) {
      if (promoteId) {
        nextCreatorUserId = members.find((m) => m.id === promoteId)?.user_id ?? null;
      } else {
        const oldest = [...otherOwners].sort((a, b) => (a.created_at ?? "").localeCompare(b.created_at ?? ""))[0];
        nextCreatorUserId = oldest?.user_id ?? null;
      }
      if (!nextCreatorUserId) {
        return json({ error: "There is no other owner to hand this household to. Delete the household instead." }, 400);
      }
    }

    // 8. Hand over, in order, so a failure part-way never leaves the household
    // without an owner.
    if (promoteId) {
      const { error: promoteError } = await supabaseClient
        .from("household_members")
        .update({ role: "owner" })
        .eq("id", promoteId)
        .eq("household_id", householdId);
      if (promoteError) {
        return json({ error: "Failed to make the new owner: " + promoteError.message }, 500);
      }
    }

    if (nextCreatorUserId) {
      const { error: creatorError } = await supabaseClient
        .from("households")
        .update({ user_id: nextCreatorUserId })
        .eq("id", householdId);
      if (creatorError) {
        return json({ error: "Failed to hand over the household: " + creatorError.message }, 500);
      }
    }

    // notifications.household_id has no cascade, so clear the leaver's own
    // rows for this household before their member row goes.
    const { error: notificationsError } = await supabaseClient
      .from("notifications")
      .delete()
      .eq("household_id", householdId)
      .eq("user_id", user.id);
    if (notificationsError) {
      return json({ error: "Failed to clear your notifications: " + notificationsError.message }, 500);
    }

    // Their pay schedule, pay history, bill splits and contributions cascade
    // off this row; bills, expenses and goals they owned become unassigned.
    const { error: deleteError } = await supabaseClient
      .from("household_members")
      .delete()
      .eq("id", me.id)
      .eq("household_id", householdId);
    if (deleteError) {
      return json({ error: "Failed to leave household: " + deleteError.message }, 500);
    }

    return json({ success: true });
  } catch (err: any) {
    return json({ error: err.message }, 500);
  }
});
