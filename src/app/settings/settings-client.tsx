"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import {
  User,
  Mail,
  Users,
  Check,
  Copy,
  RefreshCw,
  Save,
  Sun,
  Moon,
  Monitor,
} from "lucide-react";
import { useApp } from "@/context/AppContext";
import { supabase } from "@/lib/supabase";
import { APP_VERSION } from "@/lib/version";
import PaymentModeToggle from "@/components/PaymentModeToggle";
import ContributionSettingsSheet from "@/components/ContributionSettingsSheet";
import RulesSettingsSheet from "@/components/RulesSettingsSheet";
import BugReportSheet from "@/components/BugReportSheet";
import PageHeader from "@/components/PageHeader";
import AvatarUpload from "@/components/AvatarUpload";
import RemoveMemberModal from "@/components/RemoveMemberModal";
import EditMemberModal from "@/components/EditMemberModal";
import NotificationCenter from "@/components/NotificationCenter";
import TimezoneDialog from "@/components/TimezoneDialog";
import SectionHeader from "@/components/ui/SectionHeader";
import Row from "@/components/ui/Row";
import Dialog, { DialogButton } from "@/components/ui/Dialog";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import { type Member } from "@/types";
import { leaveModeFor, eligibleNewOwners, isAcceptedMember, isDeleteConfirmed } from "@/lib/householdLeave";

/* Error box shown inside the leave / delete household dialogs (#251). */
function LeaveError({ message }: { message: string }) {
  return (
    <div className="bg-destructive/10 border border-destructive/50 rounded-[2px] p-3 text-destructive text-xs break-words whitespace-pre-wrap">
      {message}
    </div>
  );
}

