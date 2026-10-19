"use client";

import { useRouter } from "next/navigation";
import { Bell } from "lucide-react";
import { useApp, useCurrentUser } from "@/context/AppContext";
import IconCircle from "@/components/ui/IconCircle";
import { useShellInbox } from "@/components/ShellInboxContext";

/** The bell (only when unread) and the avatar (opens Settings) at the right of the page header. */
export default function HeaderActions({ showAvatar = true }: { showAvatar?: boolean }) {
  const router = useRouter();
  const { notifications } = useApp();
  const user = useCurrentUser();
  const inbox = useShellInbox();

  if (!user.id && !user.email) return null;

  const unread = notifications.filter((n) => !n.is_read).length;

  return (
    <>
      {unread > 0 && (
        <span className="relative inline-flex">
          <IconCircle
            id="notification-bell-btn"
            label={`Open notifications (${unread})`}
            onClick={() => inbox?.openInbox()}
          >
            <Bell size={18} fill="currentColor" aria-hidden="true" />
          </IconCircle>
          <span className="pointer-events-none absolute right-0 top-0 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-primary px-1 text-[9px] font-bold leading-none text-primary-fg">
            {unread > 99 ? "99+" : unread}
          </span>
        </span>
      )}
      {showAvatar && (
        <IconCircle label="Open Settings" onClick={() => router.push("/settings")}>
          {user.avatar_url ? (
            <img
              src={user.avatar_url}
              alt={user.name}
              className="h-full w-full rounded-full object-cover animate-in fade-in duration-(--duration-feedback) ease-(--ease-enter)"
            />
          ) : (
            <span className="text-sm font-bold">{user.avatar}</span>
          )}
        </IconCircle>
      )}
    </>
  );
}
