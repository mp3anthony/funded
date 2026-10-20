// Source guard for the pop-up shells (R05, #392): Dialog props, the three shells,
// the CSS hooks and the native-confirm ratchet. These are string checks on source
// files; they prove the pieces are wired, not how they behave on a device.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const SRC = fileURLToPath(new URL("..", import.meta.url));
const read = (rel) => readFileSync(join(SRC, rel), "utf8");

function walk(dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) out.push(...walk(full));
    else if (/\.(ts|tsx)$/.test(name) && !/\.test\./.test(name)) out.push(full);
  }
  return out;
}

const FILES = [
  "lib/sheetSave.ts",
  "hooks/useSheetSave.ts",
  "components/ui/Dialog.tsx",
  "components/ui/Field.tsx",
  "components/ui/ConfirmDialog.tsx",
  "components/ui/SingleCard.tsx",
  "components/ui/DetailSheet.tsx",
];

test("shell files exist", () => {
  assert.deepEqual(FILES.filter((rel) => !existsSync(join(SRC, rel))), []);
});

test("Dialog carries the sheet radius and the new props", () => {
  const t = read("components/ui/Dialog.tsx");
  assert.ok(t.includes("rounded-sheet") && !t.includes("rounded-[2px]"));
  for (const needle of [
    "modal-backdrop",
    "createPortal",
    "document.body",
    "CloseCircle",
    "placement",
    "busy",
    'role="alert"',
    "modal-backdrop--bottom",
    "modal-backdrop--confirm",
    "sheet-card-animate",
    "useId",
  ]) {
    assert.ok(t.includes(needle), `Dialog missing ${needle}`);
  }
});

test("shells sit on Dialog and the save hook", () => {
  for (const name of ["ConfirmDialog", "SingleCard", "DetailSheet"]) {
    const t = read(`components/ui/${name}.tsx`);
    assert.ok(t.includes('from "./Dialog"'), `${name} must import ./Dialog`);
  }
  for (const name of ["ConfirmDialog", "SingleCard"]) {
    assert.ok(read(`components/ui/${name}.tsx`).includes("useSheetSave"), `${name} must use useSheetSave`);
  }
  assert.ok(read("components/ui/DetailSheet.tsx").includes("ConfirmDialog"));
  assert.ok(read("components/ui/ConfirmDialog.tsx").includes("keepBusyOnSuccess"));
});

test("globals.css has the placement hooks, sheet animation and keyboard gap", () => {
  const css = read("app/globals.css");
  for (const needle of [
    "modal-backdrop--bottom",
    "modal-backdrop--confirm",
    "sheet-card-in",
    "--keyboard-inset, 0px) + 8px",
  ]) {
    assert.ok(css.includes(needle), `globals.css missing ${needle}`);
  }
  const norm = css.replace(/\r\n/g, "\n");
  const j = norm.indexOf("@media (prefers-reduced-motion: reduce) {\n  .dialog-card-animate");
  assert.ok(j >= 0, "reduced-motion rule for the dialog card missing");
  const block = norm.slice(j, norm.indexOf("\n}\n", j));
  assert.ok(block.includes(".sheet-card-animate"), "reduced-motion rule must name .sheet-card-animate");
});

test("Row has an opt-in tall prop", () => {
  const t = read("components/ui/Row.tsx");
  assert.ok(t.includes("tall?: boolean") && t.includes("min-h-11"));
});

// Native confirm() ratchet: only these files may still call confirm(). Later slices
// delete entries as they move to ConfirmDialog. Checked per file, not per call.
const CONFIRM_ALLOWLIST = new Set([
  "app/payday/payday-client.tsx",
  "components/AvatarUpload.tsx",
  "components/PayHistoryCard.tsx",
  "components/RemoveMemberModal.tsx",
]);

test("no new native confirm() calls (ratchet)", () => {
  const offenders = walk(SRC)
    .filter((f) => /(^|[^\w])confirm\(/.test(readFileSync(f, "utf8")))
    .map((f) => relative(SRC, f).split("\\").join("/"));
  const added = offenders.filter((rel) => !CONFIRM_ALLOWLIST.has(rel));
  assert.deepEqual(added, [], `new confirm() in: ${added.join(", ")} (use ConfirmDialog)`);
  const stale = [...CONFIRM_ALLOWLIST].filter((rel) => !offenders.includes(rel));
  assert.deepEqual(stale, [], `remove from allowlist (now clean): ${stale.join(", ")}`);
});
