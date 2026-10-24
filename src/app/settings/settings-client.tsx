"use client";

import { useState, useEffect } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import {
  User,
  Users,
  Check,
  Copy,
  RefreshCw,
  Plus,
  ChevronRight,
} from "lucide-react";
import { useApp } from "@/context/AppContext";
import { supabase } from "@/lib/supabase";
import { APP_VERSION } from "@/lib/version";
import PaymentModeSheet from "@/components/PaymentModeSheet";
import BugReportSheet from "@/components/BugReportSheet";
import PageHeader from "@/components/PageHeader";
import AvatarUpload from "@/components/AvatarUpload";
import RemoveMemberModal from "@/components/RemoveMemberModal";
import EditMemberModal from "@/components/EditMemberModal";
import NotificationCenter from "@/components/NotificationCenter";
import TimezoneDialog from "@/components/TimezoneDialog";
import SectionHeader from "@/components/ui/SectionHeader";
import Row from "@/components/ui/Row";
import Card from "@/components/ui/Card";
import Chip from "@/components/ui/Chip";
import Button from "@/components/ui/Button";
import IconCircle from "@/components/ui/IconCircle";
import Dialog, { DialogButton } from "@/components/ui/Dialog";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import SingleCard from "@/components/ui/SingleCard";
import Field from "@/components/ui/Field";
import Input from "@/components/ui/Input";
import { cn } from "@/lib/utils";
import { type Member } from "@/types";
import { leaveModeFor, eligibleNewOwners, isAcceptedMember, isDeleteConfirmed } from "@/lib/householdLeave";

/** Longest household name the box takes. */
const HOUSEHOLD_NAME_MAX = 60;

const THEME_OPTIONS: { value: "light" | "dark" | "system"; label: string }[] = [
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
  { value: "system", label: "System" },
];

/* Issue #97 (Slice 9): per-user notify hour display label. */
function formatNotifyHourLabel(hour: number): string {
  const period = hour < 12 ? "AM" : "PM";
  const displayHour = hour % 12 === 0 ? 12 : hour % 12;
  return `${displayHour}:00 ${period}`;
}

/** Small read-only tag on a member row (Owner / Member / Pending). */
function RolePill({ label, tone = "neutral" }: { label: string; tone?: "neutral" | "primary" | "accent" }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold",
        tone === "primary" && "border-primary/30 bg-primary/10 text-primary",
        tone === "accent" && "border-accent/30 bg-accent/10 text-accent",
        tone === "neutral" && "border-border bg-surface-elevated text-muted"
      )}
    >
      {label}
    </span>
  );
}

/** Round avatar: photo, else initials. */
function AvatarCircle({ url, name, initials, size }: { url?: string | null; name: string; initials: string; size: "md" | "lg" }) {
  return (
    <span
      className={cn(
        "shrink-0 overflow-hidden rounded-full flex items-center justify-center font-bold bg-surface-elevated text-muted",
        size === "lg" ? "h-14 w-14 text-lg" : "h-9 w-9 text-[11px]"
      )}
    >
      {url ? <img src={url} alt={name} className="h-full w-full object-cover" /> : initials}
    </span>
  );
}

