"use client";

import { createContext, useContext } from "react";

interface ShellInboxValue {
  openInbox: () => void;
}

/** Lets the page header's bell open the single notification inbox owned by AppShell. */
export const ShellInboxContext = createContext<ShellInboxValue | null>(null);

export function useShellInbox() {
  return useContext(ShellInboxContext);
}
