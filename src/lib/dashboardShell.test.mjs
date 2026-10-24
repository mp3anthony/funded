// Source guard for the Dashboard tip strip, stats carousel and Finish setup slot (R26, #413).
// String checks on source files: they prove the pieces are wired, NOT how anything looks or feels.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const SRC = fileURLToPath(new URL("..", import.meta.url));
const read = (rel) => readFileSync(join(SRC, rel), "utf8").replace(/\r\n/g, "\n");

test("tip strip: sessionStorage in try/catch, Reduce Motion, pauses while hidden", () => {
  const t = read("components/DashboardTipStrip.tsx");
  assert.ok(t.includes("sessionStorage"));
  assert.ok((t.match(/try \{/g) ?? []).length >= 2);
  assert.ok(t.includes("useReducedMotion"));
  assert.ok(t.includes("document.hidden"));
  assert.ok(t.includes("dashboardTips"));
  assert.ok(t.includes("truncate"));
  assert.ok(t.includes("IconCircle"));
});

test("the bottom ticker is gone", () => {
  assert.ok(!existsSync(join(SRC, "components/DashboardTipsTicker.tsx")));
  assert.ok(!/ticker/i.test(read("app/globals.css")));
  assert.ok(!/DashboardTipsTicker/.test(read("app/page-client.tsx")));
});

test("stats carousel: Carousel with autoRotate, count-up, Reduce Motion, decorative bar hidden", () => {
  const t = read("components/DashboardStats.tsx");
  assert.ok(/<Carousel label="Household stats" autoRotate>/.test(t));
  assert.ok(t.includes("useCountUp("));
  assert.ok(t.includes("useReducedMotion"));
  assert.ok(t.includes("motion-reduce:transition-none"));
  assert.ok(t.includes("useDisplayFrequency()"));
  assert.ok(t.includes('aria-hidden="true"'));
  assert.ok(t.includes("aria-label={sentence}"));
});

test("display frequency is read after mount, starting weekly", () => {
  const t = read("hooks/useDisplayFrequency.ts");
  assert.ok(t.includes("useState<FrequencyType | null>(null)"));
  assert.ok(t.includes("loadFrequency(userId)"));
});

test("verdict hooks share one input", () => {
  const t = read("hooks/useVerdict.ts");
  assert.ok(t.includes("export function useVerdictInput"));
  assert.ok(t.includes("export function useVerdictStats"));
  assert.ok(t.includes("export function useVerdict("));
});

test("Finish setup hook has a loading state and the card renders only for 'card'", () => {
  const h = read("hooks/useFinishSetup.ts");
  assert.ok(h.includes('"card" | "loading" | "none"'));
  assert.ok(h.includes('state: "loading"'));
  assert.ok(h.includes("isFinishSetupDismissed === null"));
  const c = read("components/FinishSetupCard.tsx");
  assert.ok(c.includes('state !== "card"'));
  assert.ok(c.includes("rounded-card"));
});

test("Dashboard order: tip strip, header, then one stats / Finish setup slot", () => {
  const t = read("app/page-client.tsx");
  const strip = t.indexOf("<DashboardTipStrip />");
  const header = t.indexOf("<PageHeader");
  const slot = t.indexOf("<FinishSetupCard />");
  const stats = t.indexOf("<DashboardStats />");
  const cards = t.indexOf("<UpcomingBillsCard");
  assert.ok(strip > -1 && strip < header && header < slot && header < stats);
  assert.ok(slot < cards && stats < cards);
  assert.ok(t.includes('finishSetup === "card"') && t.includes('finishSetup === "none"'));
  assert.ok(!t.includes("onMinimisedChange"));
  assert.ok(t.includes("useVerdict()"));
});
