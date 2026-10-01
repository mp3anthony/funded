# Notifications

How Funded tells members something needs attention, and where each alert takes them.

## Language

### The alerts

**Notification**:
A single alert for a member, kept in their inbox. Every notification is shown in-app and can also be sent as a push.
_Avoid_: Alert (as the stored thing), message, ping

**Reminder**:
A notification the app generates on its own about a bill, payday, pending pay or goal, rather than one a person sends. Each reminder has a type.
_Avoid_: Task, to-do, nudge

**Reminder types**:
Manual bill, auto-pay, Confirm Pending Pay, payday "log your pay", and goal milestone. Bill reminders also come in a daily overdue form that repeats until the bill is paid.
_Avoid_: Categories, alert kinds

**Confirm Pending Pay reminder**:
The reminder, titled "Payment Requires Confirmation", that a logged pay is still pending and needs confirming. Its tap leads to the Confirm Pending Pay modal on the Payday page. The code key `lodge_payment` and some UI text still say "lodge"; that is legacy naming pending #216.
_Avoid_: Lodge payment, payment reminder, confirm reminder

**Goal milestone**:
A goal reaching 25, 50, 75 or 100 percent of its target. Each milestone is announced once per goal, to the whole household.
_Avoid_: Achievement, badge, goal complete

**Auth email** (templates planned, #167):
An email sent by Supabase Auth through Mailjet for an account action, currently Confirm signup and Reset password. It is not a Notification, which is only ever push or in-app.
_Avoid_: Transactional email, system email

### Where they appear

**Push**:
A notification delivered to a device's lock screen or notification tray, even when the app is closed.
_Avoid_: Push message, text alert, SMS

**Push subscription**:
A device's registration to receive pushes. A device without a live one shows as inactive and can be re-enabled from the notification settings.
_Avoid_: Device token, opt-in, registration

**Inbox**:
The in-app list of a member's unread notifications, opened from the bell.
_Avoid_: Notification feed, history, activity

**Mark as read**:
Clearing a notification from the inbox. It is kept out of sight rather than removed, so the same reminder is never generated again. The button reads "Clear".
_Avoid_: Delete, dismiss, snooze

**Tap destination**:
Where a notification takes you when tapped: a bill's popup for bill reminders, the Payday page for payday and confirmation reminders, and a goal's popup on the Goals page for milestones. The inbox and pushes always agree.
_Avoid_: Deep link, link target, redirect

### When they arrive

**Notify hour**:
The hour of day a member prefers their notifications to arrive, set per member and read in the household timezone.
_Avoid_: Quiet hours, delivery time, reminder time

**Household timezone**:
The timezone all of a household's dates and notification times are read in. Only the owner can change it.
_Avoid_: Device timezone, local time, region

**Scheduled delivery**:
Sending a reminder as a push at its member's notify hour, rather than the moment it is created.
_Avoid_: Queued push, batch send, delayed send

**Dedupe key**:
The identifier that makes a reminder unique for its bill, pay or goal and its cycle, so it is created only once. Daily overdue reminders include the day so they repeat.
_Avoid_: Reminder id, unique key, idempotency key
