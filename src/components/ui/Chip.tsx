import React from "react";
import { cn } from "@/lib/utils";

interface ChipProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  selected?: boolean;
}

/** Filter/option pill. Selected = inset lime ring + bold label; lime fill is for pressed only. */
export default function Chip({
  selected = false,
  type = "button",
  className,
  ...props
}: ChipProps) {
  return (
    <button
      type={type}
      aria-pressed={selected}
      className={cn(
        "press relative inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full border px-4 text-[15px] cursor-pointer select-none touch-manipulation [-webkit-tap-highlight-color:transparent] before:absolute before:inset-x-0 before:-inset-y-1 before:content-[''] active:border-primary active:bg-primary active:text-primary-fg disabled:pointer-events-none disabled:opacity-50",
        selected
          ? "border-transparent bg-surface-raised ring-2 ring-inset ring-primary font-bold text-foreground"
          : "border-border-strong bg-surface-raised font-medium text-muted",
        className
      )}
      {...props}
    />
  );
}
