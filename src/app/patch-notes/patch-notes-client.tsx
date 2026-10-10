"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, CloudOff, Sparkles } from "lucide-react";
import PageHeader from "@/components/PageHeader";
import SectionHeader from "@/components/ui/SectionHeader";
import { patchNotes } from "@/lib/patch-notes";
import type { KnownIssuesResult } from "@/lib/knownIssues";

type Tab = "notes" | "known";

/**
 * Hidden in-app "What's new" page (Slice 14, #113). Not in BottomNav —
 * reachable via the link at the bottom of Settings, and via the first-open
 * popup's "See what's new" link (PatchNotesPopup.tsx).
 *
 * Two tabs (#152): "Patch Notes" (default) and "Known Issues". Known Issues is
 * fetched on mount from the cached `/api/known-issues` route (the service
 * worker bypasses `/api/`, so it stays live). Blurbs render as plain React text
 * only, never as HTML. Any failure shows a friendly message, never an error.
 *
 * Degrades gracefully when `patchNotes` is empty: no error, just an empty
 * state message.
 */
export default function PatchNotesClient() {
  const [tab, setTab] = useState<Tab>("notes");
  const [known, setKnown] = useState<"loading" | KnownIssuesResult>("loading");

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/known-issues", { signal: controller.signal })
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error("bad status"))))
      .then((data: KnownIssuesResult) => {
        if (data && data.status === "ok" && Array.isArray(data.issues)) {
          setKnown(data);
        } else {
          setKnown({ status: "unavailable" });
        }
      })
      .catch(() => {
        if (!controller.signal.aborted) setKnown({ status: "unavailable" });
      });
    return () => controller.abort();
  }, []);

  const tabClass = (active: boolean) =>
    `pb-2 px-1 text-sm font-semibold transition-colors relative ${
      active ? "text-primary" : "text-muted hover:text-foreground"
    }`;

  return (
    <div className="flex-1 w-full max-w-2xl mx-auto px-6 pt-4 pb-10 md:pt-6">
      <PageHeader
        title="What's New"
        subtitle={
          tab === "notes"
            ? "Patch notes for the funded. app, newest first."
            : "Problems we know about and are working on."
        }
      />

      <div role="tablist" className="flex space-x-4 border-b border-border-strong pt-1 mb-4">
        <button
          type="button"
          role="tab"
          aria-selected={tab === "notes"}
          className={tabClass(tab === "notes")}
          onClick={() => setTab("notes")}
        >
          Patch Notes
          {tab === "notes" && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-t-full" />
          )}
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === "known"}
          className={tabClass(tab === "known")}
          onClick={() => setTab("known")}
        >
          Known Issues
          {tab === "known" && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-t-full" />
          )}
        </button>
      </div>

      {tab === "notes" ? (
        patchNotes.length === 0 ? (
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
        )
      ) : known === "loading" ? (
        <div className="flex flex-col items-center text-center gap-3 py-16">
          <p className="text-sm text-muted font-body max-w-xs">Checking for known issues…</p>
        </div>
      ) : known.status === "unavailable" ? (
        <div className="flex flex-col items-center text-center gap-3 py-16">
          <CloudOff className="h-8 w-8 text-subtle" />
          <p className="text-sm text-muted font-body max-w-xs">
            Couldn&apos;t load known issues right now. Check back a little later.
          </p>
        </div>
      ) : known.issues.length === 0 ? (
        <div className="flex flex-col items-center text-center gap-3 py-16">
          <CheckCircle2 className="h-8 w-8 text-subtle" />
          <p className="text-sm text-muted font-body max-w-xs">
            Nothing known right now. If something looks wrong, let us know from Settings.
          </p>
        </div>
      ) : (
        <ul className="flex flex-col gap-2 pl-1 pt-2">
          {known.issues.map((issue) => (
            <li
              key={issue.number}
              className="text-[13px] font-body text-foreground/85 leading-relaxed flex gap-2"
            >
              <span className="text-primary shrink-0">•</span>
              <span>
                {issue.paragraphs.map((p, i) => (
                  <span key={i} className="block">
                    {p}
                  </span>
                ))}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
