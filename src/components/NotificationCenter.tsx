"use client";

import { useEffect, useState } from "react";
import { Bell, Settings as SettingsIcon, CheckCircle, Clock, AlertTriangle, Circle, Trash2 } from "lucide-react";
import { useApp, type Notification, type NotificationSettings } from "@/context/AppContext";
import Dialog from "@/components/ui/Dialog";
import { useRouter } from "next/navigation";
import { isStandaloneMode, isPushSupported, getPushPermissionState, subscribeToPush } from "@/lib/pushClient";
import { supabase } from "@/lib/supabase";

interface NotificationCenterProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function NotificationCenter({ isOpen, onClose }: NotificationCenterProps) {
  const { bills, markAsPaid, notifications, notificationSettings, markNotificationRead, deleteNotification, clearAllNotifications, updateNotificationSettings } = useApp();
  const [activeTab, setActiveTab] = useState<"list" | "settings">("list");
  
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

  const [pushSupported, setPushSupported] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [pushPermission, setPushPermission] = useState<NotificationPermission>('default');
  const [isSubscribing, setIsSubscribing] = useState(false);
  const [hasActiveSubscription, setHasActiveSubscription] = useState(false);
  const [serverSubscribed, setServerSubscribed] = useState<boolean>(false);
  const [pushError, setPushError] = useState<string | null>(null);

  useEffect(() => {
    setPushSupported(isPushSupported());
    setIsStandalone(isStandaloneMode());
    if (isPushSupported()) {
      setPushPermission(getPushPermissionState());
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.ready.then(reg => {
          reg.pushManager.getSubscription().then(async sub => {
            setHasActiveSubscription(!!sub);

            // Auto-sync the subscription to the server in case of a split-state
            if (sub) {
              try {
                const { data: { session } } = await supabase.auth.getSession();
                const response = await fetch('/api/push/subscribe', {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${session?.access_token ?? ''}`,
                  },
                  body: JSON.stringify(sub),
                });
                setServerSubscribed(response.ok);
                if (!response.ok) {
                  console.error('Failed to auto-sync push subscription: server returned', response.status);
                }
              } catch (err) {
                setServerSubscribed(false);
                console.error('Failed to auto-sync push subscription:', err);
              }
            }
          });
        });
      }
    }
  }, []);

  const handleEnablePush = async () => {
    try {
      setPushError(null);
      setIsSubscribing(true);
      await subscribeToPush();
      setPushPermission('granted');
      setHasActiveSubscription(true);
      setServerSubscribed(true);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (e: any) {
      console.error(e);
      setPushError(e.message || 'Failed to save push subscription to the server.');
      setPushPermission(getPushPermissionState());
      setHasActiveSubscription(false);
    } finally {
      setIsSubscribing(false);
    }
  };

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
              {isStandalone && pushSupported && (!serverSubscribed) && (
                <div className="flex flex-col gap-3 p-4 bg-primary/10 border border-primary/20 rounded-[2px]">
                  <div className="flex items-center gap-2 text-primary">
                    <Bell size={20} />
                    <h4 className="font-semibold">Enable Push Notifications</h4>
                  </div>
                  <p className="text-sm text-foreground/80">
                    Get alerts about bills and payments even when the app is closed.
                  </p>
                  {pushPermission === 'denied' ? (
                    <p className="text-xs text-rose-500 font-medium">
                      Notifications are blocked. Please enable them in your device or browser settings.
                    </p>
                  ) : (
                    <>
                      <button
                        onClick={handleEnablePush}
                        disabled={isSubscribing}
                        className="mt-2 w-full py-2 px-4 bg-primary text-primary-foreground font-bold rounded-[2px] hover:brightness-110 active:scale-95 transition-all disabled:opacity-50"
                      >
                        {isSubscribing ? 'Enabling...' : (pushError ? 'Retry' : 'Enable Notifications')}
                      </button>
                      {pushError && (
                        <p className="text-xs text-rose-500 font-medium mt-1">
                          {pushError}
                        </p>
                      )}
                    </>
                  )}
                </div>
              )}

              {notificationSettings ? (
                <>
                  <div className="flex items-center justify-between p-4 bg-surface-elevated rounded-[2px] border border-border">
                    <div>
                      <h4 className="font-semibold text-foreground">Enable Notifications</h4>
                      <p className="text-sm text-muted">Master toggle for all alerts.</p>
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
  );
}
