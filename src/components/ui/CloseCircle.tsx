import React from "react";
import { X } from "lucide-react";
import IconCircle from "./IconCircle";

type CloseCircleProps = Omit<React.ComponentProps<typeof IconCircle>, "label" | "children">;

export default function CloseCircle(props: CloseCircleProps) {
  return (
    <IconCircle label="Close" {...props}>
      <X size={18} aria-hidden="true" />
    </IconCircle>
  );
}
