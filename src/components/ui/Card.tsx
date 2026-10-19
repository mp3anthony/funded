import React from "react";
import { cn } from "@/lib/utils";

interface CardProps extends React.HTMLAttributes<HTMLElement> {
  /** When set, the card renders as a button with press tint. */
  onClick?: React.MouseEventHandler<HTMLElement>;
}

const surface = "rounded-card border border-border bg-surface";

/** Content card. Padding comes from the caller. Tappable cards tint, never scale. */
export default function Card({ onClick, className, children, ...props }: CardProps) {
  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className={cn(
          surface,
          "w-full text-left press-tint cursor-pointer touch-manipulation [-webkit-tap-highlight-color:transparent]",
          className
        )}
        {...(props as React.ButtonHTMLAttributes<HTMLButtonElement>)}
      >
        {children}
      </button>
    );
  }
  return (
    <div className={cn(surface, className)} {...props}>
      {children}
    </div>
  );
}
