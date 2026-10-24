"use client";

import { useState } from "react";
import { Bell, Settings as SettingsIcon, Clock, AlertTriangle, CheckCircle, Circle, Trash2 } from "lucide-react";
import { useApp, type Notification, type NotificationSettings } from "@/context/AppContext";
import Dialog from "@/components/ui/Dialog";
import Chip from "@/components/ui/Chip";
import IconCircle from "@/components/ui/IconCircle";
import Row from "@/components/ui/Row";
import NotifyHourDialog from "@/components/NotifyHourDialog";
import PushStatusDialog from "@/components/PushStatusDialog";
import { useRouter } from "next/navigation";
import type { PushStatus } from "@/lib/pushClient";
import { getNotificationDestination } from "@/lib/notifications/destination";

interface NotificationCenterProps {
  isOpen: boolean;
  onClose: () => void;
  /** Slice 13 (#99): this device's push subscription health, centralized in
   *  AppContext (a single getPushStatus() check + auto-heal effect per
   *  session, see review finding 1/2) and passed down so this component's
   *  two mount points (AppShell's floating bell + settings-client.tsx) and
   *  the Settings row's status dot all reflect the same shared state. */
  pushStatus: PushStatus | null;
  onPushStatusChange: (status: PushStatus) => void;
}

/* Slice 13 (#99): "Notify me at" moved into this panel — matches the label
   format already used in settings-client.tsx / NotifyHourDialog.tsx. */
function formatHourLabel(hour: number): string {
  const period = hour < 12 ? "AM" : "PM";
  const displayHour = hour % 12 === 0 ? 12 : hour % 12;
  return `${displayHour}:00 ${period}`;
}

/** On/off switch (R13). Local to this panel; the label is the accessible name. */
function Switch({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: () => void;
  label: string;
}) {
  return (
    <label className="relative inline-flex cursor-pointer items-center">
      <input
        type="checkbox"
        className="peer sr-only"
        aria-label={label}
        checked={checked}
        onChange={onChange}
      />
      <div className="h-6 w-11 rounded-full border border-border bg-border transition-colors duration-(--duration-feedback) peer-checked:bg-primary after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:after:translate-x-full peer-checked:after:border-white" />
    </label>
  );
}

/** A switch row: title and helper text on the left, the switch on the right. */
function SettingRow({
  title,
  description,
  checked,
  onChange,
  divider,
}: {
  title: string;
  description: string;
  checked: boolean;
  onChange: () => void;
  divider?: boolean;
}) {
  return (
    <Row
      divider={divider}
      className="min-h-11 px-6"
      label={
        <span className="block">
          <span className="block font-semibold text-foreground">{title}</span>
          <span className="block text-xs text-muted">{description}</span>
        </span>
      }
    >
      <Switch checked={checked} onChange={onChange} label={title} />
    </Row>
  );
}

const TYPE_SETTINGS: {
  key: keyof NotificationSettings;
  title: string;
  description: string;
}[] = [
  { key: "manual_bill_reminders", title: "Manual bill reminders", description: "Alerts when a manual bill is due." },
  { key: "auto_pay_reminders", title: "Auto-pay reminders", description: "Alerts for upcoming or missed auto-pay bills." },
  { key: "overdue_bill_reminders", title: "Daily overdue reminders", description: "Repeat overdue bill alerts daily until paid." },
  { key: "lodge_payment_reminders", title: "Confirm pending pay reminders", description: "Alerts when a scheduled payment needs confirmation." },
  { key: "payday_reminders", title: "Payday reminders", description: "Alerts when it's time to log your pay." },
  { key: "goal_milestone_reminders", title: "Goal milestone reminders", description: "Alerts when a goal reaches 25/50/75/100% of its target." },
];

