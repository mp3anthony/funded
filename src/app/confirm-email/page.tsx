"use client";

import React from "react";
import { Mail, ArrowLeft, Loader2 } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";

export default function ConfirmEmailPage() {
  const { session } = useApp();
  const router = useRouter();
  const [loading, setLoading] = React.useState(false);

  const handleBackToLogin = async () => {
    setLoading(true);
    try {
      await supabase.auth.signOut();
      router.push("/login");
    } catch (err) {
      console.error("Sign out failed:", err);
      router.push("/login");
    } finally {
      setLoading(false);
    }
  };

  const userEmail = session?.user?.email || "your email address";

  return (
    <div className="flex-1 w-full flex items-center justify-center p-4 min-h-[80vh]">
      <div className="w-full max-w-md bg-surface border border-border rounded-3xl p-6 sm:p-8 shadow-2xl text-center space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-(--duration-base) ease-(--ease-standard)">
        <div className="h-16 w-16 bg-primary/10 text-primary rounded-2xl flex items-center justify-center mx-auto shadow-lg shadow-[#c8ff00]/5 animate-pulse">
          <Mail className="h-8 w-8" />
        </div>

        <div className="space-y-2">
          <h1 className="font-heading font-extrabold text-2xl tracking-tight text-foreground">
            Confirm Your Email
          </h1>
          <p className="text-sm text-foreground leading-relaxed font-body max-w-xs mx-auto">
            We sent a verification link to <strong className="text-foreground">{userEmail}</strong>. Please check your inbox and confirm your account.
          </p>
        </div>

        <div className="p-4 rounded-xl bg-foreground/5 border border-border-strong text-[11px] text-subtle font-mono leading-relaxed max-w-xs mx-auto">
          Once confirmed, you will be redirected automatically to the household dashboard. If you don't receive it, please check your spam folder.
        </div>

        <button
          onClick={handleBackToLogin}
          disabled={loading}
          className="w-full max-w-xs mx-auto flex items-center justify-center gap-2 py-3 rounded-xl border border-border text-sm font-bold text-muted hover:text-foreground hover:bg-white/5 active:scale-[0.98] transition-all duration-(--duration-base) ease-(--ease-standard) cursor-pointer disabled:opacity-50"
        >
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <ArrowLeft className="h-4 w-4" />
          )}
          Back to Sign In
        </button>
      </div>
    </div>
  );
}
