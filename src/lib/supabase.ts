import { createClient } from "@supabase/supabase-js";
import { isRecoveryHash, markRecoveryLink } from "@/lib/recoveryLink";

let supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
if (!supabaseUrl || supabaseUrl === "undefined" || (!supabaseUrl.startsWith("http://") && !supabaseUrl.startsWith("https://"))) {
  supabaseUrl = "https://placeholder-please-set-env-vars.supabase.co";
}

let supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
if (!supabaseAnonKey || supabaseAnonKey === "undefined") {
  supabaseAnonKey = "placeholder-key";
}

const hasRealEnvVars = 
  process.env.NEXT_PUBLIC_SUPABASE_URL && 
  process.env.NEXT_PUBLIC_SUPABASE_URL !== "undefined" && 
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY && 
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY !== "undefined";

if (!hasRealEnvVars && typeof window !== "undefined") {
  console.error(
    "Missing or invalid Supabase environment variables: NEXT_PUBLIC_SUPABASE_URL and/or NEXT_PUBLIC_SUPABASE_ANON_KEY must be defined in your environment."
  );
}

// Stamp a password-recovery link BEFORE createClient: auth-js reads the hash
// during construction, fires PASSWORD_RECOVERY in a setTimeout(0) before any
// React effect can subscribe, and clears the hash after an awaited getUser.
// A synchronous read here always sees the hash; an effect may not (#490).
if (typeof window !== "undefined" && isRecoveryHash(window.location.hash)) {
  markRecoveryLink();
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    flowType: "implicit",
    detectSessionInUrl: true,
  },
});
