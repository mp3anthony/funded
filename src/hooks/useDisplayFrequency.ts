"use client";

import { useEffect, useState } from "react";
import { useApp } from "@/context/AppContext";
import { loadFrequency, type FrequencyType } from "@/lib/frequencyPreference";

/**
 * The person's remembered Bills "amounts as" choice (R14), read-only. Null until storage has
 * been read after mount, so server and first client render agree and callers show no wrong numbers.
 */
export function useDisplayFrequency(): FrequencyType | null {
  const { session } = useApp();
  const userId = session?.user?.id;
  const [frequency, setFrequency] = useState<FrequencyType | null>(null);

  useEffect(() => {
    if (!userId) return;
    // One-shot sync from localStorage, not a render cascade.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setFrequency(loadFrequency(userId));
  }, [userId]);

  return frequency;
}
