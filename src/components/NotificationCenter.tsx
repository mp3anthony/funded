"use client";

import { useEffect, useState } from "react";
import { Bell, Settings as SettingsIcon, CheckCircle, Clock, AlertTriangle, Circle, Trash2, ChevronRight } from "lucide-react";
import { useApp, type Notification, type NotificationSettings } from "@/context/AppContext";
import Dialog from "@/components/ui/Dialog";
import NotifyHourDialog from "@/components/NotifyHourDialog";
import PushStatusDialog from "@/components/PushStatusDialog";
import { useRouter } from "next/navigation";
import type { PushStatus } from "@/lib/pushClient";

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

export default function NotificationCenter({ isOpen, onClose, pushStatus, onPushStatusChange }: NotificationCenterProps) {
  const { bills, markAsPaid, notifications, notificationSettings, markNotificationRead, deleteNotification, clearAllNotifications, updateNotificationSettings } = useApp();
  const [activeTab, setActiveTab] = useState<"list" | "settings">("list");
  const [showNotifyHourDialog, setShowNotifyHourDialog] = useState(false);
  const [showPushStatusDialog, setShowPushStatusDialog] = useState(false);

  const [snoozedIds, setSnoozedIds] = useState<Record<string, number>>(() => {
    if (typeof window === 'undefined') return {};
    const snoozes: Record<string, number> = {};
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith("snooze-")) {
        const id = key.substring(7);
        const val = localStorage.getItem(key);
        if (val) {
          snoozes[id] = parseInt(val);
        }
      }
    }
    return snoozes;
  });
  
  // Start at 0 (not Date.now()) so static prerender doesn't read the current
  // time during render (cacheComponents forbids it outside Suspense — see #47).
  // The open effect sets the real time before any snooze comparison is shown.
  const [nowVal, setNowVal] = useState(0);
  const [activeSnoozeMenuId, setActiveSnoozeMenuId] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    if (!isOpen) return;

    // Asynchronously load state to avoid set-state-in-effect warning
    Promise.resolve().then(() => {
      setNowVal(Date.now());
      if (typeof window !== 'undefined') {
        const snoozes: Record<string, number> = {};
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && key.startsWith("snooze-")) {
            const id = key.substring(7);
            const val = localStorage.getItem(key);
            if (val) {
              snoozes[id] = parseInt(val);
            }
          }
        }
        setSnoozedIds(snoozes);
      }
    });
  }, [isOpen]);

  if (!isOpen) return null;

  const handleToggleSetting = async (key: keyof NotificationSettings) => {
    if (!notificationSettings) return;
    const currentVal = notificationSettings[key];
    if (typeof currentVal === 'boolean') {
      await updateNotificationSettings({ [key]: !currentVal });
    }
  };

  const handleMarkAsPaid = async (notif: Notification) => {
    if (!notif.related_entity_id) return;
    const bill = bills.find(b => b.id.toString() === notif.related_entity_id);
    if (bill) {
      await markAsPaid(bill);
    }
    await deleteNotification(notif.id);
  };

  const handleSnooze = (id: string, days: number) => {
    const until = Date.now() + days * 24 * 60 * 60 * 1000;
    localStorage.setItem(`snooze-${id}`, until.toString());
    setSnoozedIds(prev => ({ ...prev, [id]: until }));
    setActiveSnoozeMenuId(null);
  };

  const handleNotificationClick = (notif: Notification) => {
    if (notif.related_entity_id && (notif.type === 'manual_bill' || notif.type === 'auto_pay')) {
      router.push(`/bills?billId=${notif.related_entity_id}`);
      onClose();
    }
  };

  const getIconForType = (type: string) => {
    switch (type) {
      case 'manual_bill': return <Clock size={20} className="text-accent" />;
      case 'auto_pay': return <AlertTriangle size={20} className="text-rose-500" />;
      case 'lodge_payment': return <CheckCircle size={20} className="text-primary" />;
      case 'payday_log_pay': return <Clock size={20} className="text-primary" />;
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
        <div className="flex space-x-4 border-b border-border-strong px-5 pt-1">
            <button
              className={`pb-2 px-1 text-sm font-semibold transition-colors relative ${activeTab === 'list' ? 'text-primary' : 'text-muted hover:text-foreground'}`}
              onClick={() => setActiveTab('list')}
            >
              Inbox
              {activeTab === 'list' && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-t-full" />
              )}
            </button>
            <button
              className={`pb-2 px-1 text-sm font-semibold transition-colors flex items-center gap-1 relative ${activeTab === 'settings' ? 'text-primary' : 'text-muted hover:text-foreground'}`}
              onClick={() => setActiveTab('settings')}
            >
              <SettingsIcon size={14} /> Settings
              {activeTab === 'settings' && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-t-full" />
              )}
            </button>
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
                  const expires = snoozedIds[notif.id];
                  if (expires && expires > nowVal) return false;
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
                        onClick={clearAllNotifications}
                        className="font-bold text-rose-500 hover:text-rose-600 transition-colors flex items-center gap-1 cursor-pointer focus:outline-none"
                      >
                        <Trash2 size={12} /> Clear All
                      </button>
                    </div>
                    {visibleNotifications.map(notif => (
                      <div 
                        key={notif.id} 
                        className={`p-4 flex gap-4 transition-colors ${notif.is_read ? 'opacity-60 bg-surface' : 'bg-surface-elevated'} ${activeSnoozeMenuId === notif.id ? 'relative z-20' : ''}`}
                      >
                        <div className="mt-1 flex-shrink-0">
                          {getIconForType(notif.type)}
                        </div>
                        <div 
                          onClick={() => handleNotificationClick(notif)}
                          className={`flex-1 space-y-1 ${notif.related_entity_id && (notif.type === 'manual_bill' || notif.type === 'auto_pay') ? 'cursor-pointer hover:opacity-85' : ''}`}
                        >
                          <h4 className="font-semibold text-foreground text-sm flex items-center justify-between">
                            <span className={notif.related_entity_id && (notif.type === 'manual_bill' || notif.type === 'auto_pay') ? 'hover:underline decoration-primary/40' : ''}>
                              {notif.title}
                            </span>
                            {!notif.is_read && <Circle size={8} fill="currentColor" className="text-primary" />}
                          </h4>
                          <p className="text-sm text-muted">{notif.message}</p>
                          <p className="text-[10px] text-muted-foreground uppercase font-mono tracking-wider">
                            {new Date(notif.created_at).toLocaleDateString()}
                          </p>
                        </div>
                        
                        <div className="flex flex-col gap-2 self-start ml-2 shrink-0 items-end">
                          <div className="flex gap-1">
                            {/* Mark Read */}
                            {!notif.is_read && (
                              <button 
                                onClick={() => markNotificationRead(notif.id)}
                                className="p-1 text-muted hover:text-primary transition-colors flex justify-center"
                                title="Mark as read"
                              >
                                <CheckCircle size={16} />
                              </button>
                            )}

                            {/* Snooze Button */}
                            {(notif.type === 'manual_bill' || notif.type === 'auto_pay') && (
                              <div className="relative">
                                <button
                                  onClick={() => setActiveSnoozeMenuId(activeSnoozeMenuId === notif.id ? null : notif.id)}
                                  className="p-1 text-muted hover:text-accent transition-colors flex justify-center"
                                  title="Snooze reminder"
                                >
                                  <Clock size={16} />
                                </button>
                                {activeSnoozeMenuId === notif.id && (
                                  <div className="absolute right-0 mt-1 z-30 bg-surface-elevated border border-border-strong rounded-[2px] shadow-2xl p-2 flex flex-col gap-1 min-w-[90px] animate-in fade-in zoom-in-95 duration-100">
                                    <span className="text-[9px] font-bold text-muted uppercase tracking-wider text-center border-b border-border pb-1 mb-1">Snooze</span>
                                    <button onClick={() => handleSnooze(notif.id, 1)} className="text-left text-xs px-2 py-1 rounded hover:bg-white/5 font-semibold text-foreground">1 Day</button>
                                    <button onClick={() => handleSnooze(notif.id, 3)} className="text-left text-xs px-2 py-1 rounded hover:bg-white/5 font-semibold text-foreground">3 Days</button>
                                    <button onClick={() => handleSnooze(notif.id, 7)} className="text-left text-xs px-2 py-1 rounded hover:bg-white/5 font-semibold text-foreground">7 Days</button>
                                  </div>
                                )}
                              </div>
                            )}

                            {/* Clear/Delete Button */}
                            <button 
                              onClick={() => deleteNotification(notif.id)}
                              className="p-1 text-muted hover:text-rose-500 transition-colors flex justify-center"
                              title="Clear notification"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>

                          {/* Mark Paid */}
                          {!notif.is_read && (notif.type === 'manual_bill' || notif.type === 'auto_pay') && (
                            <button
                              onClick={() => handleMarkAsPaid(notif)}
                              className="text-[9px] uppercase font-bold tracking-wider px-2 py-1 bg-primary/10 text-primary border border-primary/20 rounded hover:bg-primary/20 transition-colors"
                            >
                              Mark Paid
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </>
                );
              })()}
            </div>
          ) : (
            <div className="p-6 space-y-6">
              {notificationSettings ? (
                <>
                  <div className="flex items-center justify-between p-4 bg-surface-elevated rounded-[2px] border border-border">
                    <div>
                      <h4 className="font-semibold text-foreground">Enabled</h4>
                      <p className="text-sm text-muted">In-app &amp; push reminders</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        className="sr-only peer"
                        checked={notificationSettings.all_enabled}
                        onChange={() => handleToggleSetting('all_enabled')}
                      />
                      <div className="w-11 h-6 bg-border peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                    </label>
                  </div>

                  {/* Notify me at (#97) — relocated here from its own top-level
                      Settings row (Slice 13, #99 merge). Same NotifyHourDialog,
                      unchanged storage — just triggered from this panel now. */}
                  <button
                    type="button"
                    onClick={() => setShowNotifyHourDialog(true)}
                    className="w-full flex items-center justify-between p-4 bg-surface-elevated rounded-[2px] border border-border text-left hover:bg-surface-raised transition-colors"
                  >
                    <div>
                      <h4 className="font-semibold text-foreground">Notify me at</h4>
                      <p className="text-sm text-muted">Preferred delivery hour</p>
                    </div>
                    <span className="flex items-center gap-2 font-mono text-sm text-muted shrink-0">
                      {formatHourLabel(notificationSettings.notify_hour)}
                      <ChevronRight className="h-4 w-4 text-subtle" />
                    </span>
                  </button>

                  {/* Push status (#96 half A) — replaces the old standalone
                      "Push notifications" Settings row/dialog. Plain status
                      when live; a single tappable row reusing
                      PushStatusDialog's enable flow when action is needed.
                      This is NOT a second switch — the only toggle in this
                      panel is "Enabled" above. */}
                  {pushStatus && pushStatus.supported && (
                    pushStatus.hasLiveSubscription ? (
                      <div className="flex items-center justify-between p-4 bg-surface-elevated rounded-[2px] border border-border">
                        <h4 className="font-semibold text-foreground">Push on this device</h4>
                        <span className="flex items-center gap-1.5 font-mono text-xs text-muted">
                          <span className="h-1.5 w-1.5 rounded-full bg-success" /> Active
                        </span>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setShowPushStatusDialog(true)}
                        className="w-full flex items-center justify-between p-4 bg-surface-elevated rounded-[2px] border border-border text-left hover:bg-surface-raised transition-colors"
                      >
                        <div>
                          <h4 className="font-semibold text-foreground">Push on this device</h4>
                          <p className="text-sm text-accent">Needs attention</p>
                        </div>
                        <ChevronRight className="h-4 w-4 text-subtle" />
                      </button>
                    )
                  )}

                  <div className={`space-y-4 ${!notificationSettings.all_enabled ? 'opacity-50 pointer-events-none' : ''}`}>
                    <h4 className="font-heading font-semibold text-muted uppercase tracking-wider text-xs">Notification Types</h4>
                    
                    <div className="flex items-center justify-between p-3 border-b border-border-strong">
                      <div className="flex-1 pr-4">
                        <h5 className="font-medium text-sm text-foreground">Manual Bill Reminders</h5>
                        <p className="text-xs text-muted">Alerts when a manual bill is due.</p>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input 
                            type="checkbox" 
                            className="sr-only peer" 
                            checked={notificationSettings.manual_bill_reminders}
                            onChange={() => handleToggleSetting('manual_bill_reminders')}
                          />
                          <div className="w-9 h-5 bg-border peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary"></div>
                        </label>
                      </div>
                    </div>

                    <div className="flex items-center justify-between p-3 border-b border-border-strong">
                      <div className="flex-1 pr-4">
                        <h5 className="font-medium text-sm text-foreground">Auto-Pay Reminders</h5>
                        <p className="text-xs text-muted">Alerts for upcoming or missed auto-pay bills.</p>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input 
                            type="checkbox" 
                            className="sr-only peer" 
                            checked={notificationSettings.auto_pay_reminders}
                            onChange={() => handleToggleSetting('auto_pay_reminders')}
                          />
                          <div className="w-9 h-5 bg-border peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary"></div>
                        </label>
                      </div>
                    </div>

                    <div className="flex items-center justify-between p-3 border-b border-border-strong">
                      <div>
                        <h5 className="font-medium text-sm text-foreground">Lodge Payment Reminders</h5>
                        <p className="text-xs text-muted">Alerts when a scheduled payment needs confirmation.</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          className="sr-only peer"
                          checked={notificationSettings.lodge_payment_reminders}
                          onChange={() => handleToggleSetting('lodge_payment_reminders')}
                        />
                        <div className="w-9 h-5 bg-border peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary"></div>
                      </label>
                    </div>

                    <div className="flex items-center justify-between p-3 border-b border-border-strong">
                      <div className="flex-1 pr-4">
                        <h5 className="font-medium text-sm text-foreground">Payday Reminders</h5>
                        <p className="text-xs text-muted">Alerts when it&apos;s time to log your pay.</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          className="sr-only peer"
                          checked={notificationSettings.payday_reminders}
                          onChange={() => handleToggleSetting('payday_reminders')}
                        />
                        <div className="w-9 h-5 bg-border peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary"></div>
                      </label>
                    </div>

                    <div className="flex items-center justify-between p-3">
                      <div className="flex-1 pr-4">
                        <h5 className="font-medium text-sm text-foreground">Goal Milestone Reminders</h5>
                        <p className="text-xs text-muted">Alerts when a fund reaches 25/50/75/100% of its target.</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          className="sr-only peer"
                          checked={notificationSettings.goal_milestone_reminders}
                          onChange={() => handleToggleSetting('goal_milestone_reminders')}
                        />
                        <div className="w-9 h-5 bg-border peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary"></div>
                      </label>
                    </div>
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

    {/* Push status (nested — reuses PushStatusDialog's existing enable flow
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
