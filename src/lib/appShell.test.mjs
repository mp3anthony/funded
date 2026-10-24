// Guard for the R03 (#390) app shell: floating bottom nav, shared page header,
// --nav-clearance token. Reads source files.
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
    else if (/\.(ts|tsx|css)$/.test(name) && !/\.test\./.test(name)) out.push(full);
  }
  return out;
}
const all = walk(SRC).map((f) => ({ rel: relative(SRC, f).replace(/\\/g, "/"), text: readFileSync(f, "utf8") }));

test("BottomNav is a solid floating pill driven by NAV_SLOTS", () => {
  const nav = read("components/BottomNav.tsx");
  for (const needle of [
    "NAV_SLOTS",
    "aria-current",
    "ring-primary",
    "rounded-full",
    "motion-reduce:transition-none",
    "var(--nav-bottom)",
    "max-w-[480px]",
    "bg-surface-elevated",
  ]) {
    assert.ok(nav.includes(needle), `BottomNav missing ${needle}`);
  }
  assert.ok(!/hover:/.test(nav), "no hover: in BottomNav");
  assert.ok(!/backdrop-blur/.test(nav), "no backdrop blur in BottomNav");
});

test("BottomNav fades out while the keyboard is open, and the hook re-syncs", () => {
  assert.ok(read("components/BottomNav.tsx").includes("useKeyboardOpen"));
  const hook = read("hooks/useKeyboardOpen.ts");
  for (const needle of ["focusin", "focusout", "requestAnimationFrame", "document.activeElement", "pointerdown", "visibilitychange", "usePathname", "isContentEditable"]) {
    assert.ok(hook.includes(needle), `useKeyboardOpen missing ${needle}`);
  }
});

test("globals.css defines the nav tokens and no floating-avatar", () => {
  const css = read("app/globals.css");
  for (const t of ["--nav-height:", "--nav-bottom:", "--nav-clearance:"]) {
    assert.ok(css.includes(t), `missing ${t}`);
  }
  assert.ok(!css.includes("floating-avatar"));
});

test("no hard-coded 5rem nav offsets", () => {
  const bad = all.filter((f) => f.text.includes("calc(5rem")).map((f) => f.rel);
  assert.deepEqual(bad, []);
});

test("docked surfaces clear the nav through the token", () => {
  for (const rel of ["components/ui/Toast.tsx", "components/UpdatesCard.tsx", "components/AppShell.tsx"]) {
    assert.ok(read(rel).includes("--nav-clearance"), `${rel} missing --nav-clearance`);
  }
});

test("the avatar menu is gone", () => {
  assert.ok(!existsSync(join(SRC, "components/AvatarDropdown.tsx")));
  assert.ok(!existsSync(join(SRC, "components/UserProfileMenu.tsx")));
  const bad = all.filter((f) => /AvatarDropdown|UserProfileMenu/.test(f.text)).map((f) => f.rel);
  assert.deepEqual(bad, []);
});

test("PageHeader is the shared header", () => {
  const header = read("components/PageHeader.tsx");
  assert.ok(header.includes("IconCircle"));
  assert.ok(header.includes("HeaderActions"));
  assert.ok(!/\baction\b\??:/.test(header), "no action prop");
  assert.ok(!header.includes("Logo"));
  assert.ok(!/hover:/.test(header));
  assert.ok(!/hover:/.test(read("components/HeaderActions.tsx")));
});

test("add buttons go through PageHeader onAdd", () => {
  for (const rel of ["app/bills/bills-client.tsx", "app/funds/funds-client.tsx", "app/payday/payday-client.tsx"]) {
    assert.ok(read(rel).includes("onAdd="), `${rel} missing onAdd=`);
    assert.ok(!/<PageHeader[^>]*action=/s.test(read(rel)));
  }
});

test("Settings is a drill-down with an interim Log out row", () => {
  const s = read("app/settings/settings-client.tsx");
  assert.ok(s.includes("Log out"));
  assert.ok(s.includes("signOut"));
  assert.ok(s.includes("onBack"));
  assert.ok(read("app/patch-notes/patch-notes-client.tsx").includes("onBack"));
});
