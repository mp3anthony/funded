import React from "react";
import { choiceDescription } from "@/lib/stepFlow";
import Field from "./Field";
import Select from "./Select";

export interface ChoiceOption {
  value: string;
  label: string;
  /** Explains the option; shown under the dropdown while it is picked. */
  description?: string;
}

interface ChoiceFieldProps {
  /** Id of the dropdown; the explanation is `${id}-desc`. */
  id: string;
  question: React.ReactNode;
  options: ChoiceOption[];
  value: string;
  onChange: (value: string) => void;
  /**
   * Adds a disabled empty first option with this text. The step is then only
   * valid once `value !== ""` (the consumer sets the step's `valid`).
   */
  placeholder?: string;
}

/**
 * One-question card with a native dropdown (iOS picker) that explains the
 * picked option underneath (R06, #393).
 */
export default function ChoiceField({
  id,
  question,
  options,
  value,
  onChange,
  placeholder,
}: ChoiceFieldProps) {
  const description = choiceDescription(options, value);
  return (
    <Field id={id} label={question} question description={description}>
      <Select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-describedby={description ? `${id}-desc` : undefined}
      >
        {placeholder !== undefined && (
          <option value="" disabled>
            {placeholder}
          </option>
        )}
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </Select>
    </Field>
  );
}
