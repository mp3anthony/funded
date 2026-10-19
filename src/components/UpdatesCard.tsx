/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Sparkles, X } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { APP_VERSION } from "@/lib/version";
import { patchNotes, type PatchNoteEntry } from "@/lib/patch-notes";
import { pickUpdatesCardEntry, updatesCardPreview, UPDATES_CARD_BULLETS } from "@/lib/updatesCard";

/** localStorage key holding the last app version this browser has been shown
 *  the Updates card for. Plain getItem/setItem, matching the existing pattern
 *  used elsewhere in this app (theme, dashboard card collapse state). */
const LAST_SEEN_KEY = "funded_last_seen_patch_notes_version";

/** How long the card waits before appearing, on mount (Slice 13, #99 fix).
 *  The dashboard's stat tiles count up from 0 over 900ms on first paint;
 *  showing the card immediately would cover that. */
const SHOW_DELAY_MS = 1200;

/** The shown-but-not-yet-dismissed entry. Module-level so it survives AppShell
 *  unmounting this component (e.g. `isLoading` flipping back on at session
 *  re-auth / app resume): the version is already marked seen, so without this
 *  the card would vanish without the person closing it. Cleared by close(). */
let pendingEntry: PatchNoteEntry | null = null;

/**
 * Updates card (#260, replaces the first-open popup from Slice 14, #113).
 * Mounted once in AppShell. A compact, non-blocking card above the bottom
 * nav, shown once on the first open of a new version. It stays until the
 * person taps X or "See updates" (no auto-dismiss). No backdrop and no focus
 * trap, so the app stays usable underneath.
 *
 * The version is marked seen the moment the card is shown (not on dismiss),
 * so it appears once per version. While it shows it tells AppContext
 * (`isUpdatesCardVisible`) so the dashboard tips ticker steps aside.
 */
export default function UpdatesCard() {
  const { setUpdatesCardVisible } = useApp();
  const pathname = usePathname();
  const [entry, setEntry] = useState<PatchNoteEntry | null>(null);

  useEffect(() => {
    // Remounted while a card was already showing: bring it straight back.
    if (pendingEntry) {
      setEntry(pendingEntry);
      setUpdatesCardVisible(true);
      return;
    }
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      if (typeof window === "undefined") return;
      const picked = pickUpdatesCardEntry(localStorage.getItem(LAST_SEEN_KEY), APP_VERSION, patchNotes);
      if (!picked) return; // Seen already, or no entries yet (don't mark as seen).

      const markSeen = () => {
        try {
          localStorage.setItem(LAST_SEEN_KEY, APP_VERSION);
        } catch {
          // localStorage unavailable — fail silently, same as elsewhere.
        }
      };

      // Opened straight onto the Updates page: they're already reading it.
      if (window.location.pathname === "/patch-notes") {
        markSeen();
        return;
      }

      // Delayed, not immediate — see SHOW_DELAY_MS above.
      timer = setTimeout(() => {
        pendingEntry = picked;
        setEntry(picked);
        setUpdatesCardVisible(true);
        markSeen();
      }, SHOW_DELAY_MS);
    } catch {
      // localStorage unavailable (private browsing, blocked storage, etc.) —
      // fail silently, same as the app's other localStorage reads.
    }
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [setUpdatesCardVisible]);

  // Clear the flag if this unmounts while showing (e.g. sign-out), so the
  // ticker isn't left hidden. The pending entry is kept for a remount.
  useEffect(() => {
    return () => setUpdatesCardVisible(false);
  }, [setUpdatesCardVisible]);

  function close() {
    pendingEntry = null;
    setEntry(null);
    setUpdatesCardVisible(false);
  }

  // Already on the Updates page: the card has nothing left to point at.
  useEffect(() => {
    if (pathname === "/patch-notes" && pendingEntry) close();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  if (!entry) return null;

  const { shown, moreCount } = updatesCardPreview(entry.highlights, UPDATES_CARD_BULLETS);

  return (
    <aside
      aria-label="Updates"
      className="fixed inset-x-0 z-[55] flex justify-center px-4 pointer-events-none"
      style={{ bottom: "calc(5rem + 12px + env(safe-area-inset-bottom, 0px))" }}
    >
      <div className="pointer-events-auto w-full max-w-md rounded-[2px] border border-border-strong bg-surface-elevated shadow-lg animate-in fade-in slide-in-from-bottom-2 duration-200 motion-reduce:animate-none">
        <div className="flex items-center gap-2 pl-4 pr-1 pt-1">
          <Sparkles size={16} className="text-primary shrink-0" />
          <p className="flex-1 min-w-0 text-sm font-bold text-foreground">
            Updates
            <span className="ml-2 text-[11px] font-normal text-subtle">
              v{entry.version} · {entry.date}
            </span>
          </p>
          <button
            type="button"
            onClick={close}
            aria-label="Close updates"
            className="shrink-0 flex h-11 w-11 items-center justify-center text-muted hover:text-foreground cursor-pointer touch-manipulation"
          >
            <X size={18} />
          </button>
        </div>
        <ul className="flex flex-col gap-1.5 px-4 pb-1">
          {shown.map((line, i) => (
            <li key={i} className="text-[13px] font-body text-foreground/85 leading-snug flex gap-2">
              <span className="text-primary shrink-0">•</span>
              <span className="line-clamp-2">{line}</span>
            </li>
          ))}
        </ul>
        <div className="flex items-center justify-between gap-3 px-4">
          <span className="text-xs text-muted">{moreCount > 0 ? `+${moreCount} more` : ""}</span>
          <Link
            href="/patch-notes"
            onClick={close}
            className="flex min-h-[44px] items-center text-sm font-semibold text-primary hover:underline touch-manipulation"
          >
            See updates
          </Link>
        </div>
      </div>
    </aside>
  );
}
