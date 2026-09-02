"use client";

import { Sparkles } from "lucide-react";
import PageHeader from "@/components/PageHeader";
import SectionHeader from "@/components/ui/SectionHeader";
import { patchNotes } from "@/lib/patch-notes";

/**
 * Hidden in-app "What's new" page (Slice 14, #113). Not in BottomNav —
 * reachable via the link at the bottom of Settings, and via the first-open
 * popup's "See what's new" link (PatchNotesPopup.tsx).
 *
 * Degrades gracefully when `patchNotes` is empty: no error, just an empty
 * state message.
 */
export default function PatchNotesClient() {
  return (
    <div className="flex-1 w-full max-w-2xl mx-auto px-6 pt-4 pb-10 md:pt-6">
      <PageHeader title="What's New" subtitle="Patch notes for the funded. app, newest first." />

      {patchNotes.length === 0 ? (
        <div className="flex flex-col items-center text-center gap-3 py-16">
          <Sparkles className="h-8 w-8 text-subtle" />
          <p className="text-sm text-muted font-body max-w-xs">
            No patch notes yet — check back after the next update.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-8 pt-2">
          {patchNotes.map((entry) => (
            <section key={entry.version}>
              <SectionHeader
                title={`v${entry.version}`}
                trailing={
                  <span className="font-mono text-[11px] text-subtle shrink-0">{entry.date}</span>
                }
              />
              <ul className="flex flex-col gap-2 pl-1">
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
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
