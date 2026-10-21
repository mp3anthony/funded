// Guard for the R02 (#389) core controls: shared primitives in components/ui,
// the cn() radius-token merge, destructive label contrast, and the square-corner ratchet.
// Reads source files; tailwind-merge is configured the same way as lib/utils.ts.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { extendTailwindMerge } from "tailwind-merge";
import { clsx } from "clsx";

const SRC = fileURLToPath(new URL("..", import.meta.url));

function walk(dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) out.push(...walk(full));
    else if (/\.(ts|tsx|css)$/.test(name) && !/\.test\./.test(name)) out.push(full);
  }
  return out;
}

const read = (rel) => readFileSync(join(SRC, rel), "utf8");
const UI = [
  "Button.tsx",
  "IconCircle.tsx",
  "BackCircle.tsx",
  "CloseCircle.tsx",
  "Chip.tsx",
  "Card.tsx",
  "fieldClasses.ts",
  "Input.tsx",
  "Select.tsx",
  "Textarea.tsx",
].map((n) => `components/ui/${n}`);

test("all core control files exist", () => {
  assert.deepEqual(UI.filter((rel) => !existsSync(join(SRC, rel))), []);
});

test("controls carry their press, shape and size classes", () => {
  for (const rel of ["components/ui/Button.tsx", "components/ui/Chip.tsx", "components/ui/IconCircle.tsx"]) {
    const t = read(rel);
    assert.ok(/\bpress\b/.test(t), `${rel} missing press`);
    assert.ok(t.includes("rounded-full"), `${rel} missing rounded-full`);
  }
  assert.ok(read("components/ui/Button.tsx").includes("min-h-11"));
  const circle = read("components/ui/IconCircle.tsx");
  assert.ok(circle.includes("h-11 w-11") && circle.includes("h-9 w-9"));
  const card = read("components/ui/Card.tsx");
  assert.ok(card.includes("rounded-card") && card.includes("press-tint"));
  assert.ok(read("components/ui/fieldClasses.ts").includes("rounded-input"));
});

test("no hover: classes in components/ui", () => {
  const bad = walk(join(SRC, "components/ui"))
    .filter((f) => /hover:/.test(readFileSync(f, "utf8")))
    .map((f) => relative(SRC, f).split("\\").join("/"));
  assert.deepEqual(bad, []);
});

test("Dialog uses the shared controls and the pressed token exists", () => {
  const dialog = read("components/ui/Dialog.tsx");
  assert.ok(dialog.includes("CloseCircle") && dialog.includes("buttonClasses"));
  const css = read("app/globals.css");
  assert.ok(css.includes("--color-primary-pressed:"));
  assert.ok(css.includes("--color-destructive-pressed:"));
});

test("destructive label colour is defined in dark and in both light blocks", () => {
  const css = read("app/globals.css").replace(/\r\n/g, "\n");
  const block = (start) => {
    const i = css.indexOf(start);
    assert.ok(i >= 0, `missing ${start}`);
    return css.slice(i, css.indexOf("\n}", i));
  };
  assert.ok(/--color-destructive-fg:\s*#000000/.test(block(":root {")));
  assert.ok(/--color-destructive-fg:\s*#000000/.test(block(".dark")));
  assert.ok(/--color-destructive-fg:\s*#ffffff/.test(block(".light,")));
  const mq = css.indexOf("@media (prefers-color-scheme: light)");
  assert.ok(mq >= 0);
  assert.ok(/--color-destructive-fg:\s*#ffffff/.test(css.slice(mq, css.indexOf("\n}\n", mq))));
});

test("cn resolves radius tokens against rounded-full", () => {
  const utils = read("lib/utils.ts");
  assert.ok(utils.includes('radius: ["card", "sheet", "input"]'));
  // Same config as lib/utils.ts (which cannot be imported here).
  const twMerge = extendTailwindMerge({ extend: { theme: { radius: ["card", "sheet", "input"] } } });
  assert.equal(twMerge(clsx("rounded-card rounded-full")), "rounded-full");
  assert.equal(twMerge(clsx("rounded-full rounded-card")), "rounded-card");
});

// Square-corner ratchet: only these files may still contain rounded-[2px].
// Slices delete entries as they restyle a file; R35 empties the list.
const SQUARE_ALLOWLIST = new Set([
    "app/login/page.tsx",
    "app/settings/settings-client.tsx",
    "components/AvatarCropModal.tsx",
    "components/ContributionSettingsSheet.tsx",
    "components/EditMemberModal.tsx",
    "components/EnterPayAmountModal.tsx",
    "components/FinishSetupCard.tsx",
    "components/JoinHouseholdSheet.tsx",
    "components/NotificationCenter.tsx",
    "components/Onboarding.tsx",
    "components/OnboardingStep.tsx",
    "components/PushStatusDialog.tsx",
    "components/RemoveMemberModal.tsx",
    "components/SurplusSuggestionModal.tsx",
    "components/UpdatesCard.tsx",
]);

test("no new square corners (rounded-[2px] ratchet)", () => {
  const offenders = walk(SRC)
    .filter((f) => /rounded-\[2px\]/.test(readFileSync(f, "utf8")))
    .map((f) => relative(SRC, f).split("\\").join("/"));
  const added = offenders.filter((rel) => !SQUARE_ALLOWLIST.has(rel));
  assert.deepEqual(added, [], `new rounded-[2px] in: ${added.join(", ")}`);
  const stale = [...SQUARE_ALLOWLIST].filter((rel) => !offenders.includes(rel));
  assert.deepEqual(stale, [], `remove from allowlist (now clean): ${stale.join(", ")}`);
});
