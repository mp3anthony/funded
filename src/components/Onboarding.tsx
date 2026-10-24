"use client";

import { useRef, useState } from "react";
import { useApp } from "@/context/AppContext";
import OnboardingWelcome from "./OnboardingWelcome";
import OnboardingCreateFlow from "./OnboardingCreateFlow";
import OnboardingJoinFlow from "./OnboardingJoinFlow";
import OnboardingHub from "./OnboardingHub";

export default function Onboarding() {
  const { createHousehold, joinHousehold } = useApp();

  // Welcome and the create flow come first; the Setup hub (R32) only shows
  // once the household exists.
  const [phase, setPhase] = useState<"welcome" | "create" | "join" | "hub">("welcome");
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
    return <OnboardingWelcome onCreate={() => setPhase("create")} onJoin={() => setPhase("join")} />;
  }

  if (phase === "join") {
    return <OnboardingJoinFlow onJoin={joinHousehold} onExit={() => setPhase("welcome")} />;
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
