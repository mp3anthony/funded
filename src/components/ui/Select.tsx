import React from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { fieldClasses } from "./fieldClasses";

export default function Select({
  className,
  children,
  ref,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement> & { ref?: React.Ref<HTMLSelectElement> }) {
  return (
    <div className="relative">
      <select ref={ref} className={cn(fieldClasses, "appearance-none pr-10", className)} {...props}>
        {children}
      </select>
      <ChevronDown
        size={18}
        aria-hidden="true"
        className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted"
      />
    </div>
  );
}
