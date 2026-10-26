// Guard for F11 (#475): the Home Screen icon is embedded as a data URI and
// the temporary diagnostic pages are gone. Reads source files only.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("../..", import.meta.url));

test("layout embeds apple-touch-icon as a data URI", () => {
  const src = readFileSync(`${ROOT}src/app/layout.tsx`, "utf8");
  assert.match(src, /data:image\/png;base64,/);
  assert.match(src, /apple-touch-icon\.png/);
  assert.match(src, /url: APPLE_TOUCH_ICON/);
  assert.match(src, /sizes: "180x180"/);
  assert.ok(!src.includes('url: "/apple-touch-icon.png"'));
});

test("public apple-touch-icon.png stays and diagnostics are removed", () => {
  assert.ok(existsSync(`${ROOT}public/apple-touch-icon.png`));
  for (const f of ["icon-test-a.html", "icon-test-b.html", "icon-test-c.html", "icon-test-d.html", "icon-test-c.png"]) {
    assert.ok(!existsSync(`${ROOT}public/${f}`), f);
  }
});
