// The four bottom-navigation slots (R03, #390). Plain TS with no imports so the
// node test runner can load it directly.

export interface NavSlot {
  name: string;
  href: string;
}

export const NAV_SLOTS: readonly NavSlot[] = [
  { name: "Dashboard", href: "/" },
  { name: "Payday", href: "/payday" },
  { name: "Bills", href: "/bills" },
  { name: "Goals", href: "/funds" },
];

/** Slot index for a pathname (exact match, trailing slash ignored), or -1. */
export function navIndexForPath(pathname: string | null | undefined): number {
  if (!pathname) return -1;
  const clean = pathname.length > 1 ? pathname.replace(/\/+$/, "") : pathname;
  return NAV_SLOTS.findIndex((slot) => slot.href === clean);
}
