"use client";

import { useState, useMemo, useEffect, useRef, type CSSProperties } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { X, ChevronDown, ChevronUp, Search, SlidersHorizontal } from "lucide-react";
import { useApp, useCurrentUser, type Bill, type Expense } from "@/context/AppContext";
import AddFlow from "@/components/AddFlow";
import BillCard from "@/components/BillCard";
import ExpenseCard from "@/components/ExpenseCard";
import EditCategoryOrderModal from "@/components/EditCategoryOrderModal";
import PageHeader from "@/components/PageHeader";
import Button from "@/components/ui/Button";
import Chip from "@/components/ui/Chip";
import Dialog from "@/components/ui/Dialog";
import IconCircle from "@/components/ui/IconCircle";
import Input from "@/components/ui/Input";
import { convertAmount, sumActiveFixedContributionRules } from "@/lib/utils";
import { loadCategoryOrder, saveCategoryOrder } from "@/lib/categoryOrderPreferences";
import { hasAddSheetParam, stripAddSheetParam } from "@/lib/finishSetup";
import { countsTowardTotals, isDateless } from "@/lib/billCycle";
import { ITEM_CATEGORIES, rowKey, type AddedItem } from "@/lib/addFlow";
import { useRowHighlight } from "@/hooks/useRowHighlight";
import { loadFrequency, saveFrequency, type FrequencyType } from "@/lib/frequencyPreference";
import {
  dueAfterTypeChange,
  expensesHiddenByDue,
  isFilterActive,
  matchesBillFilters,
  matchesExpenseFilters,
  NO_FILTERS,
  splitTotals,
  type DueFilter,
  type TypeFilter,
} from "@/lib/billsFilters";

