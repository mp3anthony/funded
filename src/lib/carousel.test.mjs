// Source guard for the shared Carousel (R04, #391).
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";
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

test("Carousel is a client component with the required pieces", () => {
  const src = read("components/ui/Carousel.tsx");
  assert.ok(src.startsWith('"use client"'));
  for (const needle of [
    "snap-x",
    "snap-mandatory",
    "scrollbar-none",
    "useReducedMotion",
    "aria-roledescription",
    "visibilitychange",
    "motion-reduce:transition-none",
    "CAROUSEL_AUTO_MS",
  ]) {
    assert.ok(src.includes(needle), `missing ${needle}`);
  }
});

test("Carousel has no hover styles and no setInterval", () => {
  const src = read("components/ui/Carousel.tsx");
  assert.ok(!src.includes("hover:"));
  assert.ok(!src.includes("setInterval"));
});

test("globals.css defines the scrollbar-none utility", () => {
  assert.match(read("app/globals.css"), /@utility scrollbar-none/);
});

test("no other file hand-rolls a snap-x scroller", () => {
  const allowed = ["components/ui/Carousel.tsx"];
  const offenders = walk(SRC)
    .map((f) => relative(SRC, f).split(sep).join("/"))
    .filter((rel) => !allowed.includes(rel))
    .filter((rel) => readFileSync(join(SRC, rel), "utf8").includes("snap-x"));
  assert.deepEqual(offenders, []);
});
