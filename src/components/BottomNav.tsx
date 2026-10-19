"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, DollarSign, ListChecks, Target } from "lucide-react";
import { NAV_SLOTS, navIndexForPath } from "@/lib/navSlots";
import { useKeyboardOpen } from "@/hooks/useKeyboardOpen";

const ICONS = [Home, DollarSign, ListChecks, Target];

export default function BottomNav() {
  const pathname = usePathname();
  const keyboardOpen = useKeyboardOpen();
  const pathIndex = navIndexForPath(pathname);

  // Optimistic ring: slides on tap before the route lands. State is adjusted
  // during render (guarded by equality), never in an effect.
  const [tapped, setTapped] = useState<number | null>(null);
  const [seenPath, setSeenPath] = useState(pathname);
  const [lastIndex, setLastIndex] = useState(pathIndex >= 0 ? pathIndex : 0);
  if (seenPath !== pathname) {
    setSeenPath(pathname);
    setTapped(null);
  }
  if (pathIndex >= 0 && pathIndex !== lastIndex) {
    setLastIndex(pathIndex);
  }

  const activeIndex = tapped ?? pathIndex;
  const ringVisible = activeIndex >= 0;
  const ringIndex = ringVisible ? activeIndex : lastIndex;

  return (
    <nav
      aria-label="Main"
      className={`fixed inset-x-0 bottom-0 z-50 flex justify-center px-4 pointer-events-none transition-opacity duration-(--duration-quick) motion-reduce:transition-none ${
        keyboardOpen ? "opacity-0" : "opacity-100"
      }`}
      style={{ paddingBottom: "var(--nav-bottom)" }}
    >
      <div
        className={`relative grid w-full max-w-[480px] grid-cols-4 rounded-full border border-border-strong bg-surface-raised p-1 shadow-lg shadow-black/40 ${
          keyboardOpen ? "pointer-events-none" : "pointer-events-auto"
        }`}
      >
        <span
          aria-hidden="true"
          className="absolute inset-y-1 left-1 w-[calc((100%-0.5rem)/4)] rounded-full ring-2 ring-inset ring-primary transition-[transform,opacity] duration-(--duration-feedback) ease-(--ease-enter) motion-reduce:transition-none"
          style={{
            transform: `translateX(${ringIndex * 100}%)`,
            opacity: ringVisible ? 1 : 0,
          }}
        />
        {NAV_SLOTS.map((slot, i) => {
          const Icon = ICONS[i];
          const isActive = i === activeIndex;
          return (
            <Link
              key={slot.href}
              href={slot.href}
              onClick={() => setTapped(i)}
              aria-current={i === pathIndex ? "page" : undefined}
              className="press relative z-10 flex min-h-14 flex-col items-center justify-center gap-0.5 rounded-full [-webkit-tap-highlight-color:transparent]"
            >
              <Icon
                className={`h-5 w-5 ${isActive ? "text-primary" : "text-muted"}`}
                aria-hidden="true"
              />
              <span
                className={`text-[11px] transition-colors ${
                  isActive ? "font-bold text-foreground" : "font-semibold text-muted"
                }`}
              >
                {slot.name}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
