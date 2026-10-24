"use client";

import React from "react";
import { Mail, ArrowLeft, Loader2 } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import AuthScreen, { AuthIcon } from "@/components/AuthScreen";
import Button from "@/components/ui/Button";

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
    <AuthScreen
      title="Confirm Your Email"
      icon={
        <AuthIcon>
          <Mail className="h-8 w-8" aria-hidden="true" />
        </AuthIcon>
      }
    >
      <div className="space-y-5 text-center">
        <p className="text-sm leading-relaxed text-foreground">
          We sent a verification link to <strong>{userEmail}</strong>. Please check your inbox and confirm your account.
        </p>
        <p className="rounded-input border border-border-strong bg-surface-raised p-4 text-xs leading-relaxed text-muted">
          Once confirmed, you will be redirected automatically to the household dashboard. If you don&apos;t receive it, please check your spam folder.
        </p>
        <Button variant="ghost" onClick={handleBackToLogin} disabled={loading}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowLeft className="h-4 w-4" />}
          Back to Sign In
        </Button>
      </div>
    </AuthScreen>
  );
}
