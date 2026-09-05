"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useApp } from "@/context/AppContext";
import { supabase } from "@/lib/supabase";
import { LogOut } from "lucide-react";

export default function UserProfileMenu() {
  const { session } = useApp();
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const initial =
    session?.user?.email?.charAt(0).toUpperCase() || "U";

  // Close the dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  return (
    <div ref={menuRef} className="relative">
      {/* Avatar Button */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="h-8 w-8 rounded-full bg-secondary text-foreground flex items-center justify-center text-sm font-bold cursor-pointer hover:brightness-110 active:scale-95 transition-all shadow-md shadow-secondary/25"
        aria-label="User menu"
      >
        {initial}
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-48 bg-surface border border-border rounded-xl shadow-xl shadow-black/20 py-1 z-50 animate-in fade-in slide-in-from-top-1 duration-(--duration-fast) ease-(--ease-standard)">
          {/* User email */}
          <div className="px-4 py-2.5 border-b border-border">
            <p className="text-xs font-medium text-muted truncate">
              {session?.user?.email || "User"}
            </p>
          </div>

          {/* Log Out */}
          <button
            type="button"
            onClick={handleLogout}
            className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm font-medium text-foreground hover:bg-surface-raised transition-colors cursor-pointer"
          >
            <LogOut className="h-4 w-4 text-muted" />
            Log Out
          </button>
        </div>
      )}
    </div>
  );
}
