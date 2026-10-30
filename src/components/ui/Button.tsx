import React from "react";
import { cn } from "@/lib/utils";

export type ButtonVariant = "primary" | "ghost" | "destructive";

const base =
  "press inline-flex min-h-11 items-center justify-center gap-2 rounded-full border px-6 text-base font-semibold leading-tight cursor-pointer select-none touch-manipulation [-webkit-tap-highlight-color:transparent] disabled:pointer-events-none disabled:opacity-50 disabled:border-dashed disabled:border-border-strong disabled:bg-surface-raised disabled:text-muted";

const variants: Record<ButtonVariant, string> = {
  primary: "border-transparent bg-primary text-primary-fg active:bg-primary-pressed",
  ghost:
    "border-border-strong bg-surface-raised text-foreground active:border-primary active:bg-primary active:text-primary-fg",
  destructive:
    "border-transparent bg-destructive text-destructive-fg active:bg-destructive-pressed",
};

/** Class string for the pill button; use on a Link that must look like a Button. */
export function buttonClasses({
  variant = "primary",
  fullWidth = false,
}: { variant?: ButtonVariant; fullWidth?: boolean } = {}): string {
  return cn(base, variants[variant], fullWidth && "w-full");
}

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  /** Only for the main action of a form; buttons are content-sized by default. */
  fullWidth?: boolean;
}

export default function Button({
  variant = "primary",
  fullWidth = false,
  type = "button",
  className,
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={cn(buttonClasses({ variant, fullWidth }), className)}
      {...props}
    />
  );
}
