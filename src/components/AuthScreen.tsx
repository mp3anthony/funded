"use client";

import React from "react";
import { AlertCircle, Check, Eye, EyeOff } from "lucide-react";
import Logo from "./Logo";
import Input from "@/components/ui/Input";
import Card from "@/components/ui/Card";
import { cn } from "@/lib/utils";

interface AuthScreenProps {
  title: string;
  subtitle?: string;
  /** Icon shown instead of the logo (confirm email, offline). */
  icon?: React.ReactNode;
  /** Rendered inside the app shell (offline page): the shell already pads for the notch. */
  embedded?: boolean;
  children: React.ReactNode;
}

/**
 * Shared look for the screens before the app (R34, #421): login, reset
 * password, confirm email and offline. Logo, Syne title, one card.
 */
export default function AuthScreen({ title, subtitle, icon, embedded = false, children }: AuthScreenProps) {
  return (
    <div
      className={cn(
        "flex w-full flex-1 items-center justify-center px-4 py-8",
        !embedded && "min-h-dvh bg-background"
      )}
      style={
        embedded
          ? undefined
          : {
              paddingTop: "max(2rem, env(safe-area-inset-top))",
              paddingBottom: "max(2rem, env(safe-area-inset-bottom))",
            }
      }
    >
      <div className="w-full max-w-md animate-in fade-in slide-in-from-bottom-2 duration-(--duration-feedback) ease-(--ease-enter)">
        <div className="mb-8 flex flex-col items-center gap-5 text-center">
          {icon ?? <Logo size="large" showWordmark={true} />}
          <div className="space-y-2">
            <h1 className="font-heading text-[28px] font-extrabold leading-tight tracking-tight text-foreground">
              {title}
            </h1>
            {subtitle && <p className="mx-auto max-w-xs text-sm text-muted">{subtitle}</p>}
          </div>
        </div>
        <Card className="p-5 sm:p-6">{children}</Card>
      </div>
    </div>
  );
}

/** Round icon badge for AuthScreen's `icon` slot. */
export function AuthIcon({ children }: { children: React.ReactNode }) {
  return (
    <span className="flex h-16 w-16 items-center justify-center rounded-full bg-surface-raised text-primary-ink">
      {children}
    </span>
  );
}

/** Red or green message line above a form. */
export function AuthNotice({
  tone,
  children,
  className,
}: {
  tone: "error" | "success";
  children: React.ReactNode;
  className?: string;
}) {
  const Icon = tone === "error" ? AlertCircle : Check;
  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      className={cn(
        "flex items-center gap-3 rounded-input p-4 text-sm font-medium animate-in fade-in slide-in-from-top-1 duration-(--duration-feedback) ease-(--ease-enter)",
        tone === "error"
          ? "bg-destructive/10 text-destructive-ink"
          : "border border-primary/20 bg-primary/10 font-semibold text-primary-ink",
        className
      )}
    >
      <Icon className="h-5 w-5 shrink-0" aria-hidden="true" />
      <p>{children}</p>
    </div>
  );
}

/** Password field with a show/hide eye. */
export function PasswordField({
  id,
  label,
  value,
  onChange,
  labelAside,
  autoComplete,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  /** Right-aligned content on the label row, e.g. "Forgot password?". */
  labelAside?: React.ReactNode;
  autoComplete?: string;
}) {
  const [show, setShow] = React.useState(false);
  return (
    <div className="space-y-2">
      {labelAside ? (
        <div className="flex items-center justify-between">
          <label htmlFor={id} className="text-[15px] font-semibold text-foreground">
            {label}
          </label>
          {labelAside}
        </div>
      ) : (
        <label htmlFor={id} className="block text-[15px] font-semibold text-foreground">
          {label}
        </label>
      )}
      <div className="relative">
        <Input
          id={id}
          type={show ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="••••••••"
          autoComplete={autoComplete}
          required
          className="pr-12"
        />
        <button
          type="button"
          onClick={() => setShow(!show)}
          aria-label={show ? "Hide password" : "Show password"}
          className="absolute right-1 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center text-muted active:text-foreground cursor-pointer"
        >
          {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
    </div>
  );
}
