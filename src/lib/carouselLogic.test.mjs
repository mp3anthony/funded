// Runtime tests for the Carousel maths (R04, #391).
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  CAROUSEL_AUTO_MS,
  wrapIndex,
  snapTargets,
  nearestSlideIndex,
  shouldAutoRotate,
} from "./carousel.ts";

test("interval constant", () => assert.equal(CAROUSEL_AUTO_MS, 6000));

test("wrapIndex", () => {
  assert.equal(wrapIndex(0, 3), 0);
  assert.equal(wrapIndex(3, 3), 0);
  assert.equal(wrapIndex(2, 3), 2);
  assert.equal(wrapIndex(-1, 3), 2);
  assert.equal(wrapIndex(5, 0), 0);
});

test("snapTargets: full-width slides (with 12px gap pitch) land on their own offsets", () => {
  assert.deepEqual(snapTargets([0, 312, 624], [300, 300, 300], 300, 924), [0, 312, 624]);
});

test("snapTargets: peek (86%) centres middle slides and clamps the edges", () => {
  const w = 258;
  const sw = 540 + w;
  const t = snapTargets([0, 270, 540], [w, w, w], 300, sw);
  assert.equal(t[0], 0);
  assert.equal(t[1], 270 - 21);
  assert.equal(t[2], sw - 300);
});

test("snapTargets: single slide", () => {
  assert.deepEqual(snapTargets([0], [300], 300, 300), [0]);
});

test("nearestSlideIndex: exact, midway tie to lower, past end, empty", () => {
  const t = [0, 312, 624];
  assert.equal(nearestSlideIndex(0, t), 0);
  assert.equal(nearestSlideIndex(312, t), 1);
  assert.equal(nearestSlideIndex(156, t), 0);
  assert.equal(nearestSlideIndex(157, t), 1);
  assert.equal(nearestSlideIndex(9999, t), 2);
  assert.equal(nearestSlideIndex(10, []), 0);
});

test("nearestSlideIndex: at-end rule lights the last dot for peek", () => {
  const t = snapTargets([0, 270, 540], [258, 258, 258], 300, 798);
  assert.equal(nearestSlideIndex(498, t), 2);
  assert.equal(nearestSlideIndex(497.5, t), 2);
  assert.equal(nearestSlideIndex(249, t), 1);
});

test("shouldAutoRotate: each blocker alone stops it", () => {
  const ok = { enabled: true, paused: false, hidden: false, interacting: false, count: 3 };
  assert.equal(shouldAutoRotate(ok), true);
  assert.equal(shouldAutoRotate({ ...ok, enabled: false }), false);
  assert.equal(shouldAutoRotate({ ...ok, paused: true }), false);
  assert.equal(shouldAutoRotate({ ...ok, hidden: true }), false);
  assert.equal(shouldAutoRotate({ ...ok, interacting: true }), false);
  assert.equal(shouldAutoRotate({ ...ok, count: 1 }), false);
});