const FREQUENCY_OPTIONS: { value: FrequencyType; label: string }[] = [
  { value: "weekly", label: "Weekly" },
  { value: "fortnightly", label: "Fortnightly" },
  { value: "monthly", label: "Monthly" },
  { value: "yearly", label: "Yearly" },
];
const TYPE_OPTIONS: { value: TypeFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "bills", label: "Bills" },
  { value: "expenses", label: "Expenses" },
];
const DUE_OPTIONS: { value: DueFilter; label: string }[] = [
  { value: "all", label: "Any due" },
  { value: "week", label: "This week" },
  { value: "month", label: "This month" },
  { value: "overdue", label: "Overdue" },
];
const moneyFmt = (n: number) =>
  `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

// A single row in the unified list — a bill or an expense, grouped and
// sorted together (Issue #98, Slice 2 fix-round: Anthony asked for one
// interleaved list instead of a Bills/Expenses tab split).
type ListRow = { kind: "bill"; item: Bill } | { kind: "expense"; item: Expense };

// Legacy category names → current scheme
const CATEGORY_REMAP: Record<string, string> = {
  "Debt/Finance": "Debt & Finance",
};

export default function BillsClient() {
  const {
    bills,
    billSplits,
    expenses,
    members: householdMembers,
    session,
    contributionRules,
    paySchedules,
  } = useApp();
  const currentUser = useCurrentUser();
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const [isAddOpen, setIsAddOpen] = useState(false);
  const { highlightKey, flash } = useRowHighlight();
  const [filter, setFilter] = useState<DueFilter>("all");
  const [categoryFilter, setCategoryFilter] = useState("All");
  // Issue #157: isolate bills from expenses in the unified list. Only
  // affects which rows are listed — the Total Bar deliberately ignores it,
  // same as Category and Due Date.
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [displayFrequency, setDisplayFrequency] = useState<FrequencyType>("weekly");

  const [isMounted, setIsMounted] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({});
  const [isEditCategoryOrderOpen, setIsEditCategoryOrderOpen] = useState(false);
  const [categoryOrder, setCategoryOrder] = useState<string[]>([]);

  const toggleCategory = (category: string) => {
    setExpandedCategories(prev => ({
      ...prev,
      [category]: !prev[category]
    }));
  };
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // R14: the "amounts as" choice is remembered per person on this device.
  // Read after mount so server and first client render agree (weekly).
  useEffect(() => {
    const userId = session?.user?.id;
    if (!userId) return;
    // One-shot sync from localStorage, not a render cascade.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDisplayFrequency(loadFrequency(userId));
  }, [session?.user?.id]);

  const handleFrequencyChange = (f: FrequencyType) => {
    setDisplayFrequency(f);
    if (session?.user?.id) saveFrequency(session.user.id, f);
  };

  useEffect(() => {
    const userId = session?.user?.id;
    if (!userId) return;
    loadCategoryOrder(userId, "bill_category_order", "billCategoryOrder", CATEGORY_REMAP, ITEM_CATEGORIES)
      .then(setCategoryOrder)
      .catch(() => {});
  }, [session?.user?.id]);

  // Finish setting up card (#333): /bills?add=1 opens the Add flow once,
  // then the param is stripped so refresh/back never re-opens it.
  const handledAddRef = useRef(false);
  useEffect(() => {
    if (!searchParams) return;
    if (!hasAddSheetParam(searchParams)) {
      handledAddRef.current = false;
      return;
    }
    if (handledAddRef.current) return;
    handledAddRef.current = true;
    // One-shot sync with an external input (the tapped link), guarded by
    // handledAddRef — not a render cascade.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsAddOpen(true);
    const rest = stripAddSheetParam(searchParams);
    router.replace(`${pathname}${rest ? `?${rest}` : ""}`, { scroll: false });
  }, [searchParams, pathname, router]);

  useEffect(() => {
    const billId = searchParams?.get("billId");
    if (!billId) return;
    const target = bills.find((b) => b.id.toString() === billId);
    if (target) {
      const cat = target.category || "Other";
      setExpandedCategories((prev) => ({ ...prev, [cat]: true }));
    }
  }, [searchParams, bills]);

  const filterState = useMemo(
    () => ({ type: typeFilter, due: filter, category: categoryFilter, search: searchQuery }),
    [typeFilter, filter, categoryFilter, searchQuery],
  );
  const filterActive = isFilterActive(filterState);

  // #267: how many bills the Total leaves out. Ignores filters, like the unfiltered total.
  const notCountedCount = useMemo(
    () => bills.filter((b) => !countsTowardTotals(b)).length,
    [bills],
  );

  const filteredBills = useMemo(() => {
    const today = isMounted ? new Date() : new Date("2026-07-05");
    today.setHours(0, 0, 0, 0);
    return bills.filter((b) => matchesBillFilters(b, filterState, today, { isDateless }));
  }, [bills, filterState, isMounted]);

  /* Expenses share the same search/category filters as bills (Issue #98).
   * Issue #164: expenses have no due date, so any Due filter other than "All"
   * hides them (the page says so with a one-line note when Type is All). */
  const filteredExpenses = useMemo(
    () => expenses.filter((e) => matchesExpenseFilters(e, filterState)),
    [expenses, filterState],
  );

  const showExpensesHiddenNote = useMemo(
    () => expensesHiddenByDue(expenses, filterState),
    [expenses, filterState],
  );

  // Household total (bills + expenses + active fixed goal contributions) or, with
  // any filter/search on, the Filtered total of the listed rows. Expenses have no
  // frequency column: their amount is implicitly weekly. Percentage rules are
  // excluded (see sumActiveFixedContributionRules).
  const totals = useMemo(
    () =>
      splitTotals({
        bills,
        expenses,
        listedBills: filteredBills,
        listedExpenses: filteredExpenses,
        goalsTotal: sumActiveFixedContributionRules(contributionRules, paySchedules, displayFrequency),
        filterActive,
        frequency: displayFrequency,
        deps: { convert: convertAmount, countsTowardTotals },
      }),
    [bills, expenses, filteredBills, filteredExpenses, contributionRules, paySchedules, displayFrequency, filterActive],
  );

  /* Unified, category-grouped, amount-sorted (largest first within each
   * category) list of bills and expenses mixed together — the exact
   * grouping/sorting bills already used, now shared by both (Issue #98,
   * Slice 2 fix-round: one interleaved list, no tab split). Category
   * ordering is already shared/unified across bills and expenses, since
   * both use the same category list (see ITEM_CATEGORIES above) — this
   * was confirmed/finalized as Issue #98's last sub-slice. There is no
   * separate expense-category-ordering system, and none is needed. */
  const groupedItems = useMemo(() => {
    const groups: Record<string, ListRow[]> = {};

    filteredBills.forEach((bill) => {
      const cat = bill.category || "Other";
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push({ kind: "bill", item: bill });
    });

    filteredExpenses.forEach((expense) => {
      const cat = expense.category || "Other";
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push({ kind: "expense", item: expense });
    });

    const amountOf = (row: ListRow) =>
      row.kind === "bill"
        ? convertAmount(row.item.amount, row.item.frequency || "monthly", displayFrequency)
        : row.item.amount;

    // #250: bills with no due date sort last within their category, then by amount.
    const rank = (row: ListRow) => (row.kind === "bill" && !row.item.dueLabel && isDateless(row.item) ? 1 : 0);

    Object.keys(groups).forEach((cat) => {
      groups[cat].sort((a, b) => rank(a) - rank(b) || amountOf(b) - amountOf(a));
    });

    return groups;
  }, [filteredBills, filteredExpenses, displayFrequency]);

  const allCategories = useMemo(() => {
    const currentCats = Object.keys(groupedItems);
    return Array.from(new Set([...categoryOrder, ...ITEM_CATEGORIES, ...currentCats]));
  }, [groupedItems, categoryOrder]);

  // Issue #157: wording follows the Type filter — "expenses" / "bills" when
  // one is isolated, "bills or expenses" when showing both. The due-date
  // messages already say "bills" and can't be reached with Type = Expenses
  // (Due Date is disabled and reset to "All" then).
  const emptyStateMessage = useMemo(() => {
    const noun =
      typeFilter === "expenses" ? "expenses" : typeFilter === "bills" ? "bills" : "bills or expenses";
    if (searchQuery.trim() !== "") return `No ${noun} match your search`;
    if (categoryFilter !== "All") return `No ${noun} in ${categoryFilter}`;
    if (filter === "week") return "No bills due this week";
    if (filter === "month") return "No bills due this month";
    if (filter === "overdue") return "No overdue bills";
    return `No ${noun} found`;
  }, [filter, searchQuery, categoryFilter, typeFilter]);

  // Issue #157: expenses have no due date, so the Due chips are disabled while
  // Type = Expenses and Due resets to Any (see dueAfterTypeChange).
  const isDueDateDisabled = typeFilter === "expenses";
  const handleTypeFilterChange = (value: TypeFilter) => {
    setTypeFilter(value);
    setFilter((cur) => dueAfterTypeChange(value, cur));
  };

  const clearFilters = () => {
    setTypeFilter(NO_FILTERS.type);
    setFilter(NO_FILTERS.due);
    setCategoryFilter(NO_FILTERS.category);
    setSearchQuery(NO_FILTERS.search);
  };

  const closeSearch = () => {
    setIsSearchOpen(false);
    setSearchQuery("");
  };

  const hasItems = Object.keys(groupedItems).length > 0;

  // After an add: open the new row's category, then scroll to it and let it glow.
  // rowKey gives the same "bill-<id>" / "expense-<id>" as the row wrapper ids below.
  const handleAdded = (item: AddedItem) => {
    setExpandedCategories((prev) => ({ ...prev, [item.category || "Other"]: true }));
    flash(rowKey(item.kind, item.id));
  };

  return (
    // 1. Drastically reduced padding and spacing to fix the "oversized" feel
    <div className="flex-1 w-full max-w-4xl mx-auto px-4 pt-4 pb-4 sm:px-6 sm:pt-6 sm:pb-6 space-y-4">

      <PageHeader
        title="Bills"
        onAdd={() => setIsAddOpen(true)}
        addLabel="Add bill"
        extra={
          <IconCircle
            label="Search"
            aria-expanded={isSearchOpen}
            onClick={() => (isSearchOpen ? closeSearch() : setIsSearchOpen(true))}
          >
            <Search size={18} aria-hidden="true" />
          </IconCircle>
        }
      />

      {isSearchOpen && (
        <div className="relative -mt-2">
          <Input
            type="search"
            autoFocus
            placeholder="Search"
            aria-label="Search bills and expenses"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pr-12"
          />
          <button
            type="button"
            aria-label={searchQuery ? "Clear search" : "Close search"}
            onClick={() => (searchQuery ? setSearchQuery("") : closeSearch())}
            className="absolute right-1 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center text-muted"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      )}

      {/* Total */}
      <div className="px-1">
        <div className="text-xs font-bold uppercase tracking-wider text-subtle">
          {filterActive ? "Filtered total" : "Household total"}
        </div>
        <div className="mt-1 text-3xl font-bold text-primary tracking-tight">{moneyFmt(totals.total)}</div>
        <p className="mt-1 text-xs text-muted font-body">
          Bills {moneyFmt(totals.bills)} · Expenses {moneyFmt(totals.expenses)}
          {!filterActive && <> · Goals {moneyFmt(totals.goals)}</>}
        </p>
        {filterActive && (
          <p className="mt-0.5 text-[11px] text-muted font-body">
            {totals.listedCount} of {totals.totalCount} items
          </p>
        )}
        {notCountedCount > 0 && (
          <p className="text-[11px] text-muted font-body mt-0.5">
            {notCountedCount} paused or finished, not counted
          </p>
        )}
      </div>

      {/* Frequency pills (remembered per person) */}
      <div
        role="group"
        aria-label="Show amounts as"
        className="scrollbar-none -mx-4 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:px-0"
      >
        {FREQUENCY_OPTIONS.map((o) => (
          <Chip
            key={o.value}
            selected={displayFrequency === o.value}
            onClick={() => handleFrequencyChange(o.value)}
          >
            {o.label}
          </Chip>
        ))}
      </div>

      {/* Filters: one scrolling row */}
      <div className="flex flex-col gap-2">
        <div
          role="group"
          aria-label="Filters"
          className="scrollbar-none -mx-4 flex items-center gap-2 overflow-x-auto px-4 sm:mx-0 sm:px-0"
        >
          <Chip onClick={() => setIsFilterOpen(true)} aria-haspopup="dialog">
            <span className="relative inline-flex">
              <SlidersHorizontal size={16} aria-hidden="true" />
              {categoryFilter !== "All" && (
                <span className="absolute -right-1 -top-1 h-2 w-2 rounded-full bg-primary" aria-hidden="true" />
              )}
            </span>
            Filter
            {categoryFilter !== "All" && <span className="sr-only"> (category chosen)</span>}
          </Chip>
          {TYPE_OPTIONS.map((o) => (
            <Chip key={o.value} selected={typeFilter === o.value} onClick={() => handleTypeFilterChange(o.value)}>
              {o.label}
            </Chip>
          ))}
          <span className="h-5 w-px shrink-0 bg-border-strong" aria-hidden="true" />
          {DUE_OPTIONS.map((o) => (
            <Chip
              key={o.value}
              selected={filter === o.value}
              disabled={isDueDateDisabled}
              onClick={() => setFilter(o.value)}
            >
              {o.label}
            </Chip>
          ))}
        </div>
        {showExpensesHiddenNote && (
          <p className="px-1 text-[11px] text-muted font-body">Expenses hidden, they have no due date</p>
        )}
      </div>

      {/* Bills & Expenses Scrollable Container */}
      <div className="space-y-3">
        {!hasItems ? (
          <div className="flex flex-col items-center gap-3 py-10 text-center">
            {bills.length === 0 && expenses.length === 0 ? (
              <>
                <p className="text-muted text-sm">No bills yet.</p>
                <Button onClick={() => setIsAddOpen(true)}>Add your first bill</Button>
              </>
            ) : (
              <>
                <p className="text-muted text-sm">{emptyStateMessage}</p>
                <Button variant="ghost" onClick={clearFilters}>Clear filters</Button>
              </>
            )}
          </div>
        ) : (
          <div className="space-y-6">
            {Object.entries(groupedItems)
              .sort(([a], [b]) => {
                const idxA = allCategories.indexOf(a);
                const idxB = allCategories.indexOf(b);
                if (idxA !== -1 && idxB !== -1) return idxA - idxB;
                if (idxA !== -1) return -1;
                if (idxB !== -1) return 1;
                return a.localeCompare(b);
              })
              .map(([category, categoryItems]) => (
              <div key={category} className="flex flex-col">
                <button
                  onClick={() => toggleCategory(category)}
                  className="flex items-center gap-3 w-full text-left px-1 focus:outline-none group"
                >
                  <span className="font-bold text-[15px] text-foreground shrink-0 group-hover:text-primary transition-colors">
                    {category}
                  </span>
                  <span className="text-[11px] font-semibold text-subtle shrink-0">
                    ({categoryItems.length})
                  </span>
                  <span
                    className="h-0.5 flex-1 rounded-sm"
                    style={{ background: "linear-gradient(90deg, var(--color-primary), transparent)" }}
                  />
                  {expandedCategories[category] ? (
                    <ChevronUp className="h-4 w-4 text-subtle group-hover:text-foreground transition-colors shrink-0" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-subtle group-hover:text-foreground transition-colors shrink-0" />
                  )}
                </button>

                {expandedCategories[category] && (
                  <div className="flex flex-col mt-1">
                    {/* Rows fully unmount on collapse (unlike Funds/Goals'
                        grid-rows collapse), so every expand is a genuine
                        first-appearance — a clean, low-risk fit for the
                        same restrained fund-row-in entrance, capped and
                        staggered the same way. */}
                    {categoryItems.map((row, rowIndex) => {
                      const delayMs = Math.min(rowIndex * 30, 150);
                      const rowStyle = { "--row-delay": `${delayMs}ms` } as CSSProperties;
                      return row.kind === "bill" ? (
                        <div key={`bill-${row.item.id}`} className="fund-row-in" style={rowStyle}>
                          {/* Inner wrapper: the add highlight must not override fund-row-in. */}
                          <div
                            id={`bill-${row.item.id}`}
                            className={highlightKey === `bill-${row.item.id}` ? "row-highlight" : undefined}
                          >
                            <BillCard
                              bill={row.item}
                              splits={billSplits.filter(s => s.bill_id === row.item.id)}
                              householdMembers={householdMembers}
                              displayFrequency={displayFrequency}
                            />
                          </div>
                        </div>
                      ) : (
                        <div key={`expense-${row.item.id}`} className="fund-row-in" style={rowStyle}>
                          <div
                            id={`expense-${row.item.id}`}
                            className={highlightKey === `expense-${row.item.id}` ? "row-highlight" : undefined}
                          >
                            <ExpenseCard
                              expense={row.item}
                              householdMembers={householdMembers}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <Dialog
        open={isFilterOpen}
        onClose={() => setIsFilterOpen(false)}
        title="Filter"
        placement="bottom"
        footer={
          <Button
            variant="ghost"
            fullWidth
            onClick={() => {
              setIsFilterOpen(false);
              setIsEditCategoryOrderOpen(true);
            }}
          >
            Edit order
          </Button>
        }
      >
        <div role="group" aria-label="Category" className="flex flex-wrap gap-2">
          {["All", ...allCategories].map((c) => (
            <Chip key={c} selected={categoryFilter === c} onClick={() => setCategoryFilter(c)}>
              {c}
            </Chip>
          ))}
        </div>
      </Dialog>

      <AddFlow
        open={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        onAdded={handleAdded}
      />

      <EditCategoryOrderModal
        isOpen={isEditCategoryOrderOpen}
        onClose={() => setIsEditCategoryOrderOpen(false)}
        categories={allCategories}
        onSave={(newOrder) => {
          setCategoryOrder(newOrder);
          if (session?.user?.id) {
            saveCategoryOrder(session.user.id, "bill_category_order", newOrder).catch(() => {});
          }
        }}
      />
    </div>
  );
}
