// Guard for the R01 (#388) design tokens: fonts, radii and motion.
// Reads source files only; no imports from the app.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";

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

const files = walk(SRC).map((full) => ({
  rel: relative(SRC, full).split("\\").join("/"),
  text: readFileSync(full, "utf8"),
}));

function offenders(pattern) {
  return files.filter((f) => pattern.test(f.text)).map((f) => f.rel);
}

test("no monospace font left", () => {
  assert.deepEqual(offenders(/font-mono|JetBrains/), []);
});

test("old motion tokens are gone", () => {
  assert.deepEqual(offenders(/--ease-standard|--duration-(fast|base|slow)\b/), []);
});

test("no lime hover fills (press feedback uses :active)", () => {
  assert.deepEqual(offenders(/(hover|focus|group-hover):bg-(primary|secondary)/), []);
});

test("Syne (font-heading) is only used on page headers", () => {
  const allowed = new Set([
    "components/PageHeader.tsx",
    "components/OnboardingWelcome.tsx",
    "app/login/page.tsx",
    "app/confirm-email/page.tsx",
    "app/reset-password/update/page.tsx",
    "app/offline/page.tsx",
    "app/getting-started/getting-started-client.tsx",
    "app/globals.css",
    "app/layout.tsx",
  ]);
  const bad = offenders(/font-heading/).filter((rel) => !allowed.has(rel));
  assert.deepEqual(bad, []);
});

test("globals.css defines the new tokens and no forced 2px radius", () => {
  const css = files.find((f) => f.rel === "app/globals.css").text;
  for (const token of [
    "--radius-card",
    "--radius-sheet",
    "--radius-input",
    "--duration-quick",
    "--duration-feedback",
    "--duration-structural",
    "--ease-enter",
    "--ease-exit",
  ]) {
    assert.ok(css.includes(token + ":"), `missing ${token}`);
  }
  assert.ok(!/border-radius:\s*2px\s*!important/.test(css));
});
