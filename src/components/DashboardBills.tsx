"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useApp, type Bill } from "@/context/AppContext";
import Card from "@/components/ui/Card";
import Carousel from "@/components/ui/Carousel";
import SectionHeader from "@/components/ui/SectionHeader";
import { buttonClasses } from "@/components/ui/Button";
import { dueCountdown, type CountdownTone } from "@/lib/billRow";
import { dashboardBills } from "@/lib/dashboardCarousels";
import { todayInZone } from "@/lib/notifications/timezone";

const TONE_CLASS: Record<CountdownTone, string> = {
  neutral: "text-muted",
  overdue: "text-destructive",
  paid: "text-success",
  muted: "text-muted",
};

const PER: Record<string, string> = {
  weekly: "a week",
  fortnightly: "a fortnight",
  monthly: "a month",
  yearly: "a year",
};

const money = (n: number) =>
  `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

/** "View all" pill link, shared look for both Dashboard carousels. */
export function ViewAllLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      prefetch={false}
      aria-label={label}
      className={`${buttonClasses({ variant: "ghost" })} min-h-9 px-4 text-[13px]`}
    >
      View all
    </Link>
  );
}

/**
 * Dashboard Bills carousel (R27, #414): the next manual bills still to pay, overdue first.
 * Swipe-only, one card at a time. Each card opens the bill's detail sheet.
 */
export default function DashboardBills({ onBillClick }: { onBillClick: (bill: Bill) => void }) {
  const { bills, householdTimezone } = useApp();
  const todayYmd = todayInZone(householdTimezone || "Australia/Sydney");
  const list = useMemo(() => dashboardBills(bills, todayYmd), [bills, todayYmd]);

  return (
    <section aria-label="Bills to pay">
      <SectionHeader title="Bills" className="mb-3" trailing={<ViewAllLink href="/bills" label="View all bills" />} />
      {list.length === 0 ? (
        <Card className="p-4">
          <p className="font-body text-[15px] font-semibold text-foreground">No manual bills to pay</p>
          <p className="mt-0.5 text-[13px] font-body text-muted">Bills you pay by hand show up here.</p>
        </Card>
      ) : (
        <Carousel label="Bills to pay">
          {list.map((bill) => {
            const countdown = dueCountdown(bill, todayYmd);
            const per = PER[(bill.frequency ?? "").toLowerCase()];
            const sentence = `${bill.name}. ${countdown.text}. ${money(bill.amount)}${per ? ` ${per}` : ""}.`;
            return (
              <Card key={bill.id} onClick={() => onBillClick(bill)} aria-label={sentence} className="h-full p-4">
                <span aria-hidden="true" className="flex items-center gap-3">
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate font-body text-[15px] font-semibold text-foreground">{bill.name}</span>
                    <span className={`mt-0.5 text-[13px] font-medium ${TONE_CLASS[countdown.tone]}`}>
                      {countdown.text}
                    </span>
                  </span>
                  <span className="flex shrink-0 flex-col items-end">
                    <span className="text-lg font-bold tracking-tight tabular-nums text-primary">
                      {money(bill.amount)}
                    </span>
                    {per && <span className="text-[11px] font-body text-muted">{per}</span>}
                  </span>
                </span>
              </Card>
            );
          })}
        </Carousel>
      )}
    </section>
  );
}
