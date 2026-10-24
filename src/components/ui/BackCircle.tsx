import React from "react";
import { ChevronLeft } from "lucide-react";
import IconCircle from "./IconCircle";

type BackCircleProps = Omit<React.ComponentProps<typeof IconCircle>, "label" | "children">;

export default function BackCircle(props: BackCircleProps) {
  return (
    <IconCircle label="Back" {...props}>
      <ChevronLeft size={18} aria-hidden="true" />
    </IconCircle>
  );
}
