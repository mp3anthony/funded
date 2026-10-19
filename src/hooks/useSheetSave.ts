"use client";

import { useCallback, useRef, useState } from "react";
import { useApp } from "@/context/AppContext";
import {
  SAVE_ERROR_MESSAGE,
  settleSave,
  type SaveStatus,
} from "@/lib/sheetSave";

interface UseSheetSaveOptions {
  /** Called after a successful save; the caller closes the pop-up here. */
  onSuccess: () => void;
  /** Toast shown after onSuccess. */
  successToast?: string;
  /** Error line shown on failure. Defaults to the shared message. */
  errorMessage?: string;
  /** Show the thrown error's own message instead (server messages). */
  showThrownMessage?: boolean;
  /** Success leaves the status at "saving" and skips onSuccess and the toast (the page is navigating away). */
  keepBusyOnSuccess?: boolean;
}

/**
 * Shared save behaviour for the pop-up shells (R05, #392): "Saving…" while in
 * flight (a second tap is ignored), a red line plus "Try again" on failure,
 * close and toast on success. A failure is a save that returns `false` or throws.
 */
export function useSheetSave({
  onSuccess,
  successToast,
  errorMessage,
  showThrownMessage = false,
  keepBusyOnSuccess = false,
}: UseSheetSaveOptions) {
  const { showToast } = useApp();
  const [status, setStatus] = useState<SaveStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const inFlight = useRef(false);

  const run = useCallback(
    async (save: () => Promise<boolean | void> | boolean | void) => {
      if (inFlight.current) return;
      inFlight.current = true;
      setStatus("saving");
      setError(null);
      const result = await settleSave(save);
      inFlight.current = false;
      if (!result.ok) {
        setStatus("error");
        setError(
          (showThrownMessage && result.thrownMessage) ||
            errorMessage ||
            SAVE_ERROR_MESSAGE
        );
        return;
      }
      if (keepBusyOnSuccess) return;
      setStatus("idle");
      onSuccess();
      if (successToast) showToast({ message: successToast });
    },
    [onSuccess, successToast, errorMessage, showThrownMessage, keepBusyOnSuccess, showToast]
  );

  const reset = useCallback(() => {
    setStatus("idle");
    setError(null);
  }, []);

  return { status, error, run, reset };
}
