"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Logo from "@/components/Logo";
import SectionHeader from "@/components/ui/SectionHeader";
import { useApp } from "@/context/AppContext";
import {
  guideTitle,
  guideSubtitle,
  installHeading,
  installSteps,
  introLines,
  missions,
  billVsExpenseHeading,
  billVsExpense,
  pageGuide,
  goodToKnowHeading,
  goodToKnow,
  guideFooter,
} from "@/lib/getting-started";

/**
 * Public Getting started guide (#247). Rendered by AppShell without the shell,
 * loading wheel or onboarding gate, so signed-out and not-onboarded visitors
 * can read it. The URL is linked from the website and must not change.
 */
export default function GettingStartedClient() {
  const { session, isAuthLoading } = useApp();
  const [isMounted, setIsMounted] = useState(false);
  useEffect(() => {
    Promise.resolve().then(() => {
      setIsMounted(true);
    });
  }, []);

  const backLink =
    isMounted && !isAuthLoading ? (
      session ? (
        <Link href="/settings" className="text-sm font-medium text-primary">
          ‹ Back to Settings
        </Link>
      ) : (
        <Link href="/login" className="text-sm font-medium text-primary">
          Sign in
        </Link>
      )
    ) : (
      <span className="inline-block text-sm" aria-hidden="true">
        &nbsp;
      </span>
    );

  return (
    <div
      className="flex-1 min-h-0 w-full overflow-y-auto"
      style={{
        WebkitOverflowScrolling: "touch",
        paddingTop: "env(safe-area-inset-top)",
        paddingBottom: "calc(2rem + env(safe-area-inset-bottom))",
      }}
    >
      <div className="max-w-2xl mx-auto px-6 pt-4">
        <div className="flex items-center justify-between w-full mb-4">
          {backLink}
          <Logo size="medium" showWordmark={true} />
        </div>

        <h1 className="font-heading font-extrabold text-2xl tracking-tight text-foreground">
          {guideTitle}
        </h1>
        <p className="text-xs sm:text-sm text-muted mt-1 font-body mb-6">{guideSubtitle}</p>

        <div className="rounded-xl border border-primary/40 bg-primary/5 p-4 mb-8">
          <h2 className="font-heading font-bold text-[15px] text-foreground mb-3">
            {installHeading}
          </h2>
          <ul className="flex flex-col gap-2">
            {installSteps.map((line, i) => (
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

        <section className="mb-8">
          <SectionHeader title="How this works" />
          <ul className="flex flex-col gap-2 pl-1">
            {introLines.map((line, i) => (
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

        <section className="mb-8">
          <SectionHeader title="Missions" />
          <ol className="flex flex-col gap-6">
            {missions.map((m, i) => (
              <li key={i}>
                <p className="font-mono text-[11px] uppercase tracking-wider text-subtle">
                  Mission {i + 1} · Optional
                </p>
                <h3 className="font-heading font-bold text-[15px] text-foreground mt-1 mb-2">
                  {m.title}
                </h3>
                <ul className="flex flex-col gap-2 pl-1">
                  {m.steps.map((step, j) => (
                    <li
                      key={j}
                      className="text-[13px] font-body text-foreground/85 leading-relaxed flex gap-2"
                    >
                      <span className="text-primary shrink-0">•</span>
                      <span>{step}</span>
                    </li>
                  ))}
                </ul>
                {i === 3 && (
                  <div className="border border-border rounded-xl p-4 mt-3">
                    <h4 className="font-heading font-bold text-[13px] text-foreground mb-2">
                      {billVsExpenseHeading}
                    </h4>
                    <ul className="flex flex-col gap-2">
                      {billVsExpense.map((line, k) => (
                        <li
                          key={k}
                          className="text-[13px] font-body text-foreground/85 leading-relaxed flex gap-2"
                        >
                          <span className="text-primary shrink-0">•</span>
                          <span>{line}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {m.note && (
                  <p className="text-xs text-muted font-body mt-2 pl-1">{m.note}</p>
                )}
              </li>
            ))}
          </ol>
        </section>

        <section className="mb-8">
          <SectionHeader title="Around the app" />
          <ul className="flex flex-col gap-3 pl-1">
            {pageGuide.map((p) => (
              <li key={p.name} className="flex flex-col gap-0.5">
                <span className="font-mono text-[11px] font-semibold uppercase tracking-wider text-foreground">
                  {p.name}
                </span>
                <span className="text-[13px] font-body text-foreground/85 leading-relaxed">
                  {p.description}
                </span>
              </li>
            ))}
          </ul>
        </section>

        <div className="rounded-xl border border-accent/40 bg-accent/5 p-4 mb-8">
          <h2 className="font-heading font-bold text-[15px] text-foreground mb-3">
            {goodToKnowHeading}
          </h2>
          <ul className="flex flex-col gap-2">
            {goodToKnow.map((item, i) => (
              <li
                key={i}
                className="text-[13px] font-body text-foreground/85 leading-relaxed flex gap-2"
              >
                <span className="text-accent shrink-0">•</span>
                <span>{item.text}</span>
              </li>
            ))}
          </ul>
        </div>

        <p className="text-[13px] font-body text-muted mb-6">{guideFooter}</p>

        <div className="pb-2">{backLink}</div>
      </div>
    </div>
  );
}
