"use client";

import { useState, useRef } from "react";
import { CheckCircle2, Loader2, Paperclip, X } from "lucide-react";
import type { Session } from "@supabase/supabase-js";
import Dialog, { DialogButton } from "@/components/ui/Dialog";
import { uploadBugReportScreenshot } from "@/lib/storage";

const MAX_SCREENSHOT_BYTES = 5 * 1024 * 1024; // 5MB, matches the storage bucket's own limit

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
  const [successUrl, setSuccessUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
    setSuccessUrl(null);
    setIsSubmitting(false);
    onClose();
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    const validTypes = ["image/jpeg", "image/png", "image/webp"];
    if (!validTypes.includes(file.type)) {
      setScreenshotError("Invalid file type. Only JPEG, PNG, and WebP are allowed.");
      return;
    }
    if (file.size > MAX_SCREENSHOT_BYTES) {
      setScreenshotError("That screenshot is too large. Please choose one under 5MB.");
      return;
    }

    setScreenshotError(null);
    setScreenshotFile(file);
    setScreenshotPreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return URL.createObjectURL(file);
    });
  }

  function removeScreenshot() {
    setScreenshotFile(null);
    setScreenshotPreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
    setScreenshotError(null);
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

      setSuccessUrl(result.issueUrl || null);
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
      open={isOpen}
      onClose={resetAndClose}
      title="Report a Bug"
      footer={
        successUrl ? (
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
      {successUrl ? (
        <div className="flex flex-col items-center text-center gap-3 py-6">
          <CheckCircle2 className="h-12 w-12 text-primary" />
          <p className="text-sm font-semibold text-foreground">Thanks — your bug report was submitted.</p>
          <p className="text-xs text-muted">
            We&apos;ll take a look. You can track it{" "}
            <a href={successUrl} target="_blank" rel="noopener noreferrer" className="text-primary underline">
              here
            </a>
            .
          </p>
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
            <label htmlFor="bug-description" className="text-[10px] font-bold text-subtle uppercase tracking-wider font-mono">
              Description
            </label>
            <textarea
              id="bug-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
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
              <>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  disabled={isSubmitting}
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isSubmitting}
                  className="flex items-center gap-1.5 px-3 py-2 bg-white/5 border border-border text-muted hover:text-foreground hover:bg-surface-raised text-xs font-semibold rounded-[2px] transition-colors disabled:opacity-50"
                >
                  <Paperclip size={14} />
                  Attach a screenshot
                </button>
              </>
            )}

            {screenshotError && (
              <p className="text-[10px] text-destructive font-semibold uppercase tracking-wider">{screenshotError}</p>
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
