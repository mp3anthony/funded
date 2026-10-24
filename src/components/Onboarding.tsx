"use client";

import { useRef, useState } from "react";
import { useApp } from "@/context/AppContext";
import JoinHouseholdSheet from "./JoinHouseholdSheet";
import OnboardingWelcome from "./OnboardingWelcome";
import OnboardingCreateFlow from "./OnboardingCreateFlow";
import OnboardingHub from "./OnboardingHub";

export default function Onboarding() {
  const { createHousehold } = useApp();

  // Welcome and the create flow come first; the Setup hub (R32) only shows
  // once the household exists.
  const [phase, setPhase] = useState<"welcome" | "create" | "hub">("welcome");
  const [isJoinSheetOpen, setIsJoinSheetOpen] = useState(false);
  // True once createHousehold succeeded. Guards against calling it a second
  // time: re-creating would take createHousehold's adopt-existing path, which
  // flips isOnboarded and unmounts the wizard mid-flow.
  const householdCreatedRef = useRef(false);

  async function createFromFlow(name: string, jointFund: boolean) {
    if (householdCreatedRef.current) return;
    await createHousehold(name, jointFund);
    householdCreatedRef.current = true;
  }

  if (phase === "welcome") {
    return (
      <>
        <OnboardingWelcome onCreate={() => setPhase("create")} onJoin={() => setIsJoinSheetOpen(true)} />
        <JoinHouseholdSheet isOpen={isJoinSheetOpen} onClose={() => setIsJoinSheetOpen(false)} />
      </>
    );
  }

  if (phase === "create") {
    return (
      <OnboardingCreateFlow
        onCreate={createFromFlow}
        onDone={() => setPhase("hub")}
        onExit={() => setPhase("welcome")}
      />
    );
  }

  return <OnboardingHub />;
}
