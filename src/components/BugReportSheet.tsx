"use client";

import { useState, useRef, useEffect, useCallback, useId } from "react";
import { Paperclip, X } from "lucide-react";
import type { Session } from "@supabase/supabase-js";
import { buttonClasses } from "@/components/ui/Button";
import Field from "@/components/ui/Field";
import Input from "@/components/ui/Input";
import Row from "@/components/ui/Row";
import SectionHeader from "@/components/ui/SectionHeader";
import StepFlow, { type FlowStep } from "@/components/ui/StepFlow";
import Textarea from "@/components/ui/Textarea";
import { uploadBugReportScreenshot } from "@/lib/storage";
import { hasChanges } from "@/lib/stepFlow";
import {
  DESCRIPTION_INTRO,
  SCREENSHOT_TYPES,
  TITLE_MAX_LENGTH,
  buildIssuePayload,
  canSend,
  descriptionOk,
  screenshotError as screenshotRuleError,
  titleOk,
} from "@/lib/reportIssue";

// sessionStorage key for the in-progress draft (#168). Android/Chrome can
// kill this tab's renderer while the native file-picker is foregrounded for
// "Attach a screenshot", then does a fresh page load on return — wiping all
// in-memory React state. We persist title/description (and the fact the
// sheet was open) as the user types/attaches, and restore + reopen on mount
// so that trip doesn't lose their draft. The screenshot File itself can't be
// serialized, so it's never persisted — see the restore note below.
// (Key name kept from before the "issue" wording change, #261.)
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

interface IssueDraft {
  title: string;
  description: string;
  // Whether a screenshot was attached (or being attached) when saved — only
  // then does the restore note mention the screenshot being lost.
  hadScreenshot: boolean;
  savedAt: number;
}

