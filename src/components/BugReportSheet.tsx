"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { CheckCircle2, Loader2, Paperclip, X } from "lucide-react";
import type { Session } from "@supabase/supabase-js";
import Dialog, { DialogButton } from "@/components/ui/Dialog";
import { uploadBugReportScreenshot } from "@/lib/storage";

const MAX_SCREENSHOT_BYTES = 5 * 1024 * 1024; // 5MB, matches the storage bucket's own limit

// sessionStorage key for the in-progress draft (#168). Android/Chrome can
// kill this tab's renderer while the native file-picker is foregrounded for
// "Attach a screenshot", then does a fresh page load on return — wiping all
// in-memory React state. We persist title/description (and the fact the
// sheet was open) as the user types/attaches, and restore + reopen on mount
// so that trip doesn't lose their draft. The screenshot File itself can't be
// serialized, so it's never persisted — see the restore note below.
const DRAFT_STORAGE_KEY = "bugReportDraft";

// A restored draft is only honored if it was written within this many
// milliseconds of being read. Without this, a draft left behind by a normal
// SPA navigation away from Settings (which unmounts this component with no
// synchronous cleanup on an Android renderer kill — see the unmount effect
// below for the *clean* unmount case) would sit in sessionStorage for the
// rest of the tab's lifetime and force-reopen the sheet with stale content
// the next time the user happens to visit Settings, hours later, for an
// unrelated reason. The window needs to be long enough to survive a real
// Android reload-and-relaunch (which can take several seconds) but short
// enough that it never plausibly spans "user wandered off and came back".
// The clock is refreshed whenever the page is hidden/backgrounded and when
// "Attach a screenshot" is tapped (see the effect below), so a slow trip
// through the file picker still lands inside the window.
const DRAFT_RESTORE_WINDOW_MS = 2 * 60 * 1000; // 2 minutes

interface BugReportDraft {
  title: string;
  description: string;
  // Whether a screenshot was attached (or being attached) when saved — only
  // then does the restore note mention the screenshot being lost.
  hadScreenshot: boolean;
  savedAt: number;
}

function readDraft(): BugReportDraft | null {
  try {
    const raw = sessionStorage.getItem(DRAFT_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (typeof parsed?.title !== "string" || typeof parsed?.description !== "string" || typeof parsed?.savedAt !== "number") {
      return null;
    }
    if (Date.now() - parsed.savedAt > DRAFT_RESTORE_WINDOW_MS) {
      // Stale — belongs to a much earlier visit, not a just-happened reload.
      return null;
    }
    return {
      title: parsed.title,
      description: parsed.description,
      hadScreenshot: parsed.hadScreenshot === true,
      savedAt: parsed.savedAt,
    };
  } catch {
    // sessionStorage unavailable (private browsing, blocked storage, etc.) —
    // fail silently, same as the app's other storage reads.
    return null;
  }
}

function writeDraft(draft: Omit<BugReportDraft, "savedAt">) {
  try {
    sessionStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify({ ...draft, savedAt: Date.now() }));
  } catch {
    // Storage unavailable — draft persistence is best-effort only.
  }
}

function clearDraft() {
  try {
    sessionStorage.removeItem(DRAFT_STORAGE_KEY);
  } catch {
    // Storage unavailable — nothing to clear.
  }
}

interface BugReportSheetProps {
  isOpen: boolean;
  onClose: () => void;
  session: Session | null;
}

/**
 * In-app bug report form (Slice 15, #114). Title + description required,
 * screenshot optional. Submission uploads the screenshot (if any) straight to
 * Supabase Storage client-side (same pattern as AvatarUpload), then posts to
 * /api/bug-report, which files a real GitHub issue server-side using a token
 * that never reaches this component.
 */
