"use client";

import { useApp } from "@/context/AppContext";
import { missingSetupItems, shouldShowFinishSetup, type SetupItem } from "@/lib/finishSetup";

export type FinishSetupState = "card" | "loading" | "none";

/**
 * Where the Dashboard's Finish setting up card stands (#333, R26). `loading` = an owner with
 * items missing whose dismissed flag has not loaded yet: the Dashboard slot shows nothing
 * then, so stats never flash before the card.
 */
export function useFinishSetup(): { state: FinishSetupState; missing: SetupItem[] } {
  const { bills, funds, paySchedules, members, session, isFinishSetupDismissed } = useApp();

  // Owner check matches settings-client (email match against the member list).
  const currentMember = members.find(
    (m) => String(m.email).toLowerCase() === String(session?.user?.email).toLowerCase()
  );
  const isOwner = currentMember?.role === "owner";
  const missing = missingSetupItems({
    payScheduleCount: paySchedules.length,
    billCount: bills.length,
    // F04: any goal counts, Just tracking (Wish list) included, so the card never asks for
    // a "first goal" from a household that already has one.
    goalCount: funds.length,
  });

  if (shouldShowFinishSetup({ isOwner, dismissed: isFinishSetupDismissed, missing })) {
    return { state: "card", missing };
  }
  // Members arrive after first paint: until they do, nobody can be ruled out as the owner.
  const membersPending = members.length === 0 && !!session?.user;
  if ((membersPending || isOwner) && missing.length > 0 && isFinishSetupDismissed === null) {
    return { state: "loading", missing };
  }
  return { state: "none", missing };
}