function readDraft(): IssueDraft | null {
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

function writeDraft(draft: Omit<IssueDraft, "savedAt">) {
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
 * In-app "Report an issue" flow (Slice 15, #114; R12 #399 rebuilt it as a
 * StepFlow and renamed "bug" to "issue", #261). Title, then Description (both
 * required), then a summary with an optional Screenshot row. Submission
 * uploads the screenshot (if any) straight to Supabase Storage client-side
 * (same pattern as AvatarUpload), then posts to /api/bug-report, which files a
 * real GitHub issue server-side using a token that never reaches this
 * component. The file and route keep their old names on purpose.
 *
 * A failed send shows StepFlow's shared red line with "Try again"; nothing
 * typed is lost. Rules live in `lib/reportIssue.ts`.
 */
export default function BugReportSheet({ isOpen, onClose, session }: BugReportSheetProps) {
  const uid = useId();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [screenshotFile, setScreenshotFile] = useState<File | null>(null);
  const [screenshotPreviewUrl, setScreenshotPreviewUrl] = useState<string | null>(null);
  const [screenshotError, setScreenshotError] = useState<string | null>(null);
  const lastLoggedDescriptionLengthRef = useRef(0);
  // Latest draft contents, for the page-hide/attach saves below (which run
  // outside React's render cycle and need current values).
  const draftRef = useRef<Omit<IssueDraft, "savedAt">>({ title: "", description: "", hadScreenshot: false });
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
    if (!effectiveOpen || submittedRef.current) return;
    writeDraft(draftRef.current);
  }, [effectiveOpen, title, description]);

  // Re-save with a fresh timestamp when the page is hidden/backgrounded
  // (e.g. the native file picker takes over), so the restore window is
  // measured from when the user left — not from their last keystroke.
  useEffect(() => {
    if (!effectiveOpen) return;
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
  }, [effectiveOpen]);

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

  // Close (cancel, discard, or after a successful send): wipe everything.
  function resetAndClose() {
    setTitle("");
    setDescription("");
    setScreenshotFile(null);
    setScreenshotPreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
    setScreenshotError(null);
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

    // Rejected files leave nothing attached (the input only renders when no
    // screenshot is attached), so clear the flag set when Attach was tapped.
    const rejection = screenshotRuleError(file);
    if (rejection) {
      setScreenshotError(rejection);
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

  // Throws on any failure so StepFlow shows its shared red line + "Try again".
  async function handleSubmit() {
    if (!canSend({ title, description })) return;

    if (!session?.access_token) {
      throw new Error("You need to be signed in to report an issue.");
    }

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
          ...buildIssuePayload({ title, description }),
          screenshotUrl,
        }),
      });

      const result = await response.json().catch(() => null);
      if (!response.ok || !result?.success) {
        throw new Error(result?.error || `Failed to submit issue report (status ${response.status}).`);
      }

      submittedRef.current = true;
      draftRef.current = { title: "", description: "", hadScreenshot: false };
      clearDraft();
    } catch (err: unknown) {
      console.error("Issue report submission failed:", err);
      throw err;
    }
  }

  const titleId = `${uid}-title`;
  const descId = `${uid}-description`;
  const shotId = `${uid}-screenshot`;

  const titleStep: FlowStep = {
    key: "title",
    valid: titleOk(title),
    content: (
      <>
        {showRestoreNote && !screenshotPreviewUrl && (
          <div className="break-words whitespace-pre-wrap rounded-card border border-border bg-surface-raised p-3 text-xs text-muted">
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
        <Field id={titleId} label="What's it about?" question>
          <Input
            id={titleId}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="A short summary"
            maxLength={TITLE_MAX_LENGTH}
            enterKeyHint="next"
            autoComplete="off"
          />
        </Field>
      </>
    ),
  };

  const descriptionStep: FlowStep = {
    key: "description",
    valid: descriptionOk(description),
    content: (
      <Field
        id={descId}
        label="Tell us more"
        question
        description={
          <>
            {DESCRIPTION_INTRO} Say what happened and what you expected instead.{" "}
            <span className="tabular-nums">{description.length.toLocaleString()} characters</span>
          </>
        }
      >
        <Textarea
          id={descId}
          value={description}
          onChange={handleDescriptionChange}
          placeholder="What happened? What did you expect instead? Steps to reproduce help a lot."
          rows={5}
          aria-describedby={`${descId}-desc`}
        />
      </Field>
    ),
  };

  const extras: FlowStep[] = [
    {
      key: "screenshot",
      autoFocus: false,
      content: (
        <Field
          id={shotId}
          label="Add a screenshot?"
          question
          description="Optional. JPEG, PNG, WebP, HEIC or GIF, under 5MB."
        >
          {screenshotPreviewUrl ? (
            <div className="relative inline-block self-start">
              {/* eslint-disable-next-line @next/next/no-img-element -- local blob preview */}
              <img
                src={screenshotPreviewUrl}
                alt="Screenshot preview"
                className="h-24 w-auto rounded-card border border-border object-cover"
              />
              <button
                type="button"
                onClick={removeScreenshot}
                aria-label="Remove screenshot"
                className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-destructive text-destructive-fg shadow-md"
              >
                <X size={14} />
              </button>
            </div>
          ) : (
            <label className={`${buttonClasses({ variant: "ghost" })} w-fit self-start`}>
              <input
                id={shotId}
                type="file"
                onChange={handleFileChange}
                onClick={handleAttachClick}
                ref={fileInputRef}
                accept={SCREENSHOT_TYPES.join(",")}
                className="sr-only"
              />
              <Paperclip size={16} />
              Attach a screenshot
            </label>
          )}
          {screenshotError && (
            <p role="alert" className="break-words text-sm text-destructive-ink">
              Screenshot not attached: {screenshotError}
            </p>
          )}
        </Field>
      ),
    },
  ];

  const summary = ({ edit }: { edit: (key: string) => void }) => (
    <>
      <div className="flex flex-col">
        <Row tall chevron label="Title" onClick={() => edit("title")}>
          <span className="max-w-[55vw] truncate text-[13px] text-muted">{title.trim() || "—"}</span>
        </Row>
        <Row tall chevron label="Description" onClick={() => edit("description")}>
          <span className="max-w-[55vw] truncate text-[13px] text-muted">{description.trim() || "—"}</span>
        </Row>
      </div>
      <div className="flex flex-col">
        <SectionHeader title="Optional details" size="sm" className="mb-1 mt-2" />
        <Row
          tall
          chevron
          label="Screenshot"
          value={screenshotFile ? "Attached" : "None"}
          onClick={() => edit("screenshot")}
        />
      </div>
    </>
  );

  return (
    <StepFlow
      open={effectiveOpen}
      onClose={resetAndClose}
      title="Report an issue"
      noun="report"
      steps={[titleStep, descriptionStep]}
      extras={extras}
      summary={summary}
      submitLabel="Send report"
      successToast="Report sent. Thanks!"
      dirty={hasChanges(
        { title, description, screenshot: screenshotFile ? screenshotFile.name : "" },
        { title: "", description: "", screenshot: "" }
      )}
      onSubmit={handleSubmit}
    />
  );
}