export default function BugReportSheet({ isOpen, onClose, session }: BugReportSheetProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [screenshotFile, setScreenshotFile] = useState<File | null>(null);
  const [screenshotPreviewUrl, setScreenshotPreviewUrl] = useState<string | null>(null);
  const [screenshotError, setScreenshotError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const lastLoggedDescriptionLengthRef = useRef(0);
  // Latest draft contents, for the page-hide/attach saves below (which run
  // outside React's render cycle and need current values).
  const draftRef = useRef<Omit<BugReportDraft, "savedAt">>({ title: "", description: "", hadScreenshot: false });
  // Mirrors a successful submit synchronously, so a page-hide save that fires
  // before React re-renders (and tears the listeners down) can't re-save it.
  const submittedRef = useRef(false);

  // Restored-draft state (#168) — set once on mount if a saved draft is
  // found. `restoredOpen` forces the sheet open even though the parent's own
  // `isOpen` state also got wiped by the reload; `showRestoreNote`
  // tells the user their draft came back (and, if they'd attached one, that
  // the screenshot didn't survive).
  const [restoredOpen, setRestoredOpen] = useState(false);
  const [showRestoreNote, setShowRestoreNote] = useState(false);
  const [restoredHadScreenshot, setRestoredHadScreenshot] = useState(false);

  const effectiveOpen = isOpen || restoredOpen;

  // On mount: restore a saved draft, if any, and reopen the sheet.
  useEffect(() => {
    const draft = readDraft();
    if (!draft) return;
    // Keep the "had a screenshot" flag, so a second reload before the user
    // re-attaches still shows the re-attach note.
    draftRef.current = { title: draft.title, description: draft.description, hadScreenshot: draft.hadScreenshot };
    // Mount-only restore.
    // eslint-disable-next-line react-hooks/set-state-in-effect -- restore draft after hydration; sessionStorage is client-only
    setTitle(draft.title);
    setDescription(draft.description);
    setRestoredOpen(true);
    setShowRestoreNote(true);
    setRestoredHadScreenshot(draft.hadScreenshot);
  }, []);

  // Persist the draft (title, description, and the fact the sheet is open)
  // as the user types/interacts, so an Android renderer kill mid-picker
  // doesn't lose it. Only while the sheet is actually open.
  useEffect(() => {
    draftRef.current = { ...draftRef.current, title, description };
    if (!effectiveOpen || isSubmitted) return;
    writeDraft(draftRef.current);
  }, [effectiveOpen, title, description, isSubmitted]);

  // Re-save with a fresh timestamp when the page is hidden/backgrounded
  // (e.g. the native file picker takes over), so the restore window is
  // measured from when the user left — not from their last keystroke.
  useEffect(() => {
    if (!effectiveOpen || isSubmitted) return;
    const saveNow = () => {
      if (submittedRef.current) return;
      writeDraft(draftRef.current);
    };
    const onVisibilityChange = () => {
      if (document.visibilityState === "hidden") saveNow();
    };
    document.addEventListener("visibilitychange", onVisibilityChange);
    window.addEventListener("pagehide", saveNow);
    return () => {
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener("pagehide", saveNow);
    };
  }, [effectiveOpen, isSubmitted]);

  const setDraftHadScreenshot = useCallback((hadScreenshot: boolean) => {
    if (submittedRef.current) return;
    draftRef.current = { ...draftRef.current, hadScreenshot };
    writeDraft(draftRef.current);
  }, []);

  // "Attach a screenshot" tapped — save right before the picker opens (the
  // Android kill happens while the picker is up, before a file is accepted).
  function handleAttachClick() {
    setDraftHadScreenshot(true);
  }

  // Picker dismissed without choosing a file — undo the flag set on tap. The
  // file input only renders when no screenshot is attached, so there's no
  // attached screenshot to preserve here. React doesn't wire `onCancel` for
  // <input>, so listen natively (browsers without the event just skip this).
  const fileInputRef = useCallback(
    (input: HTMLInputElement | null) => {
      if (!input) return;
      const onCancel = () => setDraftHadScreenshot(false);
      input.addEventListener("cancel", onCancel);
      return () => input.removeEventListener("cancel", onCancel);
    },
    [setDraftHadScreenshot],
  );

  // Clear the draft on unmount (#168 follow-up). BugReportSheet only lives
  // inside the Settings page, so a normal in-app SPA navigation away from
  // Settings unmounts this component cleanly and runs this cleanup — closing
  // the gap where a leftover draft could force-reopen the sheet on some
  // later, unrelated visit to Settings. This is a no-op for the Android
  // renderer-kill case the feature exists for, since that kill doesn't run
  // React cleanup effects at all — the DRAFT_RESTORE_WINDOW_MS staleness
  // check above is what protects that path.
  useEffect(() => {
    return () => {
      clearDraft();
    };
  }, []);

  function resetAndClose() {
    setTitle("");
    setDescription("");
    setScreenshotFile(null);
    setScreenshotPreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
    setScreenshotError(null);
    setSubmitError(null);
    setIsSubmitted(false);
    setIsSubmitting(false);
    lastLoggedDescriptionLengthRef.current = 0;
    draftRef.current = { title: "", description: "", hadScreenshot: false };
    submittedRef.current = false;
    setRestoredOpen(false);
    setShowRestoreNote(false);
    setRestoredHadScreenshot(false);
    clearDraft();
    onClose();
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    const validTypes = [
      "image/jpeg",
      "image/png",
      "image/webp",
      "image/heic",
      "image/heif",
      "image/gif",
    ];
    // Rejected files leave nothing attached (the input only renders when no
    // screenshot is attached), so clear the flag set when Attach was tapped.
    if (!validTypes.includes(file.type)) {
      setScreenshotError("Invalid file type. Only JPEG, PNG, WebP, HEIC/HEIF, and GIF are allowed.");
      setDraftHadScreenshot(false);
      return;
    }
    if (file.size > MAX_SCREENSHOT_BYTES) {
      setScreenshotError("That screenshot is too large. Please choose one under 5MB.");
      setDraftHadScreenshot(false);
      return;
    }

    setScreenshotError(null);
    setScreenshotFile(file);
    setScreenshotPreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return URL.createObjectURL(file);
    });
    setShowRestoreNote(false);
    setDraftHadScreenshot(true);
  }

  function handleDescriptionChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    const value = e.target.value;
    setDescription(value);

    // Diagnostic breadcrumb for #142 ("description field stops accepting
    // input after a certain length") — investigation couldn't reproduce a
    // freeze, so this just captures evidence for if it recurs in
    // production. Logs at 100-char boundaries crossed, not every keystroke,
    // to stay non-intrusive.
    const length = value.length;
    if (Math.floor(length / 100) !== Math.floor(lastLoggedDescriptionLengthRef.current / 100)) {
      console.log(`[BugReportSheet] description length=${length} at ${new Date().toISOString()}`);
    }
    lastLoggedDescriptionLengthRef.current = length;
  }

  function removeScreenshot() {
    setScreenshotFile(null);
    setScreenshotPreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
    setScreenshotError(null);
    setDraftHadScreenshot(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !description.trim() || isSubmitting) return;

    if (!session?.access_token) {
      setSubmitError("You need to be signed in to report a bug.");
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      let screenshotUrl: string | undefined;
      if (screenshotFile) {
        try {
          screenshotUrl = await uploadBugReportScreenshot(session.user.id, screenshotFile);
        } catch (uploadErr: unknown) {
          const message = uploadErr instanceof Error ? uploadErr.message : "unknown error";
          throw new Error(`Failed to upload screenshot: ${message}. Nothing was submitted.`);
        }
      }

      const response = await fetch("/api/bug-report", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim(),
          screenshotUrl,
        }),
      });

      const result = await response.json().catch(() => null);
      if (!response.ok || !result?.success) {
        throw new Error(result?.error || `Failed to submit bug report (status ${response.status}).`);
      }

      submittedRef.current = true;
      draftRef.current = { title: "", description: "", hadScreenshot: false };
      setIsSubmitted(true);
      clearDraft();
    } catch (err: unknown) {
      console.error("Bug report submission failed:", err);
      const message = err instanceof Error ? err.message : "Something went wrong submitting your report. Please try again.";
      setSubmitError(message);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog
      open={effectiveOpen}
      onClose={resetAndClose}
      title="Report a Bug"
      footer={
        isSubmitted ? (
          <DialogButton variant="primary" onClick={resetAndClose} className="w-full">
            Done
          </DialogButton>
        ) : (
          <>
            <DialogButton variant="ghost" onClick={resetAndClose} disabled={isSubmitting}>
              Cancel
            </DialogButton>
            <DialogButton
              type="submit"
              form="bug-report-form"
              variant="primary"
              disabled={isSubmitting || !title.trim() || !description.trim()}
            >
              {isSubmitting ? "Submitting…" : "Submit Report"}
            </DialogButton>
          </>
        )
      }
    >
      {isSubmitted ? (
        <div className="flex flex-col items-center text-center gap-3 py-6">
          <CheckCircle2 className="h-12 w-12 text-primary" />
          <p className="text-sm font-semibold text-foreground">Thanks — your bug report was submitted.</p>
          <p className="text-xs text-muted">We&apos;ll take a look.</p>
        </div>
      ) : (
        <form id="bug-report-form" onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label htmlFor="bug-title" className="text-[10px] font-bold text-subtle uppercase tracking-wider font-mono">
              Title
            </label>
            <input
              id="bug-title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Short summary of the problem"
              maxLength={150}
              required
              disabled={isSubmitting}
              className="w-full px-3 py-2.5 bg-surface-elevated border border-border rounded-[2px] text-sm text-foreground placeholder:text-subtle focus:outline-none focus:border-primary disabled:opacity-50"
            />
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label htmlFor="bug-description" className="text-[10px] font-bold text-subtle uppercase tracking-wider font-mono">
                Description
              </label>
              <span className="text-[10px] text-subtle font-mono tabular-nums">
                {description.length.toLocaleString()}
              </span>
            </div>
            <textarea
              id="bug-description"
              value={description}
              onChange={handleDescriptionChange}
              placeholder="What happened? What did you expect instead? Steps to reproduce help a lot."
              rows={5}
              required
              disabled={isSubmitting}
              className="w-full px-3 py-2.5 bg-surface-elevated border border-border rounded-[2px] text-sm text-foreground placeholder:text-subtle focus:outline-none focus:border-primary disabled:opacity-50 resize-none"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-subtle uppercase tracking-wider font-mono">
              Screenshot <span className="normal-case font-normal text-subtle/70">(optional)</span>
            </label>

            {screenshotPreviewUrl ? (
              <div className="relative inline-block">
                <img
                  src={screenshotPreviewUrl}
                  alt="Screenshot preview"
                  className="h-24 w-auto rounded-[2px] border border-border object-cover"
                />
                <button
                  type="button"
                  onClick={removeScreenshot}
                  disabled={isSubmitting}
                  aria-label="Remove screenshot"
                  className="absolute -top-2 -right-2 h-6 w-6 rounded-full bg-destructive text-destructive-fg flex items-center justify-center shadow-md disabled:opacity-50"
                >
                  <X size={14} />
                </button>
              </div>
            ) : (
              <label
                className={`flex items-center gap-1.5 px-3 py-2 bg-white/5 border border-border text-muted hover:text-foreground hover:bg-surface-raised text-xs font-semibold rounded-[2px] transition-colors w-fit ${
                  isSubmitting ? "opacity-50 pointer-events-none" : "cursor-pointer"
                }`}
              >
                <input
                  type="file"
                  onChange={handleFileChange}
                  onClick={handleAttachClick}
                  ref={fileInputRef}
                  accept="image/jpeg,image/png,image/webp,image/heic,image/heif,image/gif"
                  className="sr-only"
                  disabled={isSubmitting}
                />
                <Paperclip size={14} />
                Attach a screenshot
              </label>
            )}

            {screenshotError && (
              <div className="bg-destructive/10 border border-destructive/50 rounded-[2px] p-3 text-destructive text-xs font-mono break-words whitespace-pre-wrap">
                <span className="font-bold">Screenshot not attached:</span>
                <br />
                {screenshotError}
              </div>
            )}

            {showRestoreNote && !screenshotPreviewUrl && (
              <div className="bg-white/5 border border-border rounded-[2px] p-3 text-muted text-xs font-mono break-words whitespace-pre-wrap">
                {restoredHadScreenshot ? (
                  <>
                    <span className="font-bold text-foreground">We restored your draft,</span> but your
                    screenshot couldn&apos;t be — please re-attach it if you still want it included.
                  </>
                ) : (
                  <span className="font-bold text-foreground">We restored your draft.</span>
                )}
              </div>
            )}
          </div>

          {isSubmitting && (
            <div className="flex items-center gap-2 text-xs text-muted">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Submitting your report…
            </div>
          )}

          {submitError && (
            <div className="bg-destructive/10 border border-destructive/50 rounded-[2px] p-3 text-destructive text-xs font-mono break-words whitespace-pre-wrap">
              <span className="font-bold">Failed to submit report:</span>
              <br />
              {submitError}
            </div>
          )}
        </form>
      )}
    </Dialog>
  );
}
