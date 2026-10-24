// Source guard for the step-flow pop-up (R06, #393). These are string checks on
// source files; they prove the pieces are wired, NOT how anything behaves on a
// device (slide, keyboard focus, Return key). Behaviour is checked on iPhone in R07.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const SRC = fileURLToPath(new URL("..", import.meta.url));
const read = (rel) => readFileSync(join(SRC, rel), "utf8").replace(/\r\n/g, "\n");
const stripComments = (t) => t.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");

const FILES = [
  "lib/stepFlow.ts",
  "components/ui/StepFlow.tsx",
  "components/ui/ChoiceField.tsx",
  "components/ui/NotesToggle.tsx",
];

test("step-flow files exist", () => {
  assert.deepEqual(FILES.filter((rel) => !existsSync(join(SRC, rel))), []);
});

test("StepFlow sits on Dialog, the save hook and the shared controls", () => {
  const t = read("components/ui/StepFlow.tsx");
  for (const needle of [
    'from "./Dialog"',
    'placement="bottom"',
    "busy=",
    "ConfirmDialog",
    "useSheetSave",
    "BackCircle",
    "CloseCircle",
    "flushSync",
    "useLayoutEffect",
    "step-card-forward",
    "step-card-back",
    "primaryPillLabel",
    'from "@/lib/stepFlow"',
  ]) {
    assert.ok(t.includes(needle), `StepFlow missing ${needle}`);
  }
});

test("StepFlow has no useEffect (state is reset during render)", () => {
  const code = stripComments(read("components/ui/StepFlow.tsx"));
  assert.ok(!/\buseEffect\(/.test(code), "StepFlow must not call useEffect");
});

test("only the Next / summary pill submits; the card focus target has no outline", () => {
  const code = stripComments(read("components/ui/StepFlow.tsx"));
  const submits = code.match(/type="submit"/g) ?? [];
  assert.equal(submits.length, 2, "one submit pill on the summary, one on step cards");
  assert.ok(/<Button\s+variant="ghost"/.test(code), "Skip pill is a ghost button");
  assert.ok(!/variant="ghost"[^>]*type="submit"/.test(code), "Skip must not submit");
  assert.ok(code.includes("tabIndex={-1}") && code.includes("outline-none"));
});

test("edit and go ignore taps while saving", () => {
  const code = stripComments(read("components/ui/StepFlow.tsx"));
  assert.ok(/const go = \(next: Nav\) => \{\s*if \(saving\) return;/.test(code));
  assert.ok(/const edit = \(key: string\) => \{\s*if \(saving\) return;/.test(code));
  assert.ok(code.includes("advanceTarget"));
});

test("ChoiceField and NotesToggle use the core controls", () => {
  const choice = read("components/ui/ChoiceField.tsx");
  assert.ok(choice.includes('from "./Field"') && choice.includes('from "./Select"'));
  assert.ok(choice.includes("choiceDescription"));
  const notes = read("components/ui/NotesToggle.tsx");
  for (const needle of ["IconCircle", "Textarea", "aria-expanded", "aria-controls"]) {
    assert.ok(notes.includes(needle), `NotesToggle missing ${needle}`);
  }
});

test("globals.css has the card slide keyframes and a reduced-motion fade", () => {
  const css = read("app/globals.css");
  for (const needle of [
    "@keyframes step-card-in-forward",
    "@keyframes step-card-in-back",
    ".step-card-forward {",
    ".step-card-back {",
  ]) {
    assert.ok(css.includes(needle), `globals.css missing ${needle}`);
  }
  const j = css.indexOf("@media (prefers-reduced-motion: reduce) {\n  .dialog-card-animate");
  assert.ok(j >= 0, "reduced-motion block for the dialog card missing");
  const block = css.slice(j, css.indexOf("\n}\n", j));
  assert.ok(block.includes(".step-card-forward") && block.includes(".step-card-back"));
  assert.ok(block.includes("ease-in-out"), "reduced-motion fade must be ease-in-out");
});
