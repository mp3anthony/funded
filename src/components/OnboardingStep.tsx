import type { ReactNode } from "react";
import { DialogSection } from "@/components/ui/Dialog";

interface OnboardingStepProps {
  title: string;
  intro: string;
  /** Optional muted "why we ask" box under the intro. */
  why?: ReactNode;
  /** Optional save error, shown above the fields. */
  error?: string | null;
  children: ReactNode;
}

/**
 * Shared body for onboarding steps 1 to 5 (#248): title, one-line intro, an
 * optional "why" box, an optional error, then the step's own fields. Step 6
 * (Setup Complete) keeps its own centred layout inside the same card frame.
 */
export default function OnboardingStep({ title, intro, why, error, children }: OnboardingStepProps) {
  return (
    <div className="flex-1 flex flex-col justify-center space-y-5">
      <div className="space-y-2">
        <DialogSection label={title} />
        <p className="text-xs text-muted font-mono">{intro}</p>
      </div>
      {why && (
        <div className="bg-surface-raised border border-border rounded-[2px] p-3 text-xs text-muted space-y-2">
          {why}
        </div>
      )}
      {error && (
        <div className="bg-destructive/10 border border-destructive/50 rounded-[2px] p-3 text-destructive text-xs font-mono break-words whitespace-pre-wrap">
          <span className="font-bold">Failed to save:</span>
          <br />
          {error}
        </div>
      )}
      {children}
    </div>
  );
}
