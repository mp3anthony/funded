import React from "react";
import { cn } from "@/lib/utils";

interface IconCircleProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** Accessible name (icon-only control). */
  label: string;
}

/** 44px tap target around a 36px circle; fills lime while pressed. */
export default function IconCircle({
  label,
  type = "button",
  className,
  children,
  ...props
}: IconCircleProps) {
  return (
    <button
      type={type}
      {...props}
      aria-label={label}
      className={cn(
        "group press relative inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full cursor-pointer touch-manipulation [-webkit-tap-highlight-color:transparent] disabled:pointer-events-none disabled:opacity-50",
        className
      )}
    >
      <span className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-full border border-border-strong bg-surface-raised text-foreground group-active:border-primary group-active:bg-primary group-active:text-primary-fg">
        {children}
      </span>
    </button>
  );
}
