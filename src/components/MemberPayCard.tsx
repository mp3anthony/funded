"use client";

import { useState } from "react";
import type { Member, PaySchedule } from "@/context/AppContext";
import ProgressRing from "@/components/ui/ProgressRing";
import { cn } from "@/lib/utils";
import {
  amountLabel,
  cardAmount,
  cardLine,
  daysUntil,
  frequencyLabel,
  memberCardKey,
  ringPercent,
} from "@/lib/paydayCards";

interface MemberPayCardProps {
  member: Member;
  /** Soonest next pay first. Empty = no pay set up yet. */
  schedules: PaySchedule[];
  /** Household-local day; blank until the page has mounted. */
  todayYmd: string;
  /** Average of a variable schedule's last 4 confirmed pays, or null. */
  averageOf: (scheduleId: string) => number | null;
  /** The add highlight is on this card. */
  highlighted: boolean;
  /** A schedule just added: the card switches to its tab. */
  focusScheduleId: string | null;
  /** Whether the viewer may set up this member's pay (themselves, or an owner with 2+ members). */
  canSetUp: boolean;
  /** Open this member's sheet. */
  onOpen: () => void;
  /** Open the New pay schedule flow for this member. */
  onSetUp: () => void;
}

/**
 * One member's slide in the Payday carousel (R21, #408): avatar and name,
 * schedule tabs when there are 2+, the amount (grey when it is an estimate), a
 * progress ring toward the next pay and "Fortnightly · in 5 days". The body is
 * one button that opens the member's sheet; the tabs sit above it, outside the
 * button. A member with no pay gets a grey "Set up <name>'s pay" card. Rules
 * live in `lib/paydayCards.ts`.
 */
export default function MemberPayCard({
  member,
  schedules,
  todayYmd,
  averageOf,
  highlighted,
  focusScheduleId,
  canSetUp,
  onOpen,
  onSetUp,
}: MemberPayCardProps) {
  // Which schedule tab is showing, by id. A stale id (schedule deleted) falls back to the first.
  const [tabId, setTabId] = useState<string | null>(null);
  // A schedule just added to this card takes the tab (derived-state reset, no effect).
  const [seenFocus, setSeenFocus] = useState<string | null>(null);
  if (focusScheduleId !== seenFocus) {
    setSeenFocus(focusScheduleId);
    if (focusScheduleId && schedules.some((s) => String(s.id) === focusScheduleId)) setTabId(focusScheduleId);
  }

  const wrapper = cn(
    "rounded-card border bg-surface",
    schedules.length === 0 ? "border-dashed border-border-strong" : "border-border"
  );
  // The add highlight sits on an inner wrapper: its animation ends transparent, so it must not own the card's background.
  const inner = cn("rounded-card", highlighted && "row-highlight");

  if (schedules.length === 0) {
    const body = (
      <>
        <MemberHeading member={member} />
        <p className="mt-3 text-[17px] font-semibold text-muted">
          {canSetUp ? `Set up ${member.name}'s pay` : "No pay set up yet"}
        </p>
        <p className="mt-1 text-xs text-muted">
          {canSetUp ? "Add when and how much they get paid." : "Only they, or the owner, can add it."}
        </p>
      </>
    );
    return (
      <div id={memberCardKey(member.id)} className={wrapper}>
      <div className={inner}>
        {canSetUp ? (
          <button
            type="button"
            onClick={onSetUp}
            className="press-tint block w-full cursor-pointer rounded-card p-4 text-left"
          >
            {body}
          </button>
        ) : (
          <div className="p-4">{body}</div>
        )}
        </div>
      </div>
    );
  }

  const schedule = schedules.find((s) => String(s.id) === tabId) ?? schedules[0];
  const daysLeft = daysUntil(schedule.next_pay_date, todayYmd);
  const due = daysLeft !== null && daysLeft <= 0;
  const shown = cardAmount(schedule, schedule.is_fixed_amount ? null : averageOf(String(schedule.id)));

  return (
    <div id={memberCardKey(member.id)} className={wrapper}>
      <div className={inner}>
      {schedules.length > 1 && (
        <div role="group" aria-label={`${member.name}'s pay schedules`} className="flex flex-wrap gap-2 px-4 pt-3">
          {schedules.map((s) => {
            const active = String(s.id) === String(schedule.id);
            return (
              <button
                key={s.id}
                type="button"
                aria-pressed={active}
                onClick={() => setTabId(String(s.id))}
                className={cn(
                  "press relative inline-flex h-8 cursor-pointer items-center rounded-full border px-3 text-[13px] before:absolute before:inset-x-0 before:-inset-y-1.5 before:content-['']",
                  active
                    ? "border-transparent bg-surface-raised font-bold text-foreground ring-2 ring-inset ring-primary"
                    : "border-border-strong bg-surface-raised font-medium text-muted"
                )}
              >
                {frequencyLabel(s.frequency)}
              </button>
            );
          })}
        </div>
      )}
      <button
        type="button"
        onClick={onOpen}
        className="press-tint flex w-full cursor-pointer items-center gap-3 rounded-card p-4 text-left"
      >
        <span className="flex min-w-0 flex-1 flex-col">
          <MemberHeading member={member} />
          <span
            className={cn(
              "mt-3 truncate text-[28px] font-bold leading-tight tracking-tight tabular-nums",
              shown.estimate ? "text-muted" : "text-primary"
            )}
          >
            {shown.amount !== null ? amountLabel(shown.amount) : schedule.is_fixed_amount ? "Amount needed" : "Variable"}
          </span>
          {shown.note && <span className="mt-0.5 text-xs text-muted">{shown.note}</span>}
          <span className={cn("mt-1 text-sm", due ? "font-semibold text-primary" : "text-muted")}>
            {cardLine(schedule.frequency, daysLeft)}
          </span>
        </span>
        <ProgressRing percent={ringPercent(daysLeft, schedule.frequency)} size={72} stroke={6} className={due ? "text-primary" : "text-muted"}>
          <span className={cn("text-center text-[13px] font-bold leading-none", due ? "text-primary" : "text-foreground")}>
            {daysLeft === null ? "" : due ? "Now" : daysLeft}
          </span>
        </ProgressRing>
      </button>
      </div>
    </div>
  );
}

/** Round avatar (photo, else initial) and the member's name. Decorative image: the name says who. */
function MemberHeading({ member }: { member: Member }) {
  return (
    <span className="flex items-center gap-2">
      <span
        aria-hidden="true"
        className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full border border-primary bg-surface-elevated text-[11px] font-bold text-foreground"
      >
        {member.avatar_url ? (
          <img src={member.avatar_url} alt="" className="h-full w-full object-cover" />
        ) : (
          member.avatar || member.name.charAt(0).toUpperCase()
        )}
      </span>
      <span className="truncate font-body text-[15px] font-semibold text-foreground">{member.name}</span>
    </span>
  );
}
