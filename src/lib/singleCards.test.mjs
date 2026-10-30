// Source guard for the single-card pop-ups and Report an issue (R12, #399).
// String checks on source files: they prove the pieces are wired, NOT how anything
// looks or feels on a device.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const SRC = fileURLToPath(new URL("..", import.meta.url));
const read = (rel) => readFileSync(join(SRC, rel), "utf8").replace(/\r\n/g, "\n");

function walk(dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) out.push(...walk(full));
    else if (/\.(ts|tsx)$/.test(name) && !/\.test\./.test(name)) out.push(full);
  }
  return out;
}

const RESTYLED = [
  "components/TimezoneDialog.tsx",
  "components/NotifyHourDialog.tsx",
  "components/NextDueDateDialog.tsx",
  "components/EditCategoryOrderModal.tsx",
  "components/BugReportSheet.tsx",
];

test("the five restyled files have no square corners", () => {
  for (const rel of RESTYLED) assert.ok(!read(rel).includes("rounded-[2px]"), `${rel} still square`);
});

test("Timezone and Notify hour are SingleCards that block an unchanged save", () => {
  const tz = read("components/TimezoneDialog.tsx");
  assert.ok(tz.includes("<SingleCard") && tz.includes('title="Household timezone"'));
  assert.ok(tz.includes("canSubmit={selected !== currentTimezone}"));
  assert.ok(tz.includes("onSubmit={() => onSave(selected)}"));
  assert.ok(!tz.includes("<Dialog"));
  const nh = read("components/NotifyHourDialog.tsx");
  assert.ok(nh.includes("<SingleCard") && nh.includes('title="Notify me at"'));
  assert.ok(nh.includes("<Select") && nh.includes("canSubmit={selected !== currentHour}"));
  assert.ok(!nh.includes("not wired up"), "stale comment is back");
});

test("Next due date is a bottom Dialog with the three pills and keeps its props", () => {
  const t = read("components/NextDueDateDialog.tsx");
  assert.ok(t.includes('placement="bottom"') && t.includes("busy={busy}"));
  for (const label of ["Save date", "Skip for now", "Don&apos;t ask again for this bill"]) {
    assert.ok(t.includes(label), label);
  }
  assert.ok(t.includes("min={todayYmd}") && t.includes("Pick today or a later date."));
  for (const prop of ["open", "billName", "todayYmd", "busy", "onCancel", "onSave", "onSkip", "onMute"]) {
    assert.ok(new RegExp("\\b" + prop + "\\b").test(t), prop);
  }
});

test("Category order is a SingleCard and its arrows are type=button", () => {
  const t = read("components/EditCategoryOrderModal.tsx");
  assert.ok(t.includes("<SingleCard") && t.includes('submitLabel="Save order"'));
  assert.equal((t.match(/<IconCircle/g) || []).length, 2);
  assert.equal((t.match(/type="button"/g) || []).length, 2);
  assert.ok(t.includes("Move ${cat} up") && t.includes("Move ${cat} down"));
  assert.ok(!t.includes("useEffect"), "order must reset only when the card opens");
});

test("Report an issue is a StepFlow with Title, Description and a Screenshot extra", () => {
  const t = read("components/BugReportSheet.tsx");
  assert.ok(t.includes("<StepFlow") && t.includes('title="Report an issue"'));
  assert.ok(t.includes('submitLabel="Send report"') && t.includes('successToast="Report sent. Thanks!"'));
  for (const key of ['key: "title"', 'key: "description"', 'key: "screenshot"']) assert.ok(t.includes(key), key);
  assert.ok(t.includes("hasChanges(") && t.includes("DRAFT_STORAGE_KEY"));
  assert.ok(t.includes("DRAFT_RESTORE_WINDOW_MS") && t.includes("clearDraft()"));
  assert.ok(t.includes('"/api/bug-report"'));
  assert.ok(!t.includes("<Dialog"), "old Dialog shell is back");
});

test("the route path, env var and label are unchanged", () => {
  const r = read("app/api/bug-report/route.ts");
  assert.ok(r.includes("GITHUB_BUG_REPORT_TOKEN") && r.includes("'from-app'"));
  assert.ok(!/bug report/i.test(r.replace(/\/\*[\s\S]*?\*\//g, "")), "user-facing 'bug report' text left");
});

test("members read 'issue', not 'Report a bug', anywhere in src", () => {
  const offenders = walk(SRC)
    .filter((f) => !f.endsWith("patch-notes.ts"))
    .filter((f) => /Report a bug/i.test(readFileSync(f, "utf8")))
    .map((f) => relative(SRC, f).split("\\").join("/"));
  assert.deepEqual(offenders, []);
  assert.ok(read("app/settings/settings-client.tsx").includes("Report an issue"));
  assert.ok(read("lib/getting-started.ts").includes("Report an issue"));
});
