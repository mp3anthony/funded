"use client";

import { useId, useMemo, useState } from "react";
import { Check, Search } from "lucide-react";
import Field from "@/components/ui/Field";
import Input from "@/components/ui/Input";
import SingleCard from "@/components/ui/SingleCard";

/* ── Slice 8 (#37): per-household timezone picker ────────────────
   Owner-only edit surface — Settings only renders this dialog reachable
   for the household owner (see settings-client.tsx's Row gating); a
   non-owner sees the timezone as a plain read-only Row value and never
   mounts this component.

   The IANA zone list comes from Intl.supportedValuesOf('timeZone') at
   render time — no new dependency needed for a searchable picker, and the
   runtime's own list is guaranteed to be valid input to
   Intl.DateTimeFormat, which is exactly what todayInZone() (src/lib/
   notifications/timezone.ts) relies on.

   R12 (#399): a SingleCard; Save is blocked until a different zone is picked. */

interface TimezoneDialogProps {
  isOpen: boolean;
  onClose: () => void;
  currentTimezone: string;
  onSave: (timezone: string) => Promise<void>;
}

function formatZoneLabel(zone: string): string {
  return zone.replace(/_/g, " ").replace(/\//g, " / ");
}

function getAllTimezones(): string[] {
  try {
    // Not available in every runtime (older Safari); the try/catch below
    // falls back to a short manual list so the dialog still works there.
    if (typeof Intl.supportedValuesOf === "function") {
      return Intl.supportedValuesOf("timeZone");
    }
  } catch {
    // fall through
  }
  return [
    "Australia/Sydney",
    "Australia/Melbourne",
    "Australia/Brisbane",
    "Australia/Perth",
    "Australia/Adelaide",
    "Pacific/Auckland",
    "Asia/Singapore",
    "Asia/Tokyo",
    "Europe/London",
    "America/New_York",
    "America/Los_Angeles",
    "UTC",
  ];
}

export default function TimezoneDialog({
  isOpen,
  onClose,
  currentTimezone,
  onSave,
}: TimezoneDialogProps) {
  const searchId = useId();
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState(currentTimezone);

  const allTimezones = useMemo(() => getAllTimezones(), []);

  // Reset local state whenever the dialog is (re)opened so a previous
  // search/selection doesn't linger into the next open. Done during render
  // (the React-documented "adjusting state when a prop changes" pattern)
  // rather than in a useEffect, so this doesn't trigger a redundant extra
  // render pass just to reset state. SingleCard resets its own save state.
  const [prevIsOpen, setPrevIsOpen] = useState(isOpen);
  if (isOpen !== prevIsOpen) {
    setPrevIsOpen(isOpen);
    if (isOpen) {
      setSearch("");
      setSelected(currentTimezone);
    }
  }

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return allTimezones;
    return allTimezones.filter((tz) => tz.toLowerCase().includes(q.replace(/\s+/g, "_")));
  }, [allTimezones, search]);

  return (
    <SingleCard
      open={isOpen}
      onClose={onClose}
      title="Household timezone"
      submitLabel="Save"
      canSubmit={selected !== currentTimezone}
      onSubmit={() => onSave(selected)}
    >
      <Field
        id={searchId}
        label="Timezone"
        description="Bills and reminders are calculated against this timezone's local day."
      >
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          <Input
            id={searchId}
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => {
              // Return closes the keyboard; it must not save the card.
              if (e.key === "Enter") {
                e.preventDefault();
                e.currentTarget.blur();
              }
            }}
            placeholder="Search timezones…"
            enterKeyHint="search"
            autoComplete="off"
            aria-describedby={`${searchId}-desc`}
            className="pl-9"
          />
        </div>
      </Field>
      <div className="flex max-h-64 flex-col gap-1 overflow-y-auto">
        {filtered.length === 0 && (
          <p className="py-6 text-center text-sm text-muted">No timezones match &quot;{search}&quot;.</p>
        )}
        {filtered.map((tz) => {
          const active = tz === selected;
          return (
            <button
              key={tz}
              type="button"
              onClick={() => setSelected(tz)}
              aria-pressed={active}
              className={`flex min-h-11 w-full items-center justify-between gap-3 rounded-input border px-4 py-3 text-left transition-colors ${
                active
                  ? "border-primary/60 bg-primary/10 text-foreground"
                  : "border-transparent text-muted"
              }`}
            >
              <span className="truncate text-sm font-semibold">{formatZoneLabel(tz)}</span>
              {active && <Check className="h-4 w-4 shrink-0 text-primary-ink" />}
            </button>
          );
        })}
      </div>
    </SingleCard>
  );
}
