/**
 * App display version — single source of truth (per SPEC.md Part A
 * "Versioning discipline"). This used to be a hardcoded string literal at
 * the bottom of the Settings screen; it's now a named export so the patch
 * notes page/popup (Slice 14, #113) can read the same value without a
 * second copy drifting out of sync. `package.json`'s `version` field is
 * unused npm-tooling metadata and is NOT the source of truth.
 *
 * Bump this by +0.0.1 per preview build — confirm the exact number with
 * Anthony before merge (CLAUDE.md §4). Do not bump as a side effect of an
 * unrelated change.
 */
export const APP_VERSION = "0.9.33";
