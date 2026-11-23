# Money: Bill status

How a bill is marked paid, overdue, paused or pending.

**Due Soon**:
A bill that is unpaid, has a due date, and is not yet past it.
_Avoid_: Pending, upcoming (as a status), open

**Overdue**:
A manual bill that is unpaid and past its due date.
_Avoid_: Late, missed, past due

**Paid**:
A bill settled for the current cycle. A paid recurring bill returns to unpaid when its next cycle begins.
_Avoid_: Done, settled, cleared

**Paused**:
A bill put on hold until it is resumed. While paused it gets no reminders, is not treated as overdue, and does not count toward totals (see Counts toward totals).
Its row shows an orange pause icon beside a greyed amount, with "Paused" in the date slot, and, like other neutral-label ("Paused" or "One-off") rows, shows only under the All filter,
in its usual sort order (not moved to a separate section).
On resume, if its due date has passed, it moves on to its next upcoming due date (missed cycles are skipped).
_Avoid_: Archived, disabled, inactive

**Mark as Paid**:
Recording that a manual bill has been paid. If the bill is already due or past due it rolls straight away; if it is paid early, only its status changes. For a bill with no due date, see Dateless bill.
_Avoid_: Pay, complete, tick off

**Roll**:
Moving a recurring bill on to its next cycle: status returns to unpaid and the due date, and the invoice date when present, advance one frequency. The cycle just paid is recorded as the bill's last paid.
_Avoid_: Reset, renew, recur

**Undo**:
The quick undo in the toast straight after paying, restoring the bill exactly as it was. It is offered for a short time only.
_Avoid_: Revert, unpay, rollback

**Undo payment**:
The permanent button in the bill popup that puts a bill back on the cycle it was last paid for, as unpaid. One level only: it clears the last paid record, so it cannot be repeated.
_Avoid_: Revert, unpay, rollback

**Last paid** (shown as "Paid for <Month>"):
The due date of the most recently paid cycle, shown in the bill popup under Paid By. The month comes from the due date while the bill is Paid, otherwise from the stored record; empty shows nothing. Autopay bills show no Paid-for line.
_Avoid_: Paid on, payment date
