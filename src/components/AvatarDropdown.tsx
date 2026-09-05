"use client";

import React, { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Settings, LogOut, ChevronRight } from "lucide-react";
import { supabase } from "@/lib/supabase";

interface AvatarDropdownProps {
  user: {
    name: string;
    email: string;
    avatar: string;
    avatar_url?: string | null;
  };
}

export default function AvatarDropdown({ user }: AvatarDropdownProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  // Handle escape key to close dropdown
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  const handleLogout = async () => {
    setIsOpen(false);
    await supabase.auth.signOut();
    router.push("/login");
  };

  const handleNavigateToSettings = () => {
    setIsOpen(false);
    router.push("/settings");
  };

  return (
    <div ref={containerRef} className="relative inline-block text-left">
      {/* Avatar Trigger button */}
      <button
        onClick={() => setIsOpen((prev) => !prev)}
        type="button"
        className="h-9 w-9 rounded-xl border-2 border-primary overflow-hidden bg-gradient-to-tr from-primary to-emerald-500 flex items-center justify-center text-foreground font-bold text-sm cursor-pointer shadow-lg transition-transform duration-200 active:scale-95 hover:brightness-110 focus:outline-none focus:ring-2 focus:ring-primary/50"
        aria-expanded={isOpen}
        aria-haspopup="true"
        aria-label="User menu"
      >
        {user.avatar_url ? (
          // fade-in only plays on this <img>'s actual mount (first time
          // avatar_url goes from falsy to a URL) — it's a fixed JSX slot
          // with no key, so re-renders from user data refreshing (name/
          // avatar_url updates) reuse the same DOM node and just patch
          // its src, which does not restart a CSS animation. No flicker.
          <img src={user.avatar_url} alt={user.name} className="h-full w-full object-cover animate-in fade-in duration-(--duration-base) ease-(--ease-standard)" />
        ) : (
          user.avatar
        )}
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div
          role="menu"
          aria-orientation="vertical"
          className="absolute right-0 mt-2 w-56 origin-top-right rounded-xl border border-border bg-surface shadow-lg shadow-black/40 ring-1 ring-black ring-opacity-5 focus:outline-none z-50 animate-in fade-in slide-in-from-top-1 duration-(--duration-fast) ease-(--ease-standard)"
        >
          {/* User Information Header */}
          <div className="px-5 py-3.5 border-b border-border-strong flex flex-col space-y-1">
            <span className="text-[10px] uppercase font-bold tracking-wider font-mono text-primary">
              Signed in as
            </span>
            {/* Name is a button that deep-links to the Profile section of settings */}
            <Link
              href="/settings?modal=profile"
              prefetch={false}
              onClick={() => setIsOpen(false)}
              aria-label={`Open profile settings for ${user.name}`}
              className="group -mx-1.5 flex items-center gap-1.5 rounded-lg px-1.5 py-1.5 text-sm font-semibold text-foreground transition-colors hover:bg-white/5 hover:text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
              role="menuitem"
            >
              <span className="min-w-0 truncate">{user.name}</span>
              <ChevronRight size={14} className="shrink-0 text-muted transition-colors group-hover:text-primary" />
            </Link>
            <span className="text-[10px] text-muted truncate">
              {user.email}
            </span>
          </div>

          <div className="py-1" role="none">
            {/* Settings Link */}
            <Link
              href="/settings"
              onClick={() => setIsOpen(false)}
              className="w-full flex items-center gap-3.5 px-5 py-3.5 text-left text-xs font-bold uppercase tracking-wider text-muted hover:text-foreground hover:bg-white/5 transition-all cursor-pointer font-heading"
              role="menuitem"
            >
              <Settings size={16} className="text-muted shrink-0 group-hover:text-foreground" />
              <span>Settings</span>
            </Link>

            {/* Logout Link */}
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3.5 px-5 py-3.5 text-left text-xs font-bold uppercase tracking-wider text-muted hover:text-destructive hover:bg-destructive/10 transition-all cursor-pointer font-heading"
              role="menuitem"
            >
              <LogOut size={16} className="text-muted shrink-0 group-hover:text-destructive" />
              <span>Log out</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
