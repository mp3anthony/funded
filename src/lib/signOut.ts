import { supabase } from "@/lib/supabase";

/**
 * Sign out, then leave with a full page navigation (not router.push) so every
 * piece of in-memory app state (React context, router cache, module variables)
 * is dropped before the next person signs in on this device.
 *
 * Offline-safe: if signOut errors or throws, a local-scope sign out clears the
 * stored session, and the navigation happens regardless.
 * Clears the in-progress report draft (the one sessionStorage entry holding
 * typed content rather than a preference).
 */
export async function signOutAndGoToLogin(path = "/login"): Promise<void> {
  let signedOut = false;
  try {
    const { error } = await supabase.auth.signOut();
    if (error) console.error("Sign out returned an error:", error);
    else signedOut = true;
  } catch (err) {
    console.error("Sign out failed:", err);
  }
  if (!signedOut) {
    // Clear the local session without a network call, then navigate regardless.
    try {
      const { error } = await supabase.auth.signOut({ scope: "local" });
      if (error) console.error("Local sign out returned an error:", error);
    } catch (err) {
      console.error("Local sign out failed:", err);
    }
  }
  try {
    sessionStorage.removeItem("bugReportDraft");
  } catch {
    // storage unavailable: nothing to clear
  }
  window.location.assign(path);
}
