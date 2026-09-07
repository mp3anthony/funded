"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Lock, Loader2, AlertCircle, Check, Eye, EyeOff } from "lucide-react";
import Logo from "@/components/Logo";

function getParam(name: string, search: URLSearchParams, hash: URLSearchParams) {
  return search.get(name) || hash.get(name);
}

export default function UpdatePasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  // The recovery link establishes a session on this page via Supabase's
  // detectSessionInUrl. Wait for that session before enabling the form so a
  // fast submit can't fire updateUser() before we're authenticated. If no
  // session ever appears, the link was invalid/expired.
  const [linkState, setLinkState] = useState<"checking" | "ready" | "invalid">("checking");
  const succeededRef = useRef(false);

  useEffect(() => {
    let settled = false;
    const markReady = () => {
      if (settled) return;
      settled = true;
      setLinkState("ready");
    };
    const markInvalid = () => {
      if (settled) return;
      settled = true;
      setLinkState("invalid");
      supabase.auth.signOut();
    };

    const searchParams = new URLSearchParams(window.location.search.replace(/^\?/, ""));
    const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ""));
    const error =
      getParam("error", searchParams, hashParams) ||
      getParam("error_code", searchParams, hashParams) ||
      getParam("error_description", searchParams, hashParams);

    if (error) {
      markInvalid();
      return;
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) markReady();
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) markReady();
    });

    // Give Supabase a moment to consume the recovery hash before deciding the
    // link is bad.
    const timeout = setTimeout(() => {
      markInvalid();
    }, 5000);

    return () => {
      subscription.unsubscribe();
      clearTimeout(timeout);
      // Leaving without a successful password change shouldn't leave a
      // recovery session behind.
      if (!succeededRef.current) supabase.auth.signOut();
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password || !confirmPassword) return;

    if (password !== confirmPassword) {
      setErrorMsg("Passwords do not match");
      return;
    }

    if (password.length < 6) {
      setErrorMsg("Password must be at least 6 characters long");
      return;
    }

    setLoading(true);
    setErrorMsg("");
    setSuccessMsg("");

    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;

      setSuccessMsg("Password updated successfully! Redirecting to sign in...");
      succeededRef.current = true;
      await supabase.auth.signOut();
      setTimeout(() => {
        router.replace("/login?message=password_reset_success");
      }, 2000);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "An error occurred";
      setErrorMsg(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 w-full flex items-center justify-center p-4 min-h-screen bg-background">
      <div className="w-full max-w-md bg-surface border border-border rounded-3xl p-6 sm:p-8 shadow-2xl animate-in fade-in slide-in-from-bottom-2 duration-(--duration-base) ease-(--ease-standard)">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-6">
            <Logo size="large" showWordmark={true} />
          </div>
          <h1 className="font-heading text-2xl font-extrabold text-foreground tracking-tight">
            Update your password
          </h1>
          <p className="text-sm text-muted mt-2">
            Enter your new password below to secure your account.
          </p>
        </div>

        {linkState === "checking" && (
          <div className="flex flex-col items-center gap-3 py-6 animate-in fade-in duration-(--duration-base) ease-(--ease-standard)">
            <Loader2 className="h-6 w-6 animate-spin text-secondary" />
            <p className="text-sm text-muted">Verifying your reset link...</p>
          </div>
        )}

        {linkState === "invalid" && (
          <div className="space-y-6 animate-in fade-in duration-(--duration-base) ease-(--ease-standard)">
            <div className="p-4 rounded-xl bg-destructive/10 text-destructive text-sm font-medium flex items-center gap-3">
              <AlertCircle className="h-5 w-5 shrink-0" />
              <p>This reset link is invalid or has expired. Please request a new one.</p>
            </div>
            <button
              type="button"
              onClick={() => router.replace("/login")}
              className="w-full py-3.5 rounded-xl bg-secondary text-secondary-fg text-sm font-bold shadow-lg shadow-secondary/20 hover:brightness-110 active:scale-[0.98] transition-all cursor-pointer"
            >
              Back to Sign In
            </button>
          </div>
        )}

        {linkState === "ready" && errorMsg && (
          <div className="mb-6 p-4 rounded-xl bg-destructive/10 text-destructive text-sm font-medium flex items-center gap-3 animate-in fade-in slide-in-from-top-1 duration-(--duration-base) ease-(--ease-standard)">
            <AlertCircle className="h-5 w-5 shrink-0" />
            <p>{errorMsg}</p>
          </div>
        )}

        {linkState === "ready" && successMsg && (
          <div className="mb-6 p-4 rounded-xl bg-primary/10 border border-primary/20 text-primary text-sm font-semibold flex items-center gap-3 animate-in fade-in slide-in-from-top-1 duration-(--duration-base) ease-(--ease-standard)">
            <Check className="h-5 w-5 shrink-0" />
            <p>{successMsg}</p>
          </div>
        )}

        {linkState === "ready" && (
        <form onSubmit={handleSubmit} className="space-y-5 animate-in fade-in duration-(--duration-base) ease-(--ease-standard)">
          <div className="space-y-2">
            <label className="block text-xs font-bold tracking-wider uppercase text-muted">
              New Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted pointer-events-none" />
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="w-full pl-10 pr-12 py-3 rounded-xl bg-surface-raised border border-border text-foreground text-sm font-medium focus:ring-2 focus:ring-secondary/40 focus:border-secondary outline-none transition-all"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-muted hover:text-foreground active:scale-95 transition-[color,transform] duration-(--duration-fast) ease-(--ease-standard) cursor-pointer"
                tabIndex={-1}
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <label className="block text-xs font-bold tracking-wider uppercase text-muted">
              Confirm New Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted pointer-events-none" />
              <input
                type={showConfirmPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="w-full pl-10 pr-12 py-3 rounded-xl bg-surface-raised border border-border text-foreground text-sm font-medium focus:ring-2 focus:ring-secondary/40 focus:border-secondary outline-none transition-all"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-muted hover:text-foreground active:scale-95 transition-[color,transform] duration-(--duration-fast) ease-(--ease-standard) cursor-pointer"
                tabIndex={-1}
              >
                {showConfirmPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl bg-secondary text-secondary-fg text-sm font-bold shadow-lg shadow-secondary/20 hover:brightness-110 active:scale-[0.98] transition-all disabled:opacity-50 disabled:pointer-events-none mt-2 cursor-pointer"
          >
            {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : null}
            Update Password
          </button>
        </form>
        )}
      </div>
    </div>
  );
}
