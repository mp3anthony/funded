"use client";

import { Home, KeyRound } from "lucide-react";
import Logo from "./Logo";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import { supabase } from "@/lib/supabase";

interface OnboardingWelcomeProps {
  onCreate: () => void;
  onJoin: () => void;
}

/**
 * Full-screen first screen for a new account (R31, #418): two big choices,
 * create a household or join one with a code. Sign out sits top right.
 */
export default function OnboardingWelcome({ onCreate, onJoin }: OnboardingWelcomeProps) {
  return (
    <div className="fixed inset-0 z-[100] flex flex-col overflow-y-auto bg-background">
      <div
        className="flex shrink-0 justify-end px-4"
        style={{ paddingTop: "max(1rem, env(safe-area-inset-top))" }}
      >
        <Button variant="ghost" className="px-4 text-sm" onClick={() => supabase.auth.signOut()}>
          Sign out
        </Button>
      </div>

      <div
        className="mx-auto flex w-full max-w-lg flex-1 flex-col justify-center gap-8 px-5 py-6"
        style={{ paddingBottom: "max(1.5rem, env(safe-area-inset-bottom))" }}
      >
        <div className="flex flex-col items-center gap-5 text-center">
          <Logo size="large" showWordmark={false} />
          <h1 className="font-heading text-[28px] font-extrabold leading-tight tracking-tight text-foreground sm:text-[32px]">
            Welcome to Funded
          </h1>
          <p className="max-w-xs text-sm text-muted">Choose how you want to get started.</p>
        </div>

        <div className="flex flex-col gap-3">
          <Card onClick={onCreate} className="flex items-center gap-4 p-5">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-surface-raised text-primary-ink">
              <Home size={20} aria-hidden="true" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-base font-semibold text-foreground">Create a household</span>
              <span className="mt-0.5 block text-xs text-muted">Start fresh with your own bills, pay and goals.</span>
            </span>
          </Card>
          <Card onClick={onJoin} className="flex items-center gap-4 p-5">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-surface-raised text-primary-ink">
              <KeyRound size={20} aria-hidden="true" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-base font-semibold text-foreground">Join with a code</span>
              <span className="mt-0.5 block text-xs text-muted">Someone already set one up? Enter their 6-character code.</span>
            </span>
          </Card>
        </div>
      </div>
    </div>
  );
}
