// Own-folder guard for avatar deletes (#516).
import { test } from "node:test";
import assert from "node:assert/strict";
import { isOwnAvatarPath } from "./avatarPath.ts";

const me = "11111111-2222-3333-4444-555555555555";
const other = "99999999-8888-7777-6666-555555555555";

test("own avatar path is allowed", () => {
  assert.equal(isOwnAvatarPath(`avatars/${me}/1700000000000.jpg`, me), true);
});

test("another user's folder is refused", () => {
  assert.equal(isOwnAvatarPath(`avatars/${other}/1700000000000.jpg`, me), false);
});

test("legacy member-id folder is refused", () => {
  assert.equal(isOwnAvatarPath("avatars/42/1700000000000.jpg", me), false);
});

test("missing avatars/ prefix is refused", () => {
  assert.equal(isOwnAvatarPath(`${me}/1700000000000.jpg`, me), false);
  assert.equal(isOwnAvatarPath(`screenshots/${me}/1700000000000.jpg`, me), false);
});

test("empty or odd ids and paths are refused", () => {
  assert.equal(isOwnAvatarPath(`avatars//1700000000000.jpg`, ""), false);
  assert.equal(isOwnAvatarPath("", me), false);
  assert.equal(isOwnAvatarPath(`avatars/${me}/`, me), false);
  assert.equal(isOwnAvatarPath(`avatars/${me}/x.jpg`, `${me}/..`), false);
});

test("traversal and nested tricks are refused", () => {
  assert.equal(isOwnAvatarPath(`avatars/${me}/../${other}/a.jpg`, me), false);
  assert.equal(isOwnAvatarPath(`avatars/${me}/..`, me), false);
  assert.equal(isOwnAvatarPath(`avatars/${me}/sub/a.jpg`, me), false);
  assert.equal(isOwnAvatarPath(`avatars/${me}/..\\a.jpg`, me), false);
  assert.equal(isOwnAvatarPath(`avatars/${me}x/a.jpg`, me), false);
});
