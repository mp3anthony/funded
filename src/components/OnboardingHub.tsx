"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check } from "lucide-react";
import { useApp } from "@/context/AppContext";
import Button from "@/components/ui/Button";
import Row from "@/components/ui/Row";
import AddPayFlow from "./AddPayFlow";
import AddFlow from "./AddFlow";
import AddGoalFlow from "./AddGoalFlow";
import { HUB_ROWS, emptyHubDone, markDone, rowDone, type HubRowKey } from "@/lib/onboarding";

/**
 * The Setup hub (R32, #419): the optional last onboarding screen, shown once
 * the household exists. Three rows open the normal add flows over it and tick
 * when something is saved. "Enter app" is always available; anything unticked
 * is picked up later by the Finish setting up card.
 */
export default function OnboardingHub() {
  const { completeOnboarding } = useApp();
  const router = useRouter();
  const [done, setDone] = useState(emptyHubDone);
  const [open, setOpen] = useState<HubRowKey | null>(null);

  function tick(key: HubRowKey) {
    setDone((d) => markDone(d, key));
  }

  function openGuide() {
    completeOnboarding();
    router.push("/getting-started");
  }

  return (
    <>
      <div className="fixed inset-0 z-[100] flex flex-col overflow-y-auto bg-background">
        <div
          className="mx-auto flex w-full max-w-lg flex-1 flex-col gap-8 px-5"
          style={{
            paddingTop: "max(3.5rem, env(safe-area-inset-top))",
            paddingBottom: "max(1.5rem, env(safe-area-inset-bottom))",
          }}
        >
          <div className="flex flex-col gap-2">
            <h1 className="font-heading text-[28px] font-extrabold leading-tight tracking-tight text-foreground sm:text-[32px]">
              Set up the basics
            </h1>
            <p className="text-sm text-muted">Optional. You can do any of this later.</p>
          </div>

          <div className="flex flex-col">
            {HUB_ROWS.map((row, i) => {
              const ticked = rowDone(done, row.key);
              return (
                <Row
                  key={row.key}
                  label={row.label}
                  tall
                  divider={i > 0}
                  chevron={!ticked}
                  onClick={() => setOpen(row.key)}
                >
                  {ticked ? (
                    <span
                      className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/15 text-primary-ink"
                      role="img"
                      aria-label="Added"
                    >
                      <Check size={16} aria-hidden="true" />
                    </span>
                  ) : null}
                </Row>
              );
            })}
          </div>

          <div className="mt-auto flex flex-col items-center gap-3">
            <Button fullWidth onClick={completeOnboarding}>
              Enter app
            </Button>
            <button
              type="button"
              onClick={openGuide}
              className="min-h-11 px-4 text-sm text-muted underline cursor-pointer"
            >
              Getting started guide
            </button>
          </div>
        </div>
      </div>

      <AddPayFlow open={open === "pay"} onClose={() => setOpen(null)} onAdded={() => tick("pay")} />
      <AddFlow
        open={open === "bill"}
        onClose={() => setOpen(null)}
        onAdded={() => tick("bill")}
        prefill={{ type: "bill" }}
      />
      <AddGoalFlow open={open === "goal"} onClose={() => setOpen(null)} onAdded={() => tick("goal")} />
    </>
  );
}
