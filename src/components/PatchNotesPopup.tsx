"use client";
/* eslint-disable react-hooks/set-state-in-effect -- one-time localStorage
   read to decide whether to show the popup; same pattern as
   AddBillSheet.tsx / ContributorSplits.tsx elsewhere in this repo. */

import { useEffect, useState } from "react";
import Link from "next/link";
import { Sparkles } from "lucide-react";
import Dialog, { DialogButton } from "@/components/ui/Dialog";
import { APP_VERSION } from "@/lib/version";
import { patchNotes, type PatchNoteEntry } from "@/lib/patch-notes";

/** localStorage key holding the last app version this browser has seen the
 *  patch-notes popup for. Plain getItem/setItem, matching the existing
 *  pattern used elsewhere in this app (theme, dashboard card collapse
 *  state, notification snoozes) — no wrapper/hook needed for one flag. */
const LAST_SEEN_KEY = "funded_last_seen_patch_notes_version";

/**
 * First-open-on-a-new-version popup (Slice 14, #113). Mounted once in
 * AppShell, alongside EmailVerifiedModal, so it can surface on any page
 * once the user is signed in and past onboarding.
 *
 * Detection mechanism: on mount, compares `APP_VERSION` (src/lib/version.ts,
 * the app's single source-of-truth display version) against a version
 * string stashed in localStorage the last time this popup was shown on this
 * browser. A mismatch (including "never seen before") means the popup is
 * eligible to show. It only actually shows if `patchNotes` (src/lib/
 * patch-notes.ts) has an entry — a version bump with no hand-written blurb
 * yet degrades gracefully (no popup, no error) rather than showing an empty
 * dialog. localStorage is updated at the moment the popup is shown (not on
 * dismiss), so it fires exactly once per version regardless of how the user
 * closes it.
 */
export default function PatchNotesPopup() {
  const [entry, setEntry] = useState<PatchNoteEntry | null>(null);

  useEffect(() => {
    try {
      if (typeof window === "undefined") return;
      const lastSeen = localStorage.getItem(LAST_SEEN_KEY);
      if (lastSeen === APP_VERSION) return;

      const newest = patchNotes[0];
      if (!newest) return; // No entries recorded yet — nothing to show, don't mark as seen.

      setEntry(newest);
      localStorage.setItem(LAST_SEEN_KEY, APP_VERSION);
    } catch {
      // localStorage unavailable (private browsing, blocked storage, etc.) —
      // fail silently, same as the app's other localStorage reads.
    }
  }, []);

  if (!entry) return null;

  return (
    <Dialog
      open={!!entry}
      onClose={() => setEntry(null)}
      title="What's new"
      icon={<Sparkles size={20} className="text-primary" />}
      maxWidthClass="max-w-sm"
      footer={
        <>
          <DialogButton variant="ghost" onClick={() => setEntry(null)}>
            Dismiss
          </DialogButton>
          <Link href="/patch-notes" className="flex-1" onClick={() => setEntry(null)}>
            <DialogButton variant="primary" className="w-full">
              See all what&apos;s new
            </DialogButton>
          </Link>
        </>
      }
    >
      <div className="flex flex-col gap-3">
        <p className="font-mono text-[11px] text-subtle">
          v{entry.version} · {entry.date}
        </p>
        <ul className="flex flex-col gap-2">
          {entry.highlights.map((line, i) => (
            <li
              key={i}
              className="text-[13px] font-body text-foreground/85 leading-relaxed flex gap-2"
            >
              <span className="text-primary shrink-0">•</span>
              <span>{line}</span>
            </li>
          ))}
        </ul>
      </div>
    </Dialog>
  );
}
