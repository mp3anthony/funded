import React from "react";
import { cn } from "@/lib/utils";
import { fieldClasses } from "./fieldClasses";

export default function Textarea({
  className,
  ref,
  ...props
}: React.TextareaHTMLAttributes<HTMLTextAreaElement> & { ref?: React.Ref<HTMLTextAreaElement> }) {
  return (
    <textarea ref={ref} className={cn(fieldClasses, "min-h-24 py-3 resize-y", className)} {...props} />
  );
}
