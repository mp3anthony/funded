// Guard for R34 (#421): the four pre-app screens share AuthScreen and the
// core controls; no square corners, no native buttons or raw inputs.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const SRC = fileURLToPath(new URL("..", import.meta.url));
const read = (rel) => readFileSync(join(SRC, rel), "utf8");
const PAGES = [
  "app/login/page.tsx",
  "app/reset-password/update/page.tsx",
  "app/confirm-email/page.tsx",
  "app/offline/page.tsx",
];

test("every pre-app page renders inside AuthScreen", () => {
  for (const rel of PAGES) assert.ok(read(rel).includes("<AuthScreen"), `${rel} missing AuthScreen`);
});

test("pre-app pages use the shared controls, not raw buttons or inputs", () => {
  for (const rel of PAGES) {
    const t = read(rel);
    assert.ok(!/<input\b/.test(t), `${rel} has a raw <input>`);
    assert.ok(!/rounded-(xl|3xl|\[2px\])/.test(t), `${rel} has an old radius`);
    assert.ok(!t.includes("<Logo"), `${rel} should get the logo from AuthScreen`);
  }
  assert.ok(read("app/login/page.tsx").includes("ui/Input"));
  assert.ok(!/<button[^>]*bg-(primary|secondary)/.test(read("app/reset-password/update/page.tsx")));
});

test("AuthScreen uses Syne title, Card and a labelled show/hide eye", () => {
  const t = read("components/AuthScreen.tsx");
  assert.ok(t.includes("font-heading") && t.includes("<Card"));
  assert.ok(t.includes('"Hide password"') && t.includes('"Show password"'));
  assert.ok(!/blur|backdrop/.test(t));
});
