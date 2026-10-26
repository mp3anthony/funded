// Source guard for the pay note pop-up and bonus payments (F12 #476, F13 #477). String checks on
// source files: they prove the pieces are wired, NOT how anything behaves at run time.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const SRC = fileURLToPath(new URL("..", import.meta.url));
const ROOT = join(SRC, "..");
const read = (rel) => readFileSync(join(SRC, rel), "utf8").replace(/\r\n/g, "\n");
const stripComments = (t) => t.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");

test("addBonusFlow lib has no imports", () => {
  assert.ok(!/^\s*import\s/m.test(stripComments(read("lib/addBonusFlow.ts"))));
});

test("migration adds is_bonus idempotently and is not a destructive change", () => {
  const sql = readFileSync(join(ROOT, "supabase/migrations/20261026120000_pay_history_is_bonus.sql"), "utf8");
  assert.ok(sql.includes("ADD COLUMN IF NOT EXISTS is_bonus boolean NOT NULL DEFAULT false"));
  assert.ok(!/DROP\s+(TABLE|COLUMN)/i.test(sql));
});

test("logBonus inserts a confirmed bonus with no schedule and never runs logPay, rules or the schedule date", () => {
  const t = stripComments(read("context/AppContext.tsx"));
  const start = t.indexOf("async function logBonus(");
  const body = t.slice(start, t.indexOf("function calculateAveragePay(", start));
  assert.ok(body.includes("pay_schedule_id: null"));
  assert.ok(body.includes("is_bonus: true"));
  assert.ok(body.includes('status: "confirmed"'));
  assert.ok(!body.includes("logPay("));
  assert.ok(!body.includes("pay_schedules"));
  assert.ok(!body.includes("checkAndApplyRules"));
  assert.ok(body.includes("throw error"));
});

test("updatePayNotes throws on error and on a silent zero-row update", () => {
  const t = stripComments(read("context/AppContext.tsx"));
  const start = t.indexOf("async function updatePayNotes(");
  const body = t.slice(start, t.indexOf("async function logBonus(", start));
  assert.ok(body.includes("throw error"));
  assert.ok(body.includes("assertRowUpdated("));
  assert.ok(body.includes('.select("id")'));
});

test("history rows open one Pay note pop-up through a labelled icon button", () => {
  const card = stripComments(read("components/PayHistoryCard.tsx"));
  assert.ok(card.includes('"View note"') && card.includes('"Add note"'));
  assert.ok(card.includes("onOpenNote"));
  assert.ok(!card.includes("history.notes}</span>"));
  const section = stripComments(read("components/PayHistorySection.tsx"));
  assert.ok(section.includes("<PayNoteCard"));
  const note = read("components/PayNoteCard.tsx");
  assert.ok(note.includes('title="Pay note"') && note.includes('successToast="Note saved"'));
});

test("Payday + opens a chooser; the deep links still go straight to the schedule flow", () => {
  const t = stripComments(read("app/payday/payday-client.tsx"));
  assert.ok(t.includes("onAdd={() => setIsChooserOpen(true)}"));
  assert.ok(t.includes("Add a bonus payment") && t.includes("Add a schedule"));
  assert.ok(t.includes("<AddBonusFlow"));
  // ?add= effect and the member sheet still call openAddSchedule directly.
  assert.ok(t.includes("    openAddSchedule();\n    const rest = stripAddSheetParam"));
  assert.ok(t.includes("onAddSchedule={(memberId) => openAddSchedule(memberId)}"));
});

test("bonus rows are told apart by is_bonus, tagged, and worded 'Bonus' in Recent activity", () => {
  assert.ok(stripComments(read("components/PayHistoryCard.tsx")).includes("is_bonus === true"));
  assert.ok(read("components/PayHistoryCard.tsx").includes("Bonus"));
  const recent = stripComments(read("components/RecentActivityCard.tsx"));
  assert.ok(recent.includes("is_bonus"));
  assert.ok(recent.includes("Bonus"));
  assert.ok(stripComments(read("lib/payChart.ts")).includes("is_bonus"));
});

test("deleting a bonus row asks about the bonus and not the next pay date", () => {
  const t = read("components/PayHistoryCard.tsx");
  assert.ok(t.includes("Delete this bonus of $"));
  const bonusQ = t.slice(t.indexOf("Delete this bonus of $"), t.indexOf("Delete this bonus of $") + 80);
  assert.ok(!bonusQ.includes("next pay date"));
  assert.ok(t.includes("The next pay date won't change."));
});