export default function NotificationCenter({ isOpen, onClose, pushStatus, onPushStatusChange }: NotificationCenterProps) {
  const { notifications, notificationSettings, deleteNotification, clearAllNotifications, updateNotificationSettings, showToast } = useApp();
  const [activeTab, setActiveTab] = useState<"list" | "settings">("list");
  const [showNotifyHourDialog, setShowNotifyHourDialog] = useState(false);
  const [showPushStatusDialog, setShowPushStatusDialog] = useState(false);
  const router = useRouter();

  if (!isOpen) return null;

  const handleToggleSetting = async (key: keyof NotificationSettings) => {
    if (!notificationSettings) return;
    const currentVal = notificationSettings[key];
    if (typeof currentVal === 'boolean') {
      try {
        await updateNotificationSettings({ [key]: !currentVal });
      } catch {
        // The switch stays where it was (state only changes on a saved write); say so.
        showToast({ message: "Couldn't save that change. Check your connection and try again." });
      }
    }
  };

  const handleNotificationClick = (notif: Notification) => {
    const destination = getNotificationDestination(notif);
    if (destination) {
      router.push(destination);
      onClose();
    }
  };

  const getIconForType = (type: string) => {
    switch (type) {
      case 'manual_bill': return <Clock size={20} className="text-accent-ink" />;
      case 'auto_pay': return <AlertTriangle size={20} className="text-rose-500" />;
      case 'lodge_payment': return <CheckCircle size={20} className="text-primary-ink" />;
      case 'payday_log_pay': return <Clock size={20} className="text-primary-ink" />;
      case 'goal_milestone': return <CheckCircle size={20} className="text-secondary" />;
      default: return <Bell size={20} className="text-muted" />;
    }
  };

  return (
    <>
    <Dialog
      open={isOpen}
      onClose={onClose}
      title="Notifications"
      icon={<Bell size={20} />}
      subheader={
        /* Tabs — non-scrolling region above the body */
        <div className="flex gap-2 border-b border-border px-5 py-3">
          <Chip selected={activeTab === "list"} onClick={() => setActiveTab("list")}>
            Inbox
          </Chip>
          <Chip selected={activeTab === "settings"} onClick={() => setActiveTab("settings")}>
            <SettingsIcon size={14} /> Settings
          </Chip>
        </div>
      }
    >
      {/* Content Body — horizontal full-bleed to card edges (no vertical over-pull) */}
      <div className="-mx-5">
          {activeTab === "list" ? (
            <div className="divide-y divide-border">
              {(() => {
                const visibleNotifications = notifications.filter(notif => {
                  // Dismissed notifications are kept in the DB (so their dedupe
                  // key survives) but hidden from the inbox.
                  if (notif.is_read) return false;
                  return true;
                });

                if (visibleNotifications.length === 0) {
                  return (
                    <div className="p-8 text-center text-muted flex flex-col items-center gap-3">
                      <CheckCircle size={40} className="text-border" />
                      <p>You&apos;re all caught up!</p>
                    </div>
                  );
                }

                return (
                  <>
                    <div className="flex justify-between items-center px-6 py-2.5 bg-surface-elevated border-b border-border text-xs text-muted">
                      <span className="font-semibold">{visibleNotifications.length} active alerts</span>
                      <button
                        type="button"
                        onClick={clearAllNotifications}
                        className="font-bold text-rose-500 transition-colors flex items-center gap-1 cursor-pointer focus:outline-none"
                      >
                        <Trash2 size={12} /> Clear all
                      </button>
                    </div>
                    {visibleNotifications.map(notif => {
                      const isTappable = getNotificationDestination(notif) !== null;
                      const content = (
                        <>
                          <span className="mt-1 shrink-0">{getIconForType(notif.type)}</span>
                          <span className="block min-w-0 flex-1 space-y-1">
                            <span className="flex items-center justify-between text-sm font-semibold text-foreground">
                              <span>{notif.title}</span>
                              {!notif.is_read && <Circle size={8} fill="currentColor" className="text-primary-ink" />}
                            </span>
                            <span className="block text-sm text-muted">{notif.message}</span>
                            <span className="block text-[10px] uppercase tracking-wider text-muted-foreground">
                              {new Date(notif.created_at).toLocaleDateString()}
                            </span>
                            {isTappable && (
                              <span className="mt-0.5 flex items-center gap-1 text-[9px] font-semibold uppercase tracking-widest text-muted/60">
                                Tap for more
                                <span aria-hidden="true">›</span>
                              </span>
                            )}
                          </span>
                        </>
                      );
                      return (
                        <div
                          key={notif.id}
                          className="flex items-start gap-2 bg-surface-elevated px-6 py-3"
                        >
                          {isTappable ? (
                            <button
                              type="button"
                              onClick={() => handleNotificationClick(notif)}
                              className="press-tint flex min-w-0 flex-1 items-start gap-4 text-left"
                            >
                              {content}
                            </button>
                          ) : (
                            <div className="flex min-w-0 flex-1 items-start gap-4">{content}</div>
                          )}
                          {/* Clear/Delete — the row's one action, sized to stand alone. */}
                          <IconCircle
                            label="Clear notification"
                            onClick={() => deleteNotification(notif.id)}
                            className="-mr-2 self-start"
                          >
                            <Trash2 size={16} />
                          </IconCircle>
                        </div>
                      );
                    })}
                  </>
                );
              })()}
            </div>
          ) : (
            <div className="py-3">
              {notificationSettings ? (
                <>
                  <SettingRow
                    title="Enabled"
                    description="In-app & push reminders"
                    checked={notificationSettings.all_enabled}
                    onChange={() => handleToggleSetting("all_enabled")}
                  />

                  {/* Notify me at (#97) — relocated here from its own top-level
                      Settings row (Slice 13, #99 merge). Same NotifyHourDialog,
                      unchanged storage — just triggered from this panel now. */}
                  <Row
                    tall
                    chevron
                    divider
                    className="px-6"
                    onClick={() => setShowNotifyHourDialog(true)}
                    label={
                      <span className="block">
                        <span className="block font-semibold text-foreground">Notify me at</span>
                        <span className="block text-xs text-muted">Preferred delivery hour</span>
                      </span>
                    }
                    value={formatHourLabel(notificationSettings.notify_hour)}
                  />

                  {/* Push status (#96 half A) — plain status when live; a
                      single tappable row reusing PushStatusDialog's enable
                      flow when action is needed. This is NOT a second switch. */}
                  {pushStatus && pushStatus.supported && (
                    pushStatus.hasLiveSubscription ? (
                      <Row
                        divider
                        className="min-h-11 px-6"
                        label={<span className="font-semibold text-foreground">Push on this device</span>}
                      >
                        <span className="flex items-center gap-1.5 text-xs text-muted">
                          <span className="h-1.5 w-1.5 rounded-full bg-success" /> Active
                        </span>
                      </Row>
                    ) : (
                      <Row
                        tall
                        chevron
                        divider
                        className="px-6"
                        onClick={() => setShowPushStatusDialog(true)}
                        label={
                          <span className="block">
                            <span className="block font-semibold text-foreground">Push on this device</span>
                            <span className="block text-sm text-accent-ink">Needs attention</span>
                          </span>
                        }
                      />
                    )
                  )}

                  <div className={notificationSettings.all_enabled ? "" : "opacity-50 pointer-events-none"}>
                    <h4 className="px-6 pb-1 pt-5 text-xs font-semibold uppercase tracking-wider text-muted">
                      Notification types
                    </h4>
                    {TYPE_SETTINGS.map((t) => (
                      <SettingRow
                        key={t.key}
                        divider
                        title={t.title}
                        description={t.description}
                        checked={Boolean(notificationSettings[t.key])}
                        onChange={() => handleToggleSetting(t.key)}
                      />
                    ))}
                  </div>
                </>
              ) : (
                <div className="text-center p-4">Loading settings...</div>
              )}
            </div>
          )}
        </div>
    </Dialog>

    {/* Notify hour (nested — same NotifyHourDialog used everywhere, unchanged) */}
    <NotifyHourDialog
      isOpen={showNotifyHourDialog}
      onClose={() => setShowNotifyHourDialog(false)}
      currentHour={notificationSettings?.notify_hour ?? 9}
      onSave={(hour) => updateNotificationSettings({ notify_hour: hour })}
    />

    {/* Push status (nested — reuses PushStatusDialog's enable flow
        for the one case that needs action) */}
    {pushStatus && (
      <PushStatusDialog
        isOpen={showPushStatusDialog}
        onClose={() => setShowPushStatusDialog(false)}
        status={pushStatus}
        onStatusChange={onPushStatusChange}
      />
    )}
    </>
  );
}