/* ── Page Component ──────────────────────────── */
export default function SettingsClient() {
  /* Context */
  const {
    members,
    isJointFund,
    householdTimezone,
    updateHouseholdTimezone,
    householdName,
    setHouseholdName,
    session,
    showToast,
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

  /* Reused sheets */
  const [isNotificationCenterOpen, setIsNotificationCenterOpen] = useState(false);
  const [isBugReportOpen, setIsBugReportOpen] = useState(false);

  /* Inline editorial dialogs */
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showJoinCodeDialog, setShowJoinCodeDialog] = useState(false);
  const [showPaymentModeDialog, setShowPaymentModeDialog] = useState(false);
  const [showTimezoneDialog, setShowTimezoneDialog] = useState(false);
  const [showNameCard, setShowNameCard] = useState(false);
  const [nameDraft, setNameDraft] = useState("");

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
  const currentMember = members.find(
    (m) => String(m.email).toLowerCase() === String(session?.user?.email).toLowerCase()
  );
  const isCurrentUserOwner = currentMember?.role === "owner";
  const roleLabel = currentMember?.role === "owner" ? "Owner" : "Member";

  /* Profile form: the nickname is the only editable field (the email is the login, read-only). */
  const defaultName = session?.user?.user_metadata?.full_name || session?.user?.email?.split("@")[0] || "";
  const savedName = currentMember ? currentMember.name : defaultName;
  const profileEmail = currentMember?.email || session?.user?.email || "";
  const [fullName, setFullName] = useState("");
  const [profileSaved, setProfileSaved] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);
  const isDirty = fullName.trim() !== "" && fullName.trim() !== savedName;
  // Each time Profile opens (identity card or ?modal=profile), seed the box from the saved name
  // and clear old messages (derived-state reset, no effect).
  const [profileWasOpen, setProfileWasOpen] = useState(false);
  if (showProfileModal !== profileWasOpen) {
    setProfileWasOpen(showProfileModal);
    if (showProfileModal) {
      setFullName(savedName);
      setProfileError(null);
      setProfileSaved(false);
    }
  }

  /* Join code dialog */
  const [copied, setCopied] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [codeError, setCodeError] = useState<string | null>(null);

  /* ── Handlers ──────────────────────────────── */
  async function handleProfileSave() {
    setProfileError(null);
    try {
      if (currentMember) {
        await updateMember(currentMember.id, { name: fullName.trim() });
      }
      setProfileSaved(true);
      setTimeout(() => setProfileSaved(false), 2000);
    } catch (err) {
      // updateMember rethrows (#251); it already logged, so just don't claim success.
      console.error("Profile save failed:", err);
      setProfileError((err as Error)?.message || "Couldn't save your profile. Please try again.");
    }
  }

  function openNameCard() {
    setNameDraft(householdName);
    setShowNameCard(true);
  }

  function openJoinCodeDialog() {
    setCodeError(null);
    setShowJoinCodeDialog(true);
  }

  function handleCopyJoinCode() {
    if (joinCode) {
      navigator.clipboard.writeText(joinCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  async function handleRegenerateCode() {
    setCodeError(null);
    setIsRegenerating(true);
    try {
      await regenerateJoinCode();
    } catch (err) {
      setCodeError((err as Error)?.message || "Failed to generate code.");
    } finally {
      setIsRegenerating(false);
    }
  }

  /* #251: Leave / Delete household. The mode comes from who is in the
     household (see src/lib/householdLeave.ts); the leave-household and
     delete-household functions re-check it server-side, so a stale screen just
     gets a plain-English error shown in the dialog. Success redirects to "/"
     (same full-reload pattern as OnboardingJoinFlow) so the full reload lets
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

  /* Notifications row: green dot + "Daily at 9:00 AM" when push is live, amber "Off" otherwise. */
  const pushLive = Boolean(pushStatus?.hasLiveSubscription);
  const pushKnown = pushStatus !== null;

  /* ── Render ────────────────────────────────── */
  return (
    <div className="flex-1 w-full max-w-2xl mx-auto px-4 pt-4 pb-8 sm:px-6 md:pt-6 md:pb-12">
      <PageHeader title="Settings" showAvatar={false} onBack={() => router.push("/")} />

      {/* ── Identity card ───────────────────────── */}
      <Card onClick={() => setShowProfileModal(true)} className="flex items-center gap-4 p-4 mt-2 mb-8">
        <AvatarCircle
          size="lg"
          url={currentMember?.avatar_url}
          name={savedName || "You"}
          initials={currentMember?.avatar || (savedName || "?").slice(0, 2).toUpperCase()}
        />
        <div className="min-w-0 flex-1">
          <h2 className="font-bold text-xl text-foreground truncate">
            {savedName || "Your account"}
          </h2>
          <div className="text-xs text-muted mt-1 truncate">
            {householdName || "Household"} · {roleLabel}
          </div>
        </div>
        <ChevronRight className="h-[17px] w-[17px] shrink-0 text-subtle" aria-hidden="true" />
      </Card>

      {/* ── Preferences ─────────────────────────── */}
      <section className="pb-2">
        <SectionHeader title="Preferences" />
        <Row label="Notifications" chevron tall onClick={() => setIsNotificationCenterOpen(true)}>
          <span className="flex items-center gap-2 text-[13px] text-muted">
            {pushKnown && (
              <span
                aria-hidden="true"
                className={cn(
                  "h-2 w-2 rounded-full transition-colors duration-(--duration-structural) ease-(--ease-enter)",
                  pushLive ? "bg-success" : "bg-accent"
                )}
              />
            )}
            {!pushKnown || !notificationSettings
              ? "—"
              : pushLive
                ? `Daily at ${formatNotifyHourLabel(notificationSettings.notify_hour)}`
                : "Off, tap to turn on"}
          </span>
        </Row>
        <div className="py-2.5">
          <div className="mb-2 text-[15px] text-foreground/85">Appearance</div>
          <div className="grid grid-cols-3 gap-2" role="group" aria-label="Appearance">
            {THEME_OPTIONS.map((opt) => (
              <Chip
                key={opt.value}
                selected={theme === opt.value}
                onClick={() => setTheme(opt.value)}
                className="w-full justify-center px-2"
              >
                {opt.label}
              </Chip>
            ))}
          </div>
        </div>
      </section>

      {/* ── Members ──────────────────────────────── */}
      <section className="pt-6 pb-2">
        <SectionHeader
          title="Members"
          count={members.length}
          trailing={
            isCurrentUserOwner ? (
              <IconCircle label="Invite member" onClick={openJoinCodeDialog} className="-my-2.5">
                <Plus size={18} aria-hidden="true" />
              </IconCircle>
            ) : undefined
          }
        />
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
              tall
              chevron={canManage}
              onClick={canManage ? () => setMemberToEdit(member) : undefined}
              label={
                <span className="flex items-center gap-3 min-w-0">
                  <AvatarCircle size="md" url={member.avatar_url} name={member.name} initials={member.avatar} />
                  <span className="text-sm font-semibold text-foreground truncate">{member.name}</span>
                </span>
              }
            >
              <span className="flex items-center gap-1.5">
                {member.invitation_status === "pending" && <RolePill label="Pending" tone="accent" />}
                <RolePill label={isOwner ? "Owner" : "Member"} tone={isOwner ? "primary" : "neutral"} />
              </span>
            </Row>
          );
        })}
      </section>

      {/* ── Household ────────────────────────────── */}
      <section className="pt-6 pb-2">
        <SectionHeader title="Household" />
        <Row
          label="Household name"
          value={<span className="block max-w-[11rem] truncate">{householdName || "—"}</span>}
          tall
          chevron={isCurrentUserOwner}
          onClick={isCurrentUserOwner ? openNameCard : undefined}
        />
        <Row
          label="Payment mode"
          value={isJointFund ? "Joint Fund" : "Direct Pay"}
          tall
          chevron={isCurrentUserOwner}
          onClick={isCurrentUserOwner ? () => setShowPaymentModeDialog(true) : undefined}
        />
        <Row
          label="Timezone"
          value={(householdTimezone || "Australia/Sydney").replace(/_/g, " ")}
          tall
          chevron={isCurrentUserOwner}
          onClick={isCurrentUserOwner ? () => setShowTimezoneDialog(true) : undefined}
        />
        {!isCurrentUserOwner && <p className="pt-1 text-xs text-subtle">Owner only: ask an owner to change these.</p>}
      </section>

      {/* ── Help card: Updates, Getting started, Report an issue ── */}
      <Card className="mt-6 px-4">
        <Row label="Updates" value={`v${APP_VERSION}`} href="/patch-notes" chevron tall />
        <Row label="Getting started" href="/getting-started" chevron tall divider />
        <Row label="Report an issue" onClick={() => setIsBugReportOpen(true)} chevron tall divider />
      </Card>

      {/* ── Log out, then Leave household in its own red card ── */}
      <Card
        onClick={async () => {
          try {
            const { error } = await supabase.auth.signOut();
            if (error) throw error;
            router.push("/login");
          } catch (err) {
            console.error("Log out failed:", err);
            showToast({ message: "Couldn't log out. Check your connection and try again." });
          }
        }}
        className="mt-6 flex min-h-11 items-center px-4 py-3 text-[15px] font-medium text-foreground"
      >
        Log out
      </Card>
      <Card
        onClick={openLeaveDialog}
        className="mt-10 flex min-h-11 items-center border-destructive/40 px-4 py-3 text-[15px] font-semibold text-destructive"
      >
        {leaveMode === "delete-only" ? "Delete household" : "Leave household"}
      </Card>

      <div className="pt-8 pb-2 text-center text-[10px] text-subtle/60">© 2026 HazardousSchematics.com</div>

      {/* ══════════════ Dialogs & sheets ══════════════ */}

      {/* Profile */}
      <Dialog
        open={showProfileModal}
        onClose={() => setShowProfileModal(false)}
        title="Profile"
        icon={<User className="h-5 w-5 text-primary" />}
        error={profileError}
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
                "Save"
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

          <Field id="settings-name" label="Nickname">
            <Input
              id="settings-name"
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
            />
          </Field>

          <Field
            id="settings-email"
            label="Email"
            description="Your email is your login, so it can't be changed here."
          >
            <p id="settings-email" className="text-[15px] text-foreground break-all">
              {profileEmail}
            </p>
          </Field>
        </div>
      </Dialog>

      {/* Household name (owner-only; the Row above only opens this for owners) */}
      <SingleCard
        open={showNameCard}
        onClose={() => setShowNameCard(false)}
        title="Household name"
        submitLabel="Save"
        canSubmit={nameDraft.trim() !== "" && nameDraft.trim() !== householdName}
        onSubmit={() => setHouseholdName(nameDraft)}
        successToast="Household name updated"
        showThrownMessage
      >
        <Field id="household-name" label="Name">
          <Input
            id="household-name"
            type="text"
            value={nameDraft}
            maxLength={HOUSEHOLD_NAME_MAX}
            onChange={(e) => setNameDraft(e.target.value)}
            autoComplete="off"
            autoFocus
          />
        </Field>
      </SingleCard>

      {/* Join code (opened by the owner "+" on Members) */}
      <Dialog
        open={showJoinCodeDialog}
        onClose={() => setShowJoinCodeDialog(false)}
        title="Join code"
        icon={<Users className="h-5 w-5 text-primary" />}
        busy={isRegenerating}
        error={codeError}
      >
        <div className="flex flex-col items-center gap-5">
          <p className="text-sm text-muted text-center">
            Share this code so someone can join <span className="text-foreground font-semibold">{householdName || "your household"}</span>.
          </p>
          {joinCode ? (
            <>
              <div className="w-full flex items-center justify-center bg-background border border-border-strong rounded-card py-4">
                <span className="text-2xl font-bold text-primary tracking-[0.3em]">{joinCode}</span>
              </div>
              {codeExpiresAt && (
                <div className="text-[11px] uppercase tracking-wider text-subtle">
                  Expires {new Date(codeExpiresAt).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                </div>
              )}
              <div className="flex gap-3 w-full">
                <Button variant="ghost" onClick={handleCopyJoinCode} className="flex-1">
                  {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  {copied ? "Copied" : "Copy"}
                </Button>
                {isCurrentUserOwner && (
                  <Button variant="ghost" onClick={handleRegenerateCode} disabled={isRegenerating} className="flex-1">
                    <RefreshCw className="h-4 w-4" /> {isRegenerating ? "Working…" : "New code"}
                  </Button>
                )}
              </div>
            </>
          ) : isCurrentUserOwner ? (
            <Button fullWidth onClick={handleRegenerateCode} disabled={isRegenerating}>
              <RefreshCw className="h-4 w-4" /> {isRegenerating ? "Working…" : "Generate code"}
            </Button>
          ) : (
            <p className="text-sm text-muted text-center">Ask an owner for a code.</p>
          )}
        </div>
      </Dialog>

      {/* Payment mode (owner-only): two cards, warning and red pill appear on picking the other */}
      <PaymentModeSheet open={showPaymentModeDialog} onClose={() => setShowPaymentModeDialog(false)} />

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
        busy={isLeavingHousehold}
        error={leaveHouseholdError}
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
                  className={`flex items-center justify-between gap-3 min-h-11 px-4 py-2 rounded-card border text-left text-sm font-semibold transition-colors disabled:opacity-60 ${
                    selected
                      ? "border-transparent ring-2 ring-inset ring-primary bg-surface-raised text-foreground"
                      : "border-border-strong bg-surface-raised text-foreground"
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
      <ConfirmDialog
        open={leaveDialog === "delete"}
        title="Delete household?"
        confirmLabel="Delete"
        busyLabel="Deleting…"
        canConfirm={isDeleteConfirmed(deleteText)}
        showThrownMessage
        keepBusyOnSuccess
        errorMessage="That didn't work. Please check your connection and try again."
        onCancel={closeLeaveDialog}
        onConfirm={async () => {
          setIsLeavingHousehold(true);
          try {
            await deleteHousehold();
          } catch (err) {
            console.error("Failed to delete household:", err);
            setIsLeavingHousehold(false);
            throw err;
          }
          window.location.href = "/";
        }}
        message={
          <div className="flex flex-col gap-3">
            <p>
              This permanently deletes {householdName ? <span className="font-semibold">{householdName}</span> : "this household"} for{" "}
              {acceptedCount > 1 ? `all ${acceptedCount} members` : "you"}.
            </p>
            <p className="text-sm leading-relaxed text-muted">
              Every bill, expense, goal, payday, pay history, split and contribution is lost. Other members get no notice; they land on the create-or-join screen the next time they open the app. This can&apos;t be undone.
            </p>
          </div>
        }
      >
        <Field id="delete-household-confirm" label="Type DELETE to confirm" className="text-left">
          <Input
            id="delete-household-confirm"
            type="text"
            value={deleteText}
            onChange={(e) => setDeleteText(e.target.value)}
            disabled={isLeavingHousehold}
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="characters"
            spellCheck={false}
          />
        </Field>
      </ConfirmDialog>

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
