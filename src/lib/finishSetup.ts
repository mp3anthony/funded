/**
 * Pure helpers for the Dashboard "Finish setting up" card (#333). Import-free
 * so node:test can run them directly (see finishSetup.test.mjs).
 */

export type SetupItem = "payday" | "bill" | "goal";

/** Which of payday, bill and goal the household still has none of, in card order. */
export function missingSetupItems(counts: {
  payScheduleCount: number;
  billCount: number;
  goalCount: number;
}): SetupItem[] {
  const missing: SetupItem[] = [];
  if (counts.payScheduleCount === 0) missing.push("payday");
  if (counts.billCount === 0) missing.push("bill");
  if (counts.goalCount === 0) missing.push("goal");
  return missing;
}

/** `dismissed` null = not loaded yet or load failed: stay hidden. */
export function shouldShowFinishSetup(args: {
  isOwner: boolean;
  dismissed: boolean | null;
  missing: readonly SetupItem[];
}): boolean {
  return args.isOwner && args.dismissed === false && args.missing.length > 0;
}

/** Query param that opens a page's add sheet on arrival. */
export const ADD_SHEET_PARAM = "add";

export function finishSetupHref(item: SetupItem): string {
  switch (item) {
    case "payday":
      return `/payday?${ADD_SHEET_PARAM}=1`;
    case "bill":
      return `/bills?${ADD_SHEET_PARAM}=1`;
    case "goal":
      return `/funds?${ADD_SHEET_PARAM}=1`;
  }
}

interface ParamsLike {
  get(name: string): string | null;
  toString(): string;
}

export function hasAddSheetParam(sp: ParamsLike): boolean {
  return sp.get(ADD_SHEET_PARAM) === "1";
}

/** The query string left after removing the add param (no "?"). */
export function stripAddSheetParam(sp: ParamsLike): string {
  const next = new URLSearchParams(sp.toString());
  next.delete(ADD_SHEET_PARAM);
  return next.toString();
}
