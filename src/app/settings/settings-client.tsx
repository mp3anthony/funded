"use client";

import { useState, useEffect } from "react";
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
import PaymentModeToggle from "@/components/PaymentModeToggle";
import ContributionSettingsSheet from "@/components/ContributionSettingsSheet";
import RulesSettingsSheet from "@/components/RulesSettingsSheet";
import PageHeader from "@/components/PageHeader";
import AvatarUpload from "@/components/AvatarUpload";
import RemoveMemberModal from "@/components/RemoveMemberModal";
import EditMemberModal from "@/components/EditMemberModal";
import JoinHouseholdSheet from "@/components/JoinHouseholdSheet";
import NotificationCenter from "@/components/NotificationCenter";
import SectionHeader from "@/components/ui/SectionHeader";
import Row from "@/components/ui/Row";
import Dialog, { DialogButton } from "@/components/ui/Dialog";
import { type Member } from "@/types";

/* ── Page Component ──────────────────────────── */
export default function SettingsClient() {
  /* Context */
  const {
    members,
    isJointFund,
    updateHouseholdPaymentMode,
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
    notifications,
  } = useApp();

  /* Payment mode confirm flow */
  const [tempMode, setTempMode] = useState<boolean | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [modeChangeError, setModeChangeError] = useState<string | null>(null);

  /* Reused sheets */
  const [isContributionOpen, setIsContributionOpen] = useState(false);
  const [isRulesOpen, setIsRulesOpen] = useState(false);
  const [isNotificationCenterOpen, setIsNotificationCenterOpen] = useState(false);
  const [isJoinSheetOpen, setIsJoinSheetOpen] = useState(false);

  /* Inline editorial dialogs */
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showAppearanceDialog, setShowAppearanceDialog] = useState(false);
  const [showJoinCodeDialog, setShowJoinCodeDialog] = useState(false);
  const [showPaymentModeDialog, setShowPaymentModeDialog] = useState(false);

  /* Member management modals */
  const [memberToRemove, setMemberToRemove] = useState<Member | null>(null);
  const [memberToEdit, setMemberToEdit] = useState<Member | null>(null);

  /* Deep-link: open the Profile dialog when arriving via /settings?modal=profile
     (e.g. from the avatar-dropdown name button). Reactive to the query param so
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
  const unreadCount = notifications.filter((n) => !n.is_read).length;

  const currentMember = members.find(
    (m) => String(m.email).toLowerCase() === String(session?.user?.email).toLowerCase()
  );
  const isCurrentUserOwner = currentMember?.role === "owner";
  const roleLabel = currentMember?.role === "owner" ? "Owner" : "Member";

  /* Profile form */
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [profileSaved, setProfileSaved] = useState(false);
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
    if (currentMember) {
      await updateMember(currentMember.id, { name: fullName, email: email });
    }
    setProfileSaved(true);
    setIsDirty(false);
    setTimeout(() => setProfileSaved(false), 2000);
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

  const themeOptions: { value: "light" | "dark" | "system"; label: string; icon: React.ReactNode }[] = [
    { value: "light", label: "Light", icon: <Sun className="h-[18px] w-[18px]" /> },
    { value: "dark", label: "Dark", icon: <Moon className="h-[18px] w-[18px]" /> },
    { value: "system", label: "System", icon: <Monitor className="h-[18px] w-[18px]" /> },
  ];
  const currentThemeLabel = theme.charAt(0).toUpperCase() + theme.slice(1);

  /* ── Render ────────────────────────────────── */
  return (
    <div className="flex-1 w-full max-w-2xl mx-auto px-6 pt-4 pb-10 md:pt-6">
      <PageHeader title="Settings" />

      {/* ── Identity anchor ─────────────────────── */}
      <div className="flex items-center gap-4 pt-2 pb-8">
        <div className="h-14 w-14 rounded-2xl overflow-hidden shrink-0 flex items-center justify-center font-mono font-bold text-lg text-primary-fg bg-gradient-to-br from-primary to-success">
          {currentMember?.avatar_url ? (
            <img src={currentMember.avatar_url} alt={currentMember.name} className="h-full w-full object-cover" />
          ) : (
            currentMember?.avatar || (currentMember?.name || fullName || "?").slice(0, 2).toUpperCase()
          )}
        </div>
        <div className="min-w-0">
          <h2 className="font-heading font-bold text-xl text-foreground truncate">
            {currentMember?.name || fullName || "Your account"}
          </h2>
          <div className="font-mono text-xs text-muted mt-1 tracking-wide truncate">
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
          {unreadCount > 0 ? (
            <span className="font-mono text-xs font-semibold text-primary">{unreadCount} new</span>
          ) : (
            <span className="font-mono text-[13px] text-muted">On</span>
          )}
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
                <span className="font-mono text-xs font-semibold text-primary">{activeRulesCount} active</span>
              ) : (
                <span className="font-mono text-[13px] text-muted">Off</span>
              )}
            </Row>
          </>
        )}
        <Row label="Join code" chevron onClick={() => setShowJoinCodeDialog(true)}>
          {joinCode ? (
            <span className="font-mono text-sm font-bold text-primary tracking-widest">{joinCode}</span>
          ) : (
            <span className="font-mono text-[13px] text-muted">None</span>
          )}
        </Row>
        <Row
          label="Payment mode"
          value={isJointFund ? "Joint Fund" : "Direct Pay"}
          chevron
          onClick={() => setShowPaymentModeDialog(true)}
        />
      </section>

      {/* ── Members ──────────────────────────────── */}
      <section className="pt-6 pb-2">
        <SectionHeader title="Members" count={members.length} />
        {members.map((member) => {
          const isCurrentUser =
            String(member.email).toLowerCase() === String(session?.user?.email).toLowerCase();
          const isOwner = member.role === "owner";
          const canManage = isCurrentUserOwner && !isCurrentUser;
          return (
            <Row
              key={member.id}
              divider
              chevron={canManage}
              onClick={canManage ? () => setMemberToEdit(member) : undefined}
              label={
                <span className="flex items-center gap-3 min-w-0">
                  <span className="h-9 w-9 rounded-xl overflow-hidden shrink-0 flex items-center justify-center font-mono text-[11px] font-bold bg-surface-elevated text-muted data-[owner=true]:bg-gradient-to-br data-[owner=true]:from-primary data-[owner=true]:to-success data-[owner=true]:text-primary-fg"
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
                    <span className="font-mono text-[10px] uppercase tracking-wider text-subtle mt-0.5">
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

      {/* ── Leave household + version ────────────── */}
      <section className="pt-8">
        <button
          type="button"
          onClick={() => {
            if (
              confirm(
                "WARNING: This will permanently delete your current household data (if you are the owner) or remove your membership (if you are a member). You cannot undo this. Are you sure you want to continue?"
              )
            ) {
              setIsJoinSheetOpen(true);
            }
          }}
          className="w-full text-left py-3 border-t border-border text-sm font-medium text-destructive"
        >
          Leave household
        </button>
        <div className="text-center pt-8 pb-2">
          <div className="font-mono text-[10px] tracking-wider text-subtle/70">funded. v0.9.5</div>
          <div className="font-mono text-[10px] text-subtle/50 mt-1">Concept &amp; development · Anthony Paull</div>
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
            <label htmlFor="settings-name" className="block font-mono text-[11px] uppercase tracking-wider text-subtle mb-2">
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
            <label htmlFor="settings-email" className="block font-mono text-[11px] uppercase tracking-wider text-subtle mb-2">
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
                <span className="font-mono text-2xl font-bold text-primary tracking-[0.3em]">{joinCode}</span>
              </div>
              {codeExpiresAt && (
                <div className="font-mono text-[11px] uppercase tracking-wider text-subtle">
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
            <div className="bg-destructive/10 border border-destructive/50 rounded-[2px] p-3 text-destructive text-xs font-mono break-words whitespace-pre-wrap">
              <span className="font-bold">Failed to update payment mode:</span><br/>
              {modeChangeError}
            </div>
          )}
          <div className="font-mono text-[11px] uppercase tracking-wider text-subtle">Heads up</div>
          <p className="text-[15px] leading-relaxed text-foreground">
            Switching to <span className="text-primary font-semibold">{tempMode ? "Joint Fund" : "Direct Pay"}</span> will reset every bill&apos;s contributor splits.
          </p>
          <p className="font-mono text-xs leading-relaxed text-muted">
            You&apos;ll need to reconfigure who pays what. This can&apos;t be undone.
          </p>
        </div>
      </Dialog>

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
      <NotificationCenter
        isOpen={isNotificationCenterOpen}
        onClose={() => setIsNotificationCenterOpen(false)}
      />
      <JoinHouseholdSheet isOpen={isJoinSheetOpen} onClose={() => setIsJoinSheetOpen(false)} />
    </div>
  );
}
