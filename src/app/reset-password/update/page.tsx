"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Loader2 } from "lucide-react";
import AuthScreen, { AuthNotice, PasswordField } from "@/components/AuthScreen";
import Button from "@/components/ui/Button";

function getParam(name: string, search: URLSearchParams, hash: URLSearchParams) {
  return search.get(name) || hash.get(name);
}

export default function UpdatePasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
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
    <AuthScreen
      title="Update your password"
      subtitle="Enter your new password below to secure your account."
    >
      {linkState === "checking" && (
        <div className="flex flex-col items-center gap-3 py-6 animate-in fade-in duration-(--duration-feedback) ease-(--ease-enter)">
          <Loader2 className="h-6 w-6 animate-spin text-primary-ink" />
          <p className="text-sm text-muted">Verifying your reset link...</p>
        </div>
      )}

      {linkState === "invalid" && (
        <div className="space-y-5 animate-in fade-in duration-(--duration-feedback) ease-(--ease-enter)">
          <AuthNotice tone="error">
            This reset link is invalid or has expired. Please request a new one.
          </AuthNotice>
          <Button fullWidth onClick={() => router.replace("/login")}>
            Back to Sign In
          </Button>
        </div>
      )}

      {linkState === "ready" && errorMsg && (
        <AuthNotice tone="error" className="mb-5">{errorMsg}</AuthNotice>
      )}

      {linkState === "ready" && successMsg && (
        <AuthNotice tone="success" className="mb-5">{successMsg}</AuthNotice>
      )}

      {linkState === "ready" && (
        <form onSubmit={handleSubmit} className="space-y-5 animate-in fade-in duration-(--duration-feedback) ease-(--ease-enter)">
          <PasswordField
            id="new-password"
            label="New Password"
            value={password}
            onChange={setPassword}
            autoComplete="new-password"
          />
          <PasswordField
            id="confirm-new-password"
            label="Confirm New Password"
            value={confirmPassword}
            onChange={setConfirmPassword}
            autoComplete="new-password"
          />
          <Button type="submit" fullWidth disabled={loading}>
            {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : null}
            Update Password
          </Button>
        </form>
      )}
    </AuthScreen>
  );
}