/* ── Page Component ──────────────────────────── */
export default function SettingsClient() {
  /* Context */
  const {
    members,
    isJointFund,
    updateHouseholdPaymentMode,
    householdTimezone,
    updateHouseholdTimezone,
    householdContributions,
    contributionRules,
    funds,
    householdName,
    session,
    updateMember,
    updateMemberAvatar,
    theme,
    setTheme,
    joinCode,
    codeExpiresAt,
    regenerateJoinCode,
    notificationSettings,
    pushStatus,
    setPushStatus,
    leaveHousehold,
    deleteHousehold,
  } = useApp();

  /* Payment mode confirm flow */
  const [tempMode, setTempMode] = useState<boolean | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [modeChangeError, setModeChangeError] = useState<string | null>(null);

  /* Reused sheets */
  const [isContributionOpen, setIsContributionOpen] = useState(false);
  const [isRulesOpen, setIsRulesOpen] = useState(false);
  const [isNotificationCenterOpen, setIsNotificationCenterOpen] = useState(false);
  const [isBugReportOpen, setIsBugReportOpen] = useState(false);

  /* Inline editorial dialogs */
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showAppearanceDialog, setShowAppearanceDialog] = useState(false);
  const [showJoinCodeDialog, setShowJoinCodeDialog] = useState(false);
  const [showPaymentModeDialog, setShowPaymentModeDialog] = useState(false);
  const [showTimezoneDialog, setShowTimezoneDialog] = useState(false);

  /* Member management modals */
  const [memberToRemove, setMemberToRemove] = useState<Member | null>(null);
  const [memberToEdit, setMemberToEdit] = useState<Member | null>(null);

  /* Leave household */
  const [leaveDialog, setLeaveDialog] = useState<"leave" | "transfer" | "delete" | null>(null);
  const [isLeavingHousehold, setIsLeavingHousehold] = useState(false);
  const [leaveHouseholdError, setLeaveHouseholdError] = useState<string | null>(null);
  const [newOwnerId, setNewOwnerId] = useState<string | number | null>(null);
  const [deleteText, setDeleteText] = useState("");

  /* Deep-link: open the Profile dialog when arriving via /settings?modal=profile
     (e.g. a link to /settings?modal=profile). Reactive to the query param so
     it also fires when already on /settings (a same-route soft navigation does
     not remount this component); the flag is stripped once consumed so a refresh
     or back-nav doesn't re-open it. */
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  useEffect(() => {
    if (searchParams?.get("modal") !== "profile") return;
    setShowProfileModal(true);
    const params = new URLSearchParams(searchParams.toString());
    params.delete("modal");
    const newQuery = params.toString();
    router.replace(`${pathname}${newQuery ? `?${newQuery}` : ""}`, { scroll: false });
  }, [searchParams, pathname, router]);

  /* Derived display values */
  const contributionMonthlyTotal = householdContributions.reduce((sum, c) => {
    const amt = Number(c.amount) || 0;
    const freq = (c.frequency || "monthly").toLowerCase();
    if (freq === "weekly") return sum + amt * 4.33;
    if (freq === "fortnightly") return sum + amt * 2.16;
    if (freq === "yearly") return sum + amt / 12;
    return sum + amt;
  }, 0);
  const hasContributions = householdContributions.length > 0;
  const activeRulesCount = contributionRules.filter((r) => r.is_active).length;

  const currentMember = members.find(
    (m) => String(m.email).toLowerCase() === String(session?.user?.email).toLowerCase()
  );
  const isCurrentUserOwner = currentMember?.role === "owner";
  const roleLabel = currentMember?.role === "owner" ? "Owner" : "Member";

  /* Profile form */
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [profileSaved, setProfileSaved] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [isDirty, setIsDirty] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (currentMember) {
      setFullName(currentMember.name);
      setEmail(currentMember.email);
    } else if (session?.user) {
      setFullName(session.user.user_metadata?.full_name || session.user.email?.split("@")[0] || "");
      setEmail(session.user.email || "");
    }
  }, [currentMember, session]);

  useEffect(() => {
    if (currentMember) {
      setIsDirty(fullName !== currentMember.name || email !== currentMember.email);
    } else if (session?.user) {
      const defaultName = session.user.user_metadata?.full_name || session.user.email?.split("@")[0] || "";
      const defaultEmail = session.user.email || "";
      setIsDirty(fullName !== defaultName || email !== defaultEmail);
    }
  }, [fullName, email, currentMember, session]);

  /* ── Handlers ──────────────────────────────── */
  async function handleProfileSave() {
    setProfileError(null);
    try {
      if (currentMember) {
        await updateMember(currentMember.id, { name: fullName, email: email });
      }
      setProfileSaved(true);
      setIsDirty(false);
      setTimeout(() => setProfileSaved(false), 2000);
    } catch (err) {
      // updateMember rethrows (#251); it already logged, so just don't claim success.
      console.error("Profile save failed:", err);
      setProfileError((err as Error)?.message || "Couldn't save your profile. Please try again.");
    }
  }

  function handleModeChangeClick(newMode: boolean) {
    if (newMode === isJointFund) return;
    setTempMode(newMode);
    setModeChangeError(null);
    setShowPaymentModeDialog(false);
    setShowConfirm(true);
  }

  async function handleConfirmModeChange() {
    if (tempMode !== null) {
      try {
        setModeChangeError(null);
        await updateHouseholdPaymentMode(tempMode);
      } catch (err) {
        const error = err as Error;
        setModeChangeError(error.message || "Failed to update payment mode. Please try again.");
        return;
      }
    }
    setTempMode(null);
    setShowConfirm(false);
  }

  function handleCancelModeChange() {
    setTempMode(null);
    setModeChangeError(null);
    setShowConfirm(false);
  }

  function handleCopyJoinCode() {
    if (joinCode) {
      navigator.clipboard.writeText(joinCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  async function handleRegenerateCode() {
    try {
      await regenerateJoinCode();
    } catch (err) {
      alert((err as Error)?.message || "Failed to generate code.");
    }
  }

  /* #251: Leave / Delete household. The mode comes from who is in the
     household (see src/lib/householdLeave.ts); the leave-household and
     delete-household functions re-check it server-side, so a stale screen just
     gets a plain-English error shown in the dialog. Success redirects to "/"
     (same pattern as JoinHouseholdSheet.tsx:71) so the full reload lets
     AppShell's onboarding gate show the create-or-join screen. */
  const leaveMode = currentMember ? leaveModeFor(members, currentMember) : "leave";
  const eligibleOwners = currentMember ? eligibleNewOwners(members, currentMember.id) : [];
  const acceptedCount = members.filter(isAcceptedMember).length;

  function openLeaveDialog() {
    setLeaveHouseholdError(null);
    setNewOwnerId(null);
    setDeleteText("");
    setLeaveDialog(leaveMode === "leave" ? "leave" : leaveMode === "transfer-or-delete" ? "transfer" : "delete");
  }

  function closeLeaveDialog() {
    if (isLeavingHousehold) return;
    setLeaveDialog(null);
  }

  async function runLeaveAction(action: () => Promise<void>) {
    setLeaveHouseholdError(null);
    setIsLeavingHousehold(true);
    try {
      await action();
      window.location.href = "/";
    } catch (err) {
      console.error("Failed to leave household:", err);
      setLeaveHouseholdError((err as Error)?.message || "That didn't work. Please check your connection and try again.");
      setIsLeavingHousehold(false);
    }
  }

  const themeOptions: { value: "light" | "dark" | "system"; label: string; icon: React.ReactNode }[] = [
    { value: "light", label: "Light", icon: <Sun className="h-[18px] w-[18px]" /> },
    { value: "dark", label: "Dark", icon: <Moon className="h-[18px] w-[18px]" /> },
    { value: "system", label: "System", icon: <Monitor className="h-[18px] w-[18px]" /> },
  ];
  const currentThemeLabel = theme.charAt(0).toUpperCase() + theme.slice(1);

  /* Issue #97 (Slice 9): per-user notify hour display label. */
  function formatNotifyHourLabel(hour: number): string {
    const period = hour < 12 ? "AM" : "PM";
    const displayHour = hour % 12 === 0 ? 12 : hour % 12;
    return `${displayHour}:00 ${period}`;
  }

  /* ── Render ────────────────────────────────── */
  return (
    <div className="flex-1 w-full max-w-2xl mx-auto px-6 pt-4 pb-10 md:pt-6">
      <PageHeader title="Settings" showAvatar={false} onBack={() => router.push("/")} />

      {/* ── Identity anchor ─────────────────────── */}
      <div className="flex items-center gap-4 pt-2 pb-8">
        <div className="h-14 w-14 rounded-2xl overflow-hidden shrink-0 flex items-center justify-center font-bold text-lg text-primary-fg bg-gradient-to-br from-primary to-success">
          {currentMember?.avatar_url ? (
            <img src={currentMember.avatar_url} alt={currentMember.name} className="h-full w-full object-cover" />
          ) : (
            currentMember?.avatar || (currentMember?.name || fullName || "?").slice(0, 2).toUpperCase()
          )}
        </div>
        <div className="min-w-0">
          <h2 className="font-bold text-xl text-foreground truncate">
            {currentMember?.name || fullName || "Your account"}
          </h2>
          <div className="text-xs text-muted mt-1 tracking-wide truncate">
            {householdName || "Household"} · {roleLabel}
          </div>
        </div>
      </div>

      {/* ── Account ─────────────────────────────── */}
      <section className="pb-2">
        <SectionHeader title="Account" />
        <Row label="Profile & identity" chevron onClick={() => setShowProfileModal(true)} />
      </section>

      {/* ── App ─────────────────────────────────── */}
      <section className="pt-6 pb-2">
        <SectionHeader title="App" />
        <Row label="Notifications" chevron onClick={() => setIsNotificationCenterOpen(true)}>
          <span className="flex flex-col items-end gap-0.5">
            <span className="text-[13px] text-muted">
              {notificationSettings ? formatNotifyHourLabel(notificationSettings.notify_hour) : "—"}
            </span>
            <span className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-subtle">
              <span
                className={`h-1.5 w-1.5 rounded-full ${pushStatus?.hasLiveSubscription ? "bg-success" : "bg-subtle"} transition-colors duration-(--duration-structural) ease-(--ease-enter)`}
              />
              {pushStatus?.hasLiveSubscription ? "Active" : "Inactive"}
            </span>
          </span>
        </Row>
        <Row
          label="Appearance"
          value={currentThemeLabel}
          chevron
          onClick={() => setShowAppearanceDialog(true)}
        />
      </section>

      {/* ── Household ────────────────────────────── */}
      <section className="pt-6 pb-2">
        <SectionHeader title="Household" />
        {isJointFund && (
          <>
            <Row
              label="Contribution amounts"
              value={hasContributions ? `$${Math.round(contributionMonthlyTotal).toLocaleString()}/mo` : "Not set"}
              chevron
              onClick={() => setIsContributionOpen(true)}
            />
            <Row label="Automation rules" chevron onClick={() => setIsRulesOpen(true)}>
              {activeRulesCount > 0 ? (
                <span className="text-xs font-semibold text-primary">{activeRulesCount} active</span>
              ) : (
                <span className="text-[13px] text-muted">Off</span>
              )}
            </Row>
          </>
        )}
        <Row label="Join code" chevron onClick={() => setShowJoinCodeDialog(true)}>
          {joinCode ? (
            <span className="text-sm font-bold text-primary tracking-widest">{joinCode}</span>
          ) : (
            <span className="text-[13px] text-muted">None</span>
          )}
        </Row>
        <Row
          label="Payment mode"
          value={isJointFund ? "Joint Fund" : "Direct Pay"}
          chevron
          onClick={() => setShowPaymentModeDialog(true)}
        />
        <Row
          label="Timezone"
          value={(householdTimezone || "Australia/Sydney").replace(/_/g, " ")}
          chevron={isCurrentUserOwner}
          onClick={isCurrentUserOwner ? () => setShowTimezoneDialog(true) : undefined}
        />
      </section>

      {/* ── Members ──────────────────────────────── */}
      <section className="pt-6 pb-2">
        <SectionHeader title="Members" count={members.length} />
        {members.map((member) => {
          const isCurrentUser =
            String(member.email).toLowerCase() === String(session?.user?.email).toLowerCase();
          const isOwner = member.role === "owner";
          // #251: owners open other members' settings (role, remove). There is no
          // self-demote UI; the last owner can't be demoted (EditMemberModal + DB trigger).
          const canManage = isCurrentUserOwner && !isCurrentUser;
          return (
            <Row
              key={member.id}
              divider
              chevron={canManage}
              onClick={canManage ? () => setMemberToEdit(member) : undefined}
              label={
                <span className="flex items-center gap-3 min-w-0">
                  <span className="h-9 w-9 rounded-xl overflow-hidden shrink-0 flex items-center justify-center text-[11px] font-bold bg-surface-elevated text-muted data-[owner=true]:bg-gradient-to-br data-[owner=true]:from-primary data-[owner=true]:to-success data-[owner=true]:text-primary-fg"
                    data-owner={isOwner}
                  >
                    {member.avatar_url ? (
                      <img src={member.avatar_url} alt={member.name} className="h-full w-full object-cover" />
                    ) : (
                      member.avatar
                    )}
                  </span>
                  <span className="flex flex-col min-w-0">
                    <span className="text-sm font-semibold text-foreground truncate">{member.name}</span>
                    <span className="text-[10px] uppercase tracking-wider text-subtle mt-0.5">
                      {isOwner ? "Owner" : "Member"}
                      {member.invitation_status === "pending" ? " · Pending" : ""}
                    </span>
                  </span>
                </span>
              }
            />
          );
        })}
        <button
          type="button"
          onClick={() => setShowJoinCodeDialog(true)}
          className="w-full text-left py-3 text-[13px] font-semibold text-primary"
        >
          + Invite member
        </button>
      </section>

      {/* ── Updates + Getting started + Report a bug + Leave household + version ── */}
      <section className="pt-8">
        <Link
          href="/patch-notes"
          className="block w-full text-left py-3 border-t border-border text-sm font-medium text-primary"
        >
          Updates
        </Link>
        <Link
          href="/getting-started"
          className="block w-full text-left py-3 border-t border-border text-sm font-medium text-primary"
        >
          Getting started
        </Link>
        <button
          type="button"
          onClick={() => setIsBugReportOpen(true)}
          className="w-full text-left py-3 border-t border-border text-sm font-medium text-primary"
        >
          Report a bug
        </button>
        {/* Interim Log out row (R03, #390): the avatar menu is gone; R29 places this for good. */}
        <button
          type="button"
          onClick={async () => {
            await supabase.auth.signOut();
            router.push("/login");
          }}
          className="w-full text-left py-3 min-h-[44px] border-t border-border text-sm font-medium text-primary"
        >
          Log out
        </button>
        <button
          type="button"
          onClick={openLeaveDialog}
          className="w-full text-left py-3 min-h-[44px] border-t border-primary/20 text-sm font-medium text-destructive"
        >
          {leaveMode === "delete-only" ? "Delete household" : "Leave household"}
        </button>
        <div className="text-center pt-8 pb-2">
          <span className="text-[10px] tracking-wider text-subtle/70">
            funded. v{APP_VERSION}
          </span>
          <div className="text-[10px] text-subtle/50 mt-1">© 2026 HazardousSchematics.com</div>
        </div>
      </section>

      {/* ══════════════ Dialogs & sheets ══════════════ */}

      {/* Profile */}
      <Dialog
        open={showProfileModal}
        onClose={() => setShowProfileModal(false)}
        title="Profile"
        icon={<User className="h-5 w-5 text-primary" />}
        footer={
          <>
            <DialogButton variant="ghost" onClick={() => setShowProfileModal(false)}>
              Close
            </DialogButton>
            <DialogButton
              variant={profileSaved ? "ghost" : "primary"}
              onClick={handleProfileSave}
              disabled={!isDirty && !profileSaved}
            >
              {profileSaved ? (
                <span className="inline-flex items-center gap-1.5">
                  <Check className="h-4 w-4" /> Saved
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5">
                  <Save className="h-4 w-4" /> Save
                </span>
              )}
            </DialogButton>
          </>
        }
      >
        <div className="flex flex-col gap-5">
          {profileError && <LeaveError message={profileError} />}
          <div className="flex justify-center">
            {currentMember && (
              <AvatarUpload
                currentAvatarUrl={currentMember.avatar_url || null}
                memberName={currentMember.name}
                userId={String(currentMember.id)}
                onAvatarChange={async (newUrl) => {
                  await updateMemberAvatar(currentMember.id, newUrl);
                }}
              />
            )}
          </div>

          <div>
            <label htmlFor="settings-name" className="block text-[11px] uppercase tracking-wider text-subtle mb-2">
              Nickname
            </label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted pointer-events-none" />
              <input
                id="settings-name"
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full pl-9 pr-3 py-3 rounded-xl bg-background border border-border text-foreground text-sm font-medium focus:ring-2 focus:ring-primary/40 focus:border-primary outline-none transition-all"
              />
            </div>
          </div>

          <div>
            <label htmlFor="settings-email" className="block text-[11px] uppercase tracking-wider text-subtle mb-2">
              Email Address
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted pointer-events-none" />
              <input
                id="settings-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-9 pr-3 py-3 rounded-xl bg-background border border-border text-foreground text-sm font-medium focus:ring-2 focus:ring-primary/40 focus:border-primary outline-none transition-all"
              />
            </div>
          </div>
        </div>
      </Dialog>

      {/* Appearance */}
      <Dialog
        open={showAppearanceDialog}
        onClose={() => setShowAppearanceDialog(false)}
        title="Appearance"
        icon={<Sun className="h-5 w-5 text-primary" />}
      >
        <div className="flex flex-col gap-2">
          {themeOptions.map((opt) => {
            const active = theme === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => {
                  setTheme(opt.value);
                  setShowAppearanceDialog(false);
                }}
                className={`w-full flex items-center justify-between px-4 py-3.5 rounded-xl border transition-colors ${
                  active
                    ? "border-primary/60 bg-primary/10 text-foreground"
                    : "border-border text-muted hover:text-foreground hover:bg-surface-raised"
                }`}
              >
                <span className="flex items-center gap-3">
                  {opt.icon}
                  <span className="text-sm font-semibold">{opt.label}</span>
                </span>
                {active && <Check className="h-4 w-4 text-primary" />}
              </button>
            );
          })}
        </div>
      </Dialog>

      {/* Join code */}
      <Dialog
        open={showJoinCodeDialog}
        onClose={() => setShowJoinCodeDialog(false)}
        title="Join code"
        icon={<Users className="h-5 w-5 text-primary" />}
      >
        <div className="flex flex-col items-center gap-5">
          <p className="text-sm text-muted text-center">
            Share this code so someone can join <span className="text-foreground font-semibold">{householdName || "your household"}</span>.
          </p>
          {joinCode ? (
            <>
              <div className="w-full flex items-center justify-center bg-background border border-border-strong rounded-xl py-4">
                <span className="text-2xl font-bold text-primary tracking-[0.3em]">{joinCode}</span>
              </div>
              {codeExpiresAt && (
                <div className="text-[11px] uppercase tracking-wider text-subtle">
                  Expires {new Date(codeExpiresAt).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                </div>
              )}
              <div className="flex gap-3 w-full">
                <button
                  type="button"
                  onClick={handleCopyJoinCode}
                  className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border text-sm font-bold transition-colors ${
                    copied
                      ? "border-success/40 bg-success/10 text-success"
                      : "border-border-strong text-muted hover:text-foreground hover:bg-surface-raised"
                  }`}
                >
                  {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  {copied ? "Copied" : "Copy"}
                </button>
                <button
                  type="button"
                  onClick={handleRegenerateCode}
                  className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border border-border-strong text-muted hover:text-foreground hover:bg-surface-raised text-sm font-bold transition-colors"
                >
                  <RefreshCw className="h-4 w-4" /> New code
                </button>
              </div>
            </>
          ) : (
            <button
              type="button"
              onClick={handleRegenerateCode}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-primary text-primary-fg text-sm font-bold hover:brightness-110 active:scale-95 transition-all"
            >
              <RefreshCw className="h-4 w-4" /> Generate code
            </button>
          )}
        </div>
      </Dialog>

      {/* Payment mode */}
      <Dialog
        open={showPaymentModeDialog}
        onClose={() => setShowPaymentModeDialog(false)}
        title="Payment mode"
        icon={<Users className="h-5 w-5 text-primary" />}
      >
        <div className="flex flex-col gap-4">
          <p className="text-sm text-muted">
            Currently <span className="text-foreground font-semibold">{isJointFund ? "Joint Fund" : "Direct Pay"}</span>. Switching resets every bill&apos;s contributor splits.
          </p>
          <div className="flex justify-center py-2">
            <PaymentModeToggle
              currentMode={tempMode !== null ? tempMode : isJointFund}
              onModeChange={handleModeChangeClick}
              compact={false}
            />
          </div>
        </div>
      </Dialog>

      {/* Payment mode change confirmation */}
      <Dialog
        open={showConfirm}
        onClose={handleCancelModeChange}
        title="Confirm payment mode change"
        footer={
          <>
            <DialogButton variant="ghost" onClick={handleCancelModeChange}>
              Cancel
            </DialogButton>
            <DialogButton variant="destructive" onClick={handleConfirmModeChange}>
              Confirm
            </DialogButton>
          </>
        }
      >
        <div className="flex flex-col gap-3">
          {modeChangeError && (
            <div className="bg-destructive/10 border border-destructive/50 rounded-[2px] p-3 text-destructive text-xs break-words whitespace-pre-wrap">
              <span className="font-bold">Failed to update payment mode:</span><br/>
              {modeChangeError}
            </div>
          )}
          <div className="text-[11px] uppercase tracking-wider text-subtle">Heads up</div>
          <p className="text-[15px] leading-relaxed text-foreground">
            Switching to <span className="text-primary font-semibold">{tempMode ? "Joint Fund" : "Direct Pay"}</span> will reset every bill&apos;s contributor splits.
          </p>
          <p className="text-xs leading-relaxed text-muted">
            You&apos;ll need to reconfigure who pays what. This can&apos;t be undone.
          </p>
        </div>
      </Dialog>

      {/* Leave household (#251): regular member, or owner while another owner remains */}
      <ConfirmDialog
        open={leaveDialog === "leave"}
        title="Leave household?"
        confirmLabel="Leave"
        busyLabel="Leaving…"
        showThrownMessage
        keepBusyOnSuccess
        onCancel={closeLeaveDialog}
        onConfirm={async () => {
          try {
            await leaveHousehold();
          } catch (err) {
            console.error("Failed to leave household:", err);
            throw err;
          }
          window.location.href = "/";
        }}
        message={
          <div className="flex flex-col gap-3">
            <p>
              You&apos;ll be removed from {householdName ? <span className="font-semibold">{householdName}</span> : "this household"}. Everyone else carries on.
            </p>
            <p className="text-sm text-muted">
              Your pay schedule, pay history, bill splits and contributions are deleted. Bills, expenses and goals you were assigned stay, but unassigned. You&apos;ll need to create or join a household again.
            </p>
          </div>
        }
      />

      {/* Hand over ownership, then leave (only owner, other accepted members remain) */}
      <Dialog
        open={leaveDialog === "transfer"}
        onClose={closeLeaveDialog}
        title="Pick a new owner"
        footer={
          <>
            <DialogButton variant="ghost" onClick={closeLeaveDialog} disabled={isLeavingHousehold}>
              Cancel
            </DialogButton>
            <DialogButton
              variant="destructive"
              className="min-h-[44px]"
              disabled={isLeavingHousehold || newOwnerId === null}
              onClick={() => runLeaveAction(() => leaveHousehold(newOwnerId ?? undefined))}
            >
              {isLeavingHousehold ? "Leaving…" : "Make owner and leave"}
            </DialogButton>
          </>
        }
      >
        <div className="flex flex-col gap-3">
          <p className="text-[15px] leading-relaxed text-foreground">
            You&apos;re the only owner. Choose who takes over before you leave.
          </p>
          <div className="flex flex-col gap-2" role="radiogroup" aria-label="New owner">
            {eligibleOwners.map((m) => {
              const selected = String(newOwnerId) === String(m.id);
              return (
                <button
                  key={m.id}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  disabled={isLeavingHousehold}
                  onClick={() => setNewOwnerId(m.id)}
                  className={`flex items-center justify-between gap-3 min-h-[44px] px-4 py-2 rounded-[2px] border text-left text-sm font-semibold transition-colors disabled:opacity-60 ${
                    selected
                      ? "bg-primary/10 border-primary/40 text-primary"
                      : "bg-transparent border-border-strong text-foreground"
                  }`}
                >
                  <span className="truncate">{m.name}</span>
                  {selected && <Check className="h-4 w-4 shrink-0" />}
                </button>
              );
            })}
          </div>
          <p className="text-sm leading-relaxed text-muted">
            Your pay schedule, pay history, bill splits and contributions are deleted when you leave. Bills, expenses and goals you were assigned stay, but unassigned.
          </p>
          {leaveHouseholdError && <LeaveError message={leaveHouseholdError} />}
          <button
            type="button"
            disabled={isLeavingHousehold}
            onClick={() => {
              setLeaveHouseholdError(null);
              setDeleteText("");
              setLeaveDialog("delete");
            }}
            className="self-start min-h-[44px] text-sm font-semibold text-destructive disabled:opacity-50"
          >
            Delete household instead
          </button>
        </div>
      </Dialog>

      {/* Delete household: needs DELETE typed. Only reachable while no other owner remains. */}
      <Dialog
        open={leaveDialog === "delete"}
        onClose={closeLeaveDialog}
        title="Delete household?"
        footer={
          <>
            <DialogButton variant="ghost" onClick={closeLeaveDialog} disabled={isLeavingHousehold}>
              Cancel
            </DialogButton>
            <DialogButton
              variant="destructive"
              className="min-h-[44px]"
              disabled={isLeavingHousehold || !isDeleteConfirmed(deleteText)}
              onClick={() => runLeaveAction(() => deleteHousehold())}
            >
              {isLeavingHousehold ? "Deleting…" : "Delete household"}
            </DialogButton>
          </>
        }
      >
        <div className="flex flex-col gap-3">
          <p className="text-[15px] leading-relaxed text-foreground">
            This permanently deletes {householdName ? <span className="font-semibold">{householdName}</span> : "this household"} for{" "}
            {acceptedCount > 1 ? `all ${acceptedCount} members` : "you"}.
          </p>
          <p className="text-sm leading-relaxed text-muted">
            Every bill, expense, goal, payday, pay history, split and contribution is lost. Other members get no notice; they land on the create-or-join screen the next time they open the app. This can&apos;t be undone.
          </p>
          <label htmlFor="delete-household-confirm" className="text-[11px] uppercase tracking-wider text-subtle">
            Type DELETE to confirm
          </label>
          <input
            id="delete-household-confirm"
            type="text"
            value={deleteText}
            onChange={(e) => setDeleteText(e.target.value)}
            disabled={isLeavingHousehold}
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="characters"
            spellCheck={false}
            className="w-full px-4 py-3 min-h-[44px] rounded-[2px] bg-surface border border-border text-foreground text-base font-medium focus:ring-2 focus:ring-primary/30 focus:border-primary outline-none disabled:opacity-60"
          />
          {leaveHouseholdError && <LeaveError message={leaveHouseholdError} />}
        </div>
      </Dialog>

      {/* Timezone (owner-only; the Row above only opens this for owners) */}
      <TimezoneDialog
        isOpen={showTimezoneDialog}
        onClose={() => setShowTimezoneDialog(false)}
        currentTimezone={householdTimezone || "Australia/Sydney"}
        onSave={updateHouseholdTimezone}
      />

      {/* Reused sheets & member modals */}
      <RemoveMemberModal
        isOpen={memberToRemove !== null}
        onClose={() => setMemberToRemove(null)}
        member={memberToRemove}
        householdMembers={members}
      />
      <EditMemberModal
        isOpen={memberToEdit !== null}
        onClose={() => setMemberToEdit(null)}
        member={memberToEdit}
        onRemoveTrigger={(m) => setMemberToRemove(m)}
      />
      <ContributionSettingsSheet
        isOpen={isContributionOpen}
        onClose={() => setIsContributionOpen(false)}
        householdMembers={members}
        contributions={householdContributions}
      />
      <RulesSettingsSheet
        isOpen={isRulesOpen}
        onClose={() => setIsRulesOpen(false)}
        householdMembers={members}
        rules={contributionRules}
        goals={funds}
        contributions={householdContributions}
      />
      <BugReportSheet
        isOpen={isBugReportOpen}
        onClose={() => setIsBugReportOpen(false)}
        session={session}
      />
      <NotificationCenter
        isOpen={isNotificationCenterOpen}
        onClose={() => setIsNotificationCenterOpen(false)}
        pushStatus={pushStatus}
        onPushStatusChange={setPushStatus}
      />
    </div>
  );
}
