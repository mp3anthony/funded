"use client";

import { useEffect, useState, Suspense, useCallback } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useApp, useCurrentUser } from "@/context/AppContext";
import BottomNav from "@/components/BottomNav";
import Onboarding from "@/components/Onboarding";
import EmailVerifiedModal from "@/components/EmailVerifiedModal";
import Logo from "./Logo";
import AvatarDropdown from "./AvatarDropdown";
import NotificationCenter from "./NotificationCenter";
import { Bell } from "lucide-react";
import { useVisualViewportVars } from "@/hooks/useVisualViewportVars";

export default function AppShell({ children }: { children: React.ReactNode }) {
  const [isMounted, setIsMounted] = useState(false);
  useEffect(() => {
    Promise.resolve().then(() => {
      setIsMounted(true);
    });
  }, []);

  return <AppShellBody isMounted={isMounted}>{children}</AppShellBody>;
}

/** Read all active snooze timestamps from localStorage. */
function getSnoozedIds(): Record<string, number> {
  if (typeof window === "undefined") return {};
  const snoozes: Record<string, number> = {};
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith("snooze-")) {
      const id = key.substring(7);
      const val = localStorage.getItem(key);
      if (val) snoozes[id] = parseInt(val);
    }
  }
  return snoozes;
}

function AppShellBody({ children, isMounted }: { children: React.ReactNode; isMounted: boolean }) {
  const { isOnboarded, session, isAuthLoading, isDataLoading, showOfflineRetry, retryLoadData, notifications } = useApp();
  const router = useRouter();
  const pathname = usePathname();
  const currentUser = useCurrentUser();
  const [isNotificationCenterOpen, setIsNotificationCenterOpen] = useState(false);
  const [snoozedIds, setSnoozedIds] = useState<Record<string, number>>({});
  // Start at 0 (not Date.now()) so static prerender doesn't read the current
  // time during render — cacheComponents forbids that outside a Suspense
  // boundary (see #47). The mount effect below calls refreshSnoozes(), which
  // sets the real time on the client before any snooze comparison matters.
  const [now, setNow] = useState(0);
  const [showVerifiedModal, setShowVerifiedModal] = useState(false);
  const isLoginPage = pathname === "/login";
  const isConfirmEmailPage = pathname === "/confirm-email";
  const isResetPasswordPage = pathname?.startsWith("/reset-password");
  const isAuthCallbackPage = pathname === "/auth/callback";

  useVisualViewportVars();

  // 1b. Sync snooze state from localStorage (refreshes every 30s so expiry is reactive)
  const refreshSnoozes = useCallback(() => {
    setSnoozedIds(getSnoozedIds());
    setNow(Date.now());
  }, []);

  useEffect(() => {
    refreshSnoozes();
    const interval = setInterval(refreshSnoozes, 30_000);
    return () => clearInterval(interval);
  }, [refreshSnoozes]);

  // Re-read snoozes whenever the notification center closes (user may have just snoozed)
  useEffect(() => {
    if (!isNotificationCenterOpen) {
      refreshSnoozes();
    }
  }, [isNotificationCenterOpen, refreshSnoozes]);

  // Compute visible notification count (excludes read/dismissed and snoozed ones)
  const visibleNotificationCount = notifications.filter(n => {
    if (n.is_read) return false;
    const expires = snoozedIds[n.id];
    return !(expires && expires > now);
  }).length;

  // 2. Global Scroll Lock (MutationObserver)
  useEffect(() => {
    if (typeof window === "undefined") return;

    const updateScrollLock = () => {
      const activeModals = document.querySelectorAll(".modal-backdrop");
      if (activeModals.length > 0) {
        document.body.classList.add("modal-open");
        document.documentElement.classList.add("modal-open");
      } else {
        document.body.classList.remove("modal-open");
        document.documentElement.classList.remove("modal-open");
      }
    };

    updateScrollLock();

    const observer = new MutationObserver(() => {
      updateScrollLock();
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });

    return () => {
      observer.disconnect();
      document.body.classList.remove("modal-open");
      document.documentElement.classList.remove("modal-open");
    };
  }, [pathname]);

  useEffect(() => {
    if (pathname === "/" && sessionStorage.getItem("justVerified")) {
      sessionStorage.removeItem("justVerified");
      setShowVerifiedModal(true);
    }
  }, [pathname]);

  // 3. Navigation/Auth Guard Redirects
  useEffect(() => {
    if (!isMounted || isAuthLoading) return;

    if (!session) {
      if (!isLoginPage && !isConfirmEmailPage && !isResetPasswordPage) {
        router.replace("/login");
      }
    } else {
      const isConfirmed = !!session.user.email_confirmed_at;
      if (!isConfirmed) {
        if (!isConfirmEmailPage) {
          router.replace("/confirm-email");
        }
      } else {
        if (isConfirmEmailPage) {
          router.replace("/");
        }
      }
    }
  }, [isMounted, isAuthLoading, session, isLoginPage, isConfirmEmailPage, isResetPasswordPage, router]);

  // Let the login, email confirmation, reset password, or auth callback page render
  // fullscreen immediately — these must mount and run their own logic even if a
  // background session already resolves as "not onboarded", otherwise AppShell's
  // Onboarding gate below (which doesn't check pathname) hijacks the callback page
  // before it ever gets a chance to run its redirect/signal logic.
  if (isLoginPage || isConfirmEmailPage || isResetPasswordPage || isAuthCallbackPage) {
    return <>{children}</>;
  }

  // If fully loaded and we know user is not onboarded, show Onboarding.
  // The !isDataLoading guard is essential: on cold start there is a one-render
  // gap where auth has just resolved (session truthy) but isOnboarded is still
  // its false default and loadData hasn't confirmed the household yet. Without
  // this guard the gate wins that gap and flashes "create or join" before the
  // home screen (see #49). isDataLoading now starts true (#73), so on the
  // cold-open path this gate stays shut until loadData has actually run.
  // That is NOT the same as "the gate only opens on a determined result":
  // loadData also clears isDataLoading on its failure paths — membership error
  // (AppContext.tsx:916), households error (:944), the catch via finally (:968)
  // — and when auth resolved with no session (:879). Two routes reach here: a
  // genuinely not-onboarded user, whose loadData found no household membership;
  // and an already-onboarded user hitting a transient membership/household
  // error, which is a pre-existing #49-shaped hazard this gate does not fix.
  if (isMounted && !isAuthLoading && session && !isOnboarded && !isDataLoading) {
    return (
      <>
        <Onboarding />
        <EmailVerifiedModal isOpen={showVerifiedModal} onClose={() => setShowVerifiedModal(false)} />
      </>
    );
  }

  // Define loading state for the main content area
  const isLoading = !isMounted || isAuthLoading || (session && isDataLoading) || !session;

  return (
    <>
      <div 
        className="flex-1 flex flex-col w-full relative overflow-hidden text-foreground"
        style={{ paddingTop: 'env(safe-area-inset-top)' }}
      >
        {/* Floating Avatar + Bell — fixed position, always visible when authenticated */}
        {!isLoading && currentUser && (
          <div className="floating-avatar flex items-center gap-2">
            {/* Notification Bell — only visible when there are active (non-snoozed) notifications */}
            {visibleNotificationCount > 0 && (
              <button
                id="notification-bell-btn"
                onClick={() => setIsNotificationCenterOpen(true)}
                aria-label={`Open notifications (${visibleNotificationCount})`}
                className="relative h-9 w-9 rounded-xl flex items-center justify-center text-primary transition-transform duration-200 active:scale-95 hover:brightness-110 focus:outline-none focus:ring-2 focus:ring-primary/50 cursor-pointer"
                style={{ background: 'var(--color-primary-light)', border: '2px solid var(--color-primary-mid)' }}
              >
                <Bell size={18} fill="currentColor" className="text-primary" />
                {/* Notification count badge */}
                {visibleNotificationCount > 0 && (
                  <span
                    className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 rounded-full text-[9px] font-bold flex items-center justify-center leading-none"
                    style={{
                      background: 'var(--color-primary)',
                      color: 'var(--color-primary-fg)',
                    }}
                  >
                    {visibleNotificationCount > 99 ? '99+' : visibleNotificationCount}
                  </span>
                )}
              </button>
            )}
            <AvatarDropdown user={currentUser} />
          </div>
        )}

        {/* Notification Center Modal */}
        <NotificationCenter
          isOpen={isNotificationCenterOpen}
          onClose={() => setIsNotificationCenterOpen(false)}
        />

        {/* Main Content */}
        <main 
          className="flex-1 overflow-y-auto w-full relative z-10"
          style={{ WebkitOverflowScrolling: 'touch', paddingBottom: 'calc(5rem + env(safe-area-inset-bottom))' }}
        >
          {isLoading ? (
            <div className="flex h-full w-full items-center justify-center">
              <div className="flex flex-col items-center gap-6 animate-in fade-in duration-300">
                <Logo size="large" showWordmark={true} />
                {/* showOfflineRetry (#71 follow-up): loadData has been stuck
                    on a network failure for 30s straight despite the layered
                    auto-recovery (polling + online/visibilitychange/focus) in
                    AppContext. An indefinite spinner with no feedback and no
                    available action is a bad end state on its own, so surface
                    a manual retry instead of spinning forever silently. */}
                {showOfflineRetry ? (
                  <div className="flex flex-col items-center gap-3 text-center px-6">
                    <p className="text-sm text-muted-foreground">
                      Having trouble connecting. Check your connection and try again.
                    </p>
                    <button
                      type="button"
                      onClick={retryLoadData}
                      className="px-4 py-2 rounded-xl text-sm font-semibold text-primary-fg bg-primary active:scale-95 transition-transform"
                    >
                      Retry
                    </button>
                  </div>
                ) : (
                  <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                )}
              </div>
            </div>
          ) : (
            <Suspense fallback={null}>
              {children}
            </Suspense>
          )}
        </main>
      </div>

      {/* Bottom Nav — rendered OUTSIDE the overflow-hidden container so
          position:fixed works against the viewport on iOS WebKit */}
      {(!isLoading || session) && <BottomNav />}

      <EmailVerifiedModal isOpen={showVerifiedModal} onClose={() => setShowVerifiedModal(false)} />
    </>
  );
}
