// Source guard for the Payday history chart and list (R22, #409).
// String checks on source files: they prove the pieces are wired, NOT how anything behaves at run time.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const SRC = fileURLToPath(new URL("..", import.meta.url));
const read = (rel) => readFileSync(join(SRC, rel), "utf8").replace(/\r\n/g, "\n");
const stripComments = (t) => t.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");

test("payChart lib has no imports", () => {
  assert.ok(!/^\s*import\s/m.test(stripComments(read("lib/payChart.ts"))));
});

test("payday-client uses the history section and drops the old per-member lists and select", () => {
  const t = stripComments(read("app/payday/payday-client.tsx"));
  assert.ok(t.includes("<PayHistorySection"));
  assert.ok(!t.includes("PayHistoryCard"));
  assert.ok(!t.includes("selectedContributor"));
  assert.ok(!t.includes("minimizedMembers"));
  assert.ok(!t.includes("contributor-filter"));
});

test("history section: tick boxes, period chips, chart, share, no chart library", () => {
  const t = stripComments(read("components/PayHistorySection.tsx"));
  assert.ok(t.includes('role="checkbox"') && t.includes("aria-checked"));
  assert.ok(t.includes("PERIODS.map") && t.includes("<PayHistoryChart"));
  assert.ok(t.includes("sharePercent(") && t.includes("toggleMember("));
  const pkg = read("../package.json");
  assert.ok(!/recharts|chart\.js|"d3/.test(pkg));
});

test("chart is a labelled SVG and its draw-in is switched off for Reduce Motion", () => {
  const t = stripComments(read("components/PayHistoryChart.tsx"));
  assert.ok(t.includes('role="img"') && t.includes("aria-label"));
  const css = read("app/globals.css");
  const i = css.indexOf(".chart-line-draw {");
  assert.ok(i > 0);
  const reduce = css.indexOf("@media (prefers-reduced-motion: reduce)", i);
  assert.ok(css.slice(reduce, reduce + 200).includes(".chart-line-draw"));
});
