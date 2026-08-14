import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // 1. Initialize Supabase client with Service Role Key. This is required to
    // clear other members' notification rows (their RLS only allows deleting
    // their own) and to delete the household row itself.
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    // 2. Authenticate the requesting user via Authorization token
    const authHeader = req.headers.get("Authorization")!;
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token);

    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 3. Parse input body
    const { householdId } = await req.json();
    if (!householdId) {
      return new Response(JSON.stringify({ error: "Missing householdId" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 4. Verify the caller is actually the owner of this household. Never trust
    // a client-supplied "I'm the owner" flag — re-derive it server-side via the
    // same security-definer function the households DELETE RLS policy uses.
    const { data: isOwner, error: ownerError } = await supabaseClient.rpc(
      "is_household_owner",
      { household_uuid: householdId, user_uuid: user.id },
    );

    if (ownerError) {
      return new Response(JSON.stringify({ error: "Failed to verify household ownership: " + ownerError.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!isOwner) {
      return new Response(JSON.stringify({ error: "Only the household owner can delete the household" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 5. Delete every notification row for this household, across all members —
    // notifications.household_id has no cascade and its RLS only allows a user
    // to delete their own rows, so this would otherwise foreign-key-violate the
    // household delete below the moment any member has a notification.
    const { error: notificationsError } = await supabaseClient
      .from("notifications")
      .delete()
      .eq("household_id", householdId);

    if (notificationsError) {
      return new Response(JSON.stringify({ error: "Failed to clear household notifications: " + notificationsError.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 6. Delete the household itself. Every remaining table (bills, funds,
    // paydays, household_members, pay_schedules, pay_history,
    // contribution_rules, household_contributions, bill_splits) cascades off
    // households.id, so this cleans up the rest automatically.
    const { error: deleteError } = await supabaseClient
      .from("households")
      .delete()
      .eq("id", householdId);

    if (deleteError) {
      return new Response(JSON.stringify({ error: "Failed to delete household: " + deleteError.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
