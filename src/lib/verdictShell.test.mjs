// Source guard for the Dashboard verdict (R25, #412). String checks on source files:
// they prove the pieces are wired, NOT how anything looks or feels on a device.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const SRC = fileURLToPath(new URL("..", import.meta.url));
const read = (rel) => readFileSync(join(SRC, rel), "utf8").replace(/\r\n/g, "\n");
const stripComments = (t) => t.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");

test("verdict lib exists and has no imports", () => {
  assert.ok(existsSync(join(SRC, "lib/verdict.ts")));
  assert.ok(!/^\s*import\s/m.test(stripComments(read("lib/verdict.ts"))));
});

test("the Health score is gone", () => {
  assert.ok(!existsSync(join(SRC, "components/HealthScoreCard.tsx")));
  assert.ok(!existsSync(join(SRC, "components/HealthScore.tsx")));
  assert.ok(!read("lib/utils.ts").includes("calculateHealthScore"));
});

test("Dashboard header is the verdict, with a screen-reader page name", () => {
  const t = read("app/page-client.tsx");
  assert.ok(t.includes("useVerdict()"));
  assert.ok(t.includes("title={verdict.headline}"));
  assert.ok(t.includes("subtitle={verdict.detail}"));
  assert.ok(t.includes('srTitle="Dashboard"'));
  assert.ok(!t.includes("HealthScoreCard"));
  // Grey for "nothing to compare", never red.
  assert.ok(/neutral: \{ className: "bg-subtle"/.test(t));
  assert.ok(/bad: \{ className: "bg-destructive"/.test(t));
  assert.ok(read("components/PageHeader.tsx").includes("sr-only"));
});

test("useVerdict feeds latest logged pay amounts and counted bills", () => {
  const t = read("hooks/useVerdict.ts");
  assert.ok(t.includes("latestLoggedAmount("));
  assert.ok(t.includes("countsTowardTotals"));
});
