"use client";

import { useMemo, useState } from "react";
import { Check, Clock, Search } from "lucide-react";
import Dialog, { DialogButton } from "@/components/ui/Dialog";

/* ── Slice 8 (#37): per-household timezone picker ────────────────
   Owner-only edit surface — Settings only renders this dialog reachable
   for the household owner (see settings-client.tsx's Row gating); a
   non-owner sees the timezone as a plain read-only Row value and never
   mounts this component.

   The IANA zone list comes from Intl.supportedValuesOf('timeZone') at
   render time — no new dependency needed for a searchable picker, and the
   runtime's own list is guaranteed to be valid input to
   Intl.DateTimeFormat, which is exactly what todayInZone() (src/lib/
   notifications/timezone.ts) relies on. */

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
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState(currentTimezone);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const allTimezones = useMemo(() => getAllTimezones(), []);

  // Reset local state whenever the dialog is (re)opened so a previous
  // search/selection doesn't linger into the next open. Done during render
  // (the React-documented "adjusting state when a prop changes" pattern)
  // rather than in a useEffect, so this doesn't trigger a redundant extra
  // render pass just to reset state.
  const [prevIsOpen, setPrevIsOpen] = useState(isOpen);
  if (isOpen !== prevIsOpen) {
    setPrevIsOpen(isOpen);
    if (isOpen) {
      setSearch("");
      setSelected(currentTimezone);
      setError(null);
    }
  }

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return allTimezones;
    return allTimezones.filter((tz) => tz.toLowerCase().includes(q.replace(/\s+/g, "_")));
  }, [allTimezones, search]);

  async function handleSave() {
    if (selected === currentTimezone) {
      onClose();
      return;
    }
    setError(null);
    setIsSaving(true);
    try {
      await onSave(selected);
      onClose();
    } catch (err) {
      setError((err as Error)?.message || "Failed to update timezone. Please try again.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Dialog
      open={isOpen}
      onClose={onClose}
      title="Household timezone"
      icon={<Clock className="h-5 w-5 text-primary" />}
      subheader={
        <div className="px-5 pb-4">
          <p className="text-sm text-muted mb-3">
            Bills and reminders are calculated against this timezone&apos;s local day.
          </p>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search timezones…"
              autoFocus
              className="w-full pl-9 pr-3 py-3 rounded-xl bg-background border border-border text-foreground text-sm font-medium focus:ring-2 focus:ring-primary/40 focus:border-primary outline-none transition-all"
            />
          </div>
        </div>
      }
      footer={
        <>
          <DialogButton variant="ghost" onClick={onClose} disabled={isSaving}>
            Cancel
          </DialogButton>
          <DialogButton
            variant="primary"
            onClick={handleSave}
            disabled={isSaving || selected === currentTimezone}
          >
            {isSaving ? "Saving…" : "Save"}
          </DialogButton>
        </>
      }
    >
      <div className="flex flex-col gap-1">
        {error && (
          <div className="bg-destructive/10 border border-destructive/50 rounded-[2px] p-3 mb-2 text-destructive text-xs font-mono break-words whitespace-pre-wrap">
            <span className="font-bold">Failed to update timezone:</span>
            <br />
            {error}
          </div>
        )}
        {filtered.length === 0 && (
          <p className="text-sm text-muted text-center py-6">No timezones match &quot;{search}&quot;.</p>
        )}
        {filtered.map((tz) => {
          const active = tz === selected;
          return (
            <button
              key={tz}
              type="button"
              onClick={() => setSelected(tz)}
              className={`w-full flex items-center justify-between gap-3 px-4 py-3 rounded-xl border transition-colors text-left ${
                active
                  ? "border-primary/60 bg-primary/10 text-foreground"
                  : "border-transparent text-muted hover:text-foreground hover:bg-surface-raised"
              }`}
            >
              <span className="text-sm font-semibold truncate">{formatZoneLabel(tz)}</span>
              {active && <Check className="h-4 w-4 text-primary shrink-0" />}
            </button>
          );
        })}
      </div>
    </Dialog>
  );
}
