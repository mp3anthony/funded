// Source guard for the Pending pay model (R19, #406). String checks on source files:
// they prove the pieces are wired, NOT how anything behaves at run time.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const SRC = fileURLToPath(new URL("..", import.meta.url));
const ROOT = join(SRC, "..");
const read = (rel) => readFileSync(join(SRC, rel), "utf8").replace(/\r\n/g, "\n");
const stripComments = (t) => t.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");

test("payHistory lib exists and has no imports", () => {
  assert.ok(existsSync(join(SRC, "lib/payHistory.ts")));
  assert.ok(!/^\s*import\s/m.test(stripComments(read("lib/payHistory.ts"))));
});

test("migration makes amount nullable, is re-runnable and backfills", () => {
  const sql = readFileSync(join(ROOT, "supabase/migrations/20261024120000_pay_history_amount_nullable.sql"), "utf8");
  assert.ok(sql.includes("DROP NOT NULL"));
  assert.ok(sql.includes("DROP CONSTRAINT IF EXISTS pay_history_amount_known_unless_pending"));
  assert.ok(sql.includes("status = 'pending' AND amount = 0"));
});

test("payday-client logs in household time and averages per schedule before logging", () => {
  const t = stripComments(read("app/payday/payday-client.tsx"));
  assert.ok(!t.includes("toISOString().split"));
  assert.ok(t.includes("todayInZone("));
  assert.ok(t.includes("calculateAveragePay(String(schedule.id))"));
  assert.ok(t.indexOf("calculateAveragePay(") < t.indexOf("await logPay("));
});

test("AppContext uses the shared pay rules, claims first and has no confirmPay", () => {
  const t = stripComments(read("context/AppContext.tsx"));
  assert.ok(t.includes("averagePay("));
  assert.ok(t.includes("buildPendingPayRows("));
  assert.ok(t.includes('.eq("next_pay_date", schedule.next_pay_date)'));
  assert.ok(!/\bconfirmPay\b/.test(t));
});

test("reminders use the daily key and the cron route creates Pending pays", () => {
  assert.ok(read("lib/notifications/generateReminders.ts").includes("lodgePaymentDedupeKey("));
  const cron = read("app/api/cron/push-reminders/route.ts");
  assert.ok(cron.includes("buildPendingPayRows"));
  assert.ok(cron.includes("pendingCreated"));
});

test("components cope with a NULL pay amount", () => {
  assert.ok(read("components/PayHistoryCard.tsx").includes("Amount needed"));
  assert.ok(read("components/HealthScoreCard.tsx").includes("latestLoggedAmount("));
  assert.ok(read("components/RecentActivityCard.tsx").includes('p.status === "pending"'));
});
