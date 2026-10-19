import React from "react";
import { cn } from "@/lib/utils";
import { fieldClasses } from "./fieldClasses";

export default function Input({
  className,
  ref,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & { ref?: React.Ref<HTMLInputElement> }) {
  return <input ref={ref} className={cn(fieldClasses, className)} {...props} />;
}
