"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Loader2 } from "lucide-react";
import AuthScreen, { AuthNotice, PasswordField } from "@/components/AuthScreen";
import Button from "@/components/ui/Button";
import Field from "@/components/ui/Field";
import Input from "@/components/ui/Input";

type Mode = "signin" | "signup" | "forgot";

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // Check URL query parameters for validation errors
  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const error = params.get("error");
      const message = params.get("message");
      if (error === "link_expired") {
        Promise.resolve().then(() => {
          setErrorMsg("This link has expired or has already been used. Please request a new one.");
        });
      } else if (error === "link_failed" || error === "confirmation_failed") {
        Promise.resolve().then(() => {
          setErrorMsg("Something went wrong opening that link. Please request a new one and try again.");
        });
      } else if (message === "password_reset_success") {
        Promise.resolve().then(() => {
          setSuccessMsg("Your password has been updated. Please sign in with your new password.");
        });
      }
    }
  }, []);

  const switchMode = (next: Mode) => {
    setMode(next);
    setErrorMsg("");
    setSuccessMsg("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    if (mode !== "forgot" && !password) return;

    setLoading(true);
    setErrorMsg("");
    setSuccessMsg("");

    try {
      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/auth/callback`,
          },
        });

        if (error) throw error;

        // If email confirmation is required, session will be null
        if (data.user && !data.session) {
          setSuccessMsg("Please check your email to confirm your account before logging in.");
          setMode("signin");
          setEmail("");
          setPassword("");
        } else {
          router.replace("/");
        }
      } else if (mode === "signin") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        router.replace("/");
      } else if (mode === "forgot") {
        // Send recovery links straight to the update-password page rather than
        // routing through /auth/callback. Supabase auto-consumes the recovery
        // token the instant the client loads and fires its one-time
        // PASSWORD_RECOVERY event before React can subscribe, so a callback page
        // that relies on catching that event loses the race and treats recovery
        // like a normal sign-in. Landing directly on the form avoids the race.
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/reset-password/update`,
        });
        if (error) throw error;
        setSuccessMsg("Recovery link sent! Check your email to reset your password.");
        setMode("signin");
        setEmail("");
      }
    } catch (err: any) {
      const isRateLimit =
        err?.status === 429 ||
        err?.message?.toLowerCase().includes("rate limit") ||
        err?.message?.toLowerCase().includes("too many requests");

      if (isRateLimit) {
        setErrorMsg("You've reached the testing rate limit (2 emails per hour). Please wait an hour before trying again.");
      } else {
        const message = err instanceof Error ? err.message : "An error occurred";
        setErrorMsg(message);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthScreen
      title={
        mode === "signup" ? "Create an account" : mode === "forgot" ? "Reset password" : "Welcome back"
      }
      subtitle={
        mode === "signup"
          ? "Sign up to start managing your funds"
          : mode === "forgot"
          ? "Enter your email address to recover your account"
          : "Sign in to your account to continue"
      }
    >
      {errorMsg && <AuthNotice tone="error" className="mb-5">{errorMsg}</AuthNotice>}
      {successMsg && <AuthNotice tone="success" className="mb-5">{successMsg}</AuthNotice>}

      <form onSubmit={handleSubmit} className="space-y-5">
        <Field id="login-email" label="Email Address">
          <Input
            id="login-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="name@example.com"
            autoComplete="email"
            required
          />
        </Field>

        {mode !== "forgot" && (
          <PasswordField
            id="login-password"
            label="Password"
            value={password}
            onChange={setPassword}
            autoComplete={mode === "signup" ? "new-password" : "current-password"}
            labelAside={
              mode === "signin" ? (
                <button
                  type="button"
                  onClick={() => switchMode("forgot")}
                  className="min-h-11 px-1 text-sm font-semibold text-primary cursor-pointer"
                >
                  Forgot password?
                </button>
              ) : undefined
            }
          />
        )}

        <Button type="submit" fullWidth disabled={loading}>
          {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : null}
          {mode === "signup" ? "Sign Up" : mode === "forgot" ? "Send Reset Link" : "Sign In"}
        </Button>
      </form>

      <div className="mt-5 text-center">
        {mode === "forgot" ? (
          <Button variant="ghost" className="px-4" onClick={() => switchMode("signin")}>
            Back to Sign In
          </Button>
        ) : (
          <Button variant="ghost" className="px-4" onClick={() => switchMode(mode === "signin" ? "signup" : "signin")}>
            {mode === "signin" ? "Need an account? Sign Up" : "Already have an account? Sign In"}
          </Button>
        )}
      </div>
    </AuthScreen>
  );
}
