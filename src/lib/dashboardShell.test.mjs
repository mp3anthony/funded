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
  assert.ok(t.includes("line-clamp-2") && !t.includes("truncate"));
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

test("Finish setup hook counts any goal, Just tracking included (F04)", () => {
  const h = read("hooks/useFinishSetup.ts");
  assert.ok(h.includes("goalCount: funds.length"));
  assert.ok(!h.includes("savingGoals"));
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

test("Dashboard order: header, one stats / Finish setup slot, then the tip strip", () => {
  const t = read("app/page-client.tsx");
  const strip = t.indexOf("<DashboardTipStrip />");
  const header = t.indexOf("<PageHeader");
  const slot = t.indexOf("<FinishSetupCard />");
  const stats = t.indexOf("<DashboardStats />");
  const cards = t.indexOf("<DashboardBills");
  const goals = t.indexOf("<DashboardGoals");
  assert.ok(strip > -1 && header > -1 && header < slot && header < stats);
  assert.ok(stats < strip && strip < cards && cards < goals);
  assert.ok(t.includes('finishSetup === "card"') && t.includes('finishSetup === "none"'));
  assert.ok(!t.includes("onMinimisedChange"));
  assert.ok(t.includes("useVerdict()"));
});

test("Bills and Goals carousels (R27): swipe-only, tappable cards, View all pills, old cards gone", () => {
  const b = read("components/DashboardBills.tsx");
  const g = read("components/DashboardGoals.tsx");
  for (const t of [b, g]) {
    assert.ok(t.includes("<Carousel label="));
    assert.ok(!t.includes("autoRotate"));
    assert.ok(t.includes("aria-label={sentence}"));
    assert.ok(t.includes('aria-hidden="true"'));
    assert.ok(t.includes("SectionHeader"));
  }
  assert.ok(b.includes('href="/bills"') && g.includes('href="/funds"'));
  assert.ok(b.includes("dashboardBills(") && b.includes("dueCountdown("));
  assert.ok(g.includes("dashboardGoals(") && g.includes("ProgressRing") && g.includes("useReducedMotion"));
  for (const f of ["UpcomingBillsCard", "ActiveGoalsCard", "ActiveGoalRow"]) {
    assert.ok(!existsSync(join(SRC, `components/${f}.tsx`)));
  }
  assert.ok(!read("context/AppContext.tsx").includes("isUpdatesCardVisible"));
});

test("F05 (#468): Bills carousel shows weekly amounts, tips wrap, tips are short, nav is opaque", () => {
  const b = read("components/DashboardBills.tsx");
  assert.ok(b.includes('convertAmount(bill.amount, bill.frequency ?? "monthly", "weekly")'));
  assert.ok(b.includes("a week") && !b.includes("a fortnight"));
  const tips = read("lib/dashboard-tips.ts");
  const lines = tips.split("\n").filter((l) => l.trim().startsWith('"Tip:'));
  assert.ok(lines.length > 0);
  for (const l of lines) assert.ok(l.trim().length - 3 <= 90, `tip too long: ${l.trim()}`);
  assert.ok(read("components/BottomNav.tsx").includes("bg-surface-elevated"));
  assert.ok(read("context/AppContext.tsx").includes('meta[name="theme-color"]'));
});

test("F05 (#468): Payday History collapses and remembers it; notify hour save can fail loudly", () => {
  const h = read("components/PayHistorySection.tsx");
  assert.ok(h.includes("aria-expanded={!collapsed}") && h.includes('COLLAPSE_SCOPE = "payday"'));
  assert.ok(h.includes("applyToggle(") && h.includes("saveCollapsed("));
  const ctx = read("context/AppContext.tsx");
  const i = ctx.indexOf("async function updateNotificationSettings");
  assert.ok(ctx.slice(i, i + 900).includes("throw err"));
  assert.ok(read("components/NotificationCenter.tsx").includes("showToast"));
});
