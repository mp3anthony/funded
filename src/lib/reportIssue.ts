// Pure rules for the Report an issue flow, R12 (#399, folds #261).
// Plain TS (no imports, no enums, no parameter properties) so node can run the tests on it.

export const TITLE_MAX_LENGTH = 150;
export const SCREENSHOT_MAX_BYTES = 5 * 1024 * 1024; // matches the storage bucket's own limit

export const SCREENSHOT_TYPES: string[] = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
  "image/gif",
];

export const SCREENSHOT_TYPE_ERROR =
  "Invalid file type. Only JPEG, PNG, WebP, HEIC/HEIF, and GIF are allowed.";
export const SCREENSHOT_SIZE_ERROR = "That screenshot is too large. Please choose one under 5MB.";

/** Muted line under the Description question. */
export const DESCRIPTION_INTRO =
  "An issue can be a bug, something that looks wrong, an idea, or just something confusing.";

export interface IssueValues {
  title: string;
  description: string;
}

export function initialValues(): IssueValues {
  return { title: "", description: "" };
}

/** Title is required (blank or spaces only do not count). */
export function titleOk(title: string): boolean {
  return title.trim() !== "";
}

/** Description is required (blank or spaces only do not count). */
export function descriptionOk(description: string): boolean {
  return description.trim() !== "";
}

/** Both required fields are filled in. */
export function canSend(values: IssueValues): boolean {
  return titleOk(values.title) && descriptionOk(values.description);
}

/** What goes to the server: both fields trimmed. */
export function buildIssuePayload(values: IssueValues): IssueValues {
  return { title: values.title.trim(), description: values.description.trim() };
}

/** The error line for a rejected screenshot, or null when it is fine to attach. */
export function screenshotError(file: { type: string; size: number }): string | null {
  if (!SCREENSHOT_TYPES.includes(file.type)) return SCREENSHOT_TYPE_ERROR;
  if (file.size > SCREENSHOT_MAX_BYTES) return SCREENSHOT_SIZE_ERROR;
  return null;
}
