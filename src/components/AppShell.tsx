"use client";

import { useEffect, useMemo, useState, Suspense } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useApp, useCurrentUser } from "@/context/AppContext";
import BottomNav from "@/components/BottomNav";
import Onboarding from "@/components/Onboarding";
import EmailVerifiedModal from "@/components/EmailVerifiedModal";
import UpdatesCard from "@/components/UpdatesCard";
import Toast from "@/components/ui/Toast";
import Logo from "./Logo";
import NotificationCenter from "./NotificationCenter";
import { ShellInboxContext } from "./ShellInboxContext";
import { useVisualViewportVars } from "@/hooks/useVisualViewportVars";
import { shouldForwardToRecovery } from "@/lib/recoveryLink";

export default function AppShell({ children }: { children: React.ReactNode }) {
  const [isMounted, setIsMounted] = useState(false);
  useEffect(() => {
    Promise.resolve().then(() => {
      setIsMounted(true);
    });
  }, []);

  return <AppShellBody isMounted={isMounted}>{children}</AppShellBody>;
}

function AppShellBody({ children, isMounted }: { children: React.ReactNode; isMounted: boolean }) {
  const { isOnboarded, session, isAuthLoading, isDataLoading, showOfflineRetry, retryLoadData, pushStatus, setPushStatus } = useApp();
  const router = useRouter();
  const pathname = usePathname();
  const currentUser = useCurrentUser();
  const [isNotificationCenterOpen, setIsNotificationCenterOpen] = useState(false);
  const [showVerifiedModal, setShowVerifiedModal] = useState(false);
  const isLoginPage = pathname === "/login";
  const isConfirmEmailPage = pathname === "/confirm-email";
  const isResetPasswordPage = pathname?.startsWith("/reset-password");
  const isAuthCallbackPage = pathname === "/auth/callback";
  const isGettingStartedPage = pathname === "/getting-started";

  useVisualViewportVars();

  // A password-recovery link that landed anywhere but the update page (for
  // example the Site URL fallback, or a reset sent from the dashboard) still
  // carries a session. Send it to the new-password page instead of the app (#490).
  const recoveryForward = isMounted && !isAuthLoading && shouldForwardToRecovery(!!session, pathname);
  useEffect(() => {
    if (recoveryForward) router.replace("/reset-password/update");
  }, [recoveryForward, router]);

  // The bell lives in the page header (HeaderActions); it opens this single inbox via context.
  const inboxValue = useMemo(() => ({ openInbox: () => setIsNotificationCenterOpen(true) }), []);

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
    if (isGettingStartedPage) return; // public guide (#247): no auth redirects

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
  }, [isMounted, isAuthLoading, session, isLoginPage, isConfirmEmailPage, isResetPasswordPage, isGettingStartedPage, router]);

  // Show only the wheel while forwarding, so Home, the nav and Onboarding never paint.
  if (recoveryForward) {
    return (
      <div className="flex flex-1 h-full w-full items-center justify-center bg-background">
        <Logo size="large" showWordmark={true} />
      </div>
    );
  }

  // Let the login, email confirmation, reset password, or auth callback page render
  // fullscreen immediately — these must mount and run their own logic even if a
  // background session already resolves as "not onboarded", otherwise AppShell's
  // Onboarding gate below (which doesn't check pathname) hijacks the callback page
  // before it ever gets a chance to run its redirect/signal logic. The same
  // goes for the public Getting started guide (#247), which signed-out and
  // not-onboarded visitors must be able to read without the shell, loading
  // wheel or onboarding gate.
  if (isLoginPage || isConfirmEmailPage || isResetPasswordPage || isAuthCallbackPage || isGettingStartedPage) {
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
    <ShellInboxContext.Provider value={inboxValue}>
      <div
        className="flex-1 flex flex-col w-full relative overflow-hidden bg-background text-foreground"
        style={{ paddingTop: 'env(safe-area-inset-top)' }}
      >
        {/* Notification Center Modal */}
        <NotificationCenter
          isOpen={isNotificationCenterOpen}
          onClose={() => setIsNotificationCenterOpen(false)}
          pushStatus={pushStatus}
          onPushStatusChange={setPushStatus}
        />

        {/* Main Content */}
        <main 
          className="flex-1 overflow-y-auto w-full relative z-10"
          style={{ WebkitOverflowScrolling: 'touch', paddingBottom: 'calc(var(--nav-clearance) + 16px)' }}
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
      {!isLoading && <BottomNav />}

      <EmailVerifiedModal isOpen={showVerifiedModal} onClose={() => setShowVerifiedModal(false)} />
      {!isLoading && currentUser && <UpdatesCard />}
      {/* App-wide toast (#205), sits just above the bottom nav. Always mounted
          so its aria-live region exists before the first message. */}
      <Toast />
    </ShellInboxContext.Provider>
  );
}
