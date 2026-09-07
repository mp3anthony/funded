"use client";

import { useState, useMemo, useEffect, type CSSProperties } from "react";
import { useSearchParams } from "next/navigation";
import { Plus, X, ChevronDown, ChevronUp } from "lucide-react";
import { useApp, useCurrentUser, type Bill, type Expense } from "@/context/AppContext";
import AddBillSheet from "@/components/AddBillSheet";
import AddExpenseSheet from "@/components/AddExpenseSheet";
import BillCard from "@/components/BillCard";
import ExpenseCard from "@/components/ExpenseCard";
import EditCategoryOrderModal from "@/components/EditCategoryOrderModal";
import PageHeader from "@/components/PageHeader";
import FrequencyToggle from "@/components/FrequencyToggle";
import { convertAmount, sumActiveFixedContributionRules } from "@/lib/utils";
import { loadCategoryOrder, saveCategoryOrder } from "@/lib/categoryOrderPreferences";

type FrequencyType = "weekly" | "fortnightly" | "monthly" | "yearly";

// A single row in the unified list — a bill or an expense, grouped and
// sorted together (Issue #98, Slice 2 fix-round: Anthony asked for one
// interleaved list instead of a Bills/Expenses tab split).
type ListRow = { kind: "bill"; item: Bill } | { kind: "expense"; item: Expense };

// Shared by bills and expenses — both use the same category list and the
// same saved ordering (Issue #98, final sub-slice: confirmed there is no
// separate expense-category system, so this is intentionally one list).
const ITEM_CATEGORIES = [
  "Household Bills",
  "Living Costs",
  "Debt & Finance",
  "Loans",
  "Subscriptions",
  "Temporary",
  "Other",
];

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

  const [isAddBillSheetOpen, setIsAddBillSheetOpen] = useState(false);
  const [isAddExpenseSheetOpen, setIsAddExpenseSheetOpen] = useState(false);
  const [filter, setFilter] = useState<"all" | "week" | "month" | "overdue">("all");
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
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

  useEffect(() => {
    const userId = session?.user?.id;
    if (!userId) return;
    loadCategoryOrder(userId, "bill_category_order", "billCategoryOrder", CATEGORY_REMAP, ITEM_CATEGORIES)
      .then(setCategoryOrder)
      .catch(() => {});
  }, [session?.user?.id]);

  useEffect(() => {
    const billId = searchParams?.get("billId");
    if (!billId) return;
    const target = bills.find((b) => b.id.toString() === billId);
    if (target) {
      const cat = target.category || "Other";
      setExpandedCategories((prev) => ({ ...prev, [cat]: true }));
    }
  }, [searchParams, bills]);

  const getFrequencyLabel = (freq: FrequencyType) => {
    switch (freq) {
      case "weekly": return "Weekly";
      case "fortnightly": return "Fortnightly";
      case "monthly": return "Monthly";
      case "yearly": return "Yearly";
      default: return "Weekly";
    }
  };

  // Issue #98, Slice 4 of 6: this Total Bar is the actual user-facing
  // "weekly draw" figure households pull into the joint account / split via
  // Direct Pay each period — it now covers bills + expenses + active fixed-$
  // goal-contribution rules, not just bills, per the issue's core scope
  // decision. Expenses have no `frequency` column by design (schema decision:
  // "no recurring-frequency semantics") — an expense's flat `amount` is
  // implicitly a WEEKLY figure, the same convention the sub-slice 1 migration
  // preserved as-is when it moved the 4 real groceries/fuel rows out of
  // `bills` (they were weekly bills before the move, and their dollar amounts
  // were carried over unchanged). Percentage-of-surplus contribution rules
  // are deliberately excluded — see sumActiveFixedContributionRules' own
  // comment for why (can't know a future payday's surplus in advance).
  const totalBills = useMemo(() => {
    const billsTotal = bills.reduce((sum, b) => {
      return sum + convertAmount(b.amount, b.frequency || "monthly", displayFrequency);
    }, 0);
    const expensesTotal = expenses.reduce((sum, e) => {
      return sum + convertAmount(e.amount, "weekly", displayFrequency);
    }, 0);
    const rulesTotal = sumActiveFixedContributionRules(contributionRules, paySchedules, displayFrequency);
    return billsTotal + expensesTotal + rulesTotal;
  }, [bills, expenses, contributionRules, paySchedules, displayFrequency]);

  const filteredBills = useMemo(() => {
    const today = isMounted ? new Date() : new Date("2026-07-05");
    today.setHours(0, 0, 0, 0);

    return bills.filter((b) => {
      if (searchQuery.trim() !== "") {
        const query = searchQuery.toLowerCase();
        if (!b.name.toLowerCase().includes(query)) return false;
      }

      if (categoryFilter !== "All" && b.category !== categoryFilter) {
        return false;
      }

      const d = b.due_date ? new Date(b.due_date + "T00:00:00") : new Date(b.dueDate);
      if (isNaN(d.getTime())) return false;
      d.setHours(0, 0, 0, 0);

      const diffTime = d.getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / 86_400_000);

      if (filter === "week") return diffDays >= 0 && diffDays <= 7;
      if (filter === "month") return diffDays >= 0 && diffDays <= 30;
      if (filter === "overdue") return d.getTime() < today.getTime() && b.status !== "Paid";
      return true;
    });
  }, [bills, filter, searchQuery, categoryFilter]);

  /* Expenses share the same search/category filters as bills now that
   * they're in one list (Issue #98, Slice 2 fix-round). They have no due
   * date, so a due-date filter ("This Week"/"This Month"/"Overdue") can't
   * apply to them — an expense simply drops out of the list while one of
   * those is active, matching the bill-only meaning of that filter. */
  const filteredExpenses = useMemo(() => {
    if (filter !== "all") return [];

    return expenses.filter((e) => {
      if (searchQuery.trim() !== "") {
        const query = searchQuery.toLowerCase();
        if (!e.name.toLowerCase().includes(query)) return false;
      }
      if (categoryFilter !== "All" && e.category !== categoryFilter) {
        return false;
      }
      return true;
    });
  }, [expenses, filter, searchQuery, categoryFilter]);

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

    Object.keys(groups).forEach((cat) => {
      groups[cat].sort((a, b) => amountOf(b) - amountOf(a));
    });

    return groups;
  }, [filteredBills, filteredExpenses, displayFrequency]);

  const allCategories = useMemo(() => {
    const currentCats = Object.keys(groupedItems);
    return Array.from(new Set([...categoryOrder, ...ITEM_CATEGORIES, ...currentCats]));
  }, [groupedItems, categoryOrder]);

  const emptyStateMessage = useMemo(() => {
    if (searchQuery.trim() !== "") return "No bills or expenses match your search";
    if (categoryFilter !== "All") return `No bills or expenses in ${categoryFilter}`;
    if (filter === "week") return "No bills due this week";
    if (filter === "month") return "No bills due this month";
    if (filter === "overdue") return "No overdue bills";
    return "No bills or expenses found";
  }, [filter, searchQuery, categoryFilter]);

  const hasItems = Object.keys(groupedItems).length > 0;

  return (
    // 1. Drastically reduced padding and spacing to fix the "oversized" feel
    <div className="flex-1 w-full max-w-4xl mx-auto px-4 pt-4 pb-4 sm:px-6 sm:pt-6 sm:pb-6 space-y-4">

      {/* 2. Clean Header - Action slot added to hold the Add button next to avatar */}
      <PageHeader
        title="Bills"
        subtitle="All household costs, organised by category."
        action={
          <button
            onClick={() => setIsAddBillSheetOpen(true)}
            className="flex items-center gap-2 bg-secondary hover:bg-secondary-dark active:scale-95 text-secondary-fg text-xs font-semibold px-3 py-2 rounded-xl shadow-md shadow-secondary/15 transition-all duration-200 cursor-pointer animate-in fade-in duration-(--duration-base) ease-(--ease-standard)"
          >
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">Add Bill</span>
          </button>
        }
      />

      {/* 3. Total Bar */}
      <div className="px-1">
        <div className="text-3xl font-bold text-primary tracking-tight font-mono">
          ${totalBills.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </div>
        <div className="text-xs font-bold uppercase tracking-wider text-subtle mt-1">
          {getFrequencyLabel(displayFrequency)} Total
        </div>
      </div>

      {/* 4. Filters & Search */}
      <div className="flex flex-col gap-3 px-1">

        {/* Filters Row */}
        <div className="grid grid-cols-3 gap-2">

          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-muted uppercase tracking-wider ml-1">
              Category
            </label>
            <div className="relative">
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="w-full border-b border-border bg-transparent px-1 py-1.5 text-[11px] font-semibold text-foreground focus:border-primary focus:outline-none appearance-none cursor-pointer pr-5"
              >
                <option value="All">All</option>
                <option value="Subscriptions">Subscriptions</option>
                <option value="Living Costs">Living Costs</option>
                <option value="Household Bills">Household Bills</option>
                <option value="Debt & Finance">Debt & Finance</option>
                <option value="Loans">Loans</option>
                <option value="Temporary">Temporary</option>
                <option value="Other">Other</option>
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-1 text-muted">
                <svg className="h-3 w-3 fill-current" viewBox="0 0 20 20">
                  <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
                </svg>
              </div>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-muted capitalize tracking-wider ml-1">
              Due Date
            </label>
            <div className="relative">
              <select
                value={filter}
                onChange={(e) => setFilter(e.target.value as "all" | "week" | "month" | "overdue")}
                className="w-full border-b border-border bg-transparent px-1 py-1.5 text-[11px] font-semibold text-foreground focus:border-primary focus:outline-none appearance-none cursor-pointer pr-5"
              >
                <option value="all">All</option>
                <option value="week">This Week</option>
                <option value="month">This Month</option>
                <option value="overdue">Overdue</option>
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-1 text-muted">
                <svg className="h-3 w-3 fill-current" viewBox="0 0 20 20">
                  <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
                </svg>
              </div>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-muted capitalize tracking-wider ml-1">
              Amounts As
            </label>
            <div className="relative">
              <select
                value={displayFrequency}
                onChange={(e) => setDisplayFrequency(e.target.value as FrequencyType)}
                className="w-full border-b border-border bg-transparent px-1 py-1.5 text-[11px] font-semibold text-foreground focus:border-primary focus:outline-none appearance-none cursor-pointer pr-5"
              >
                <option value="weekly">Weekly</option>
                <option value="fortnightly">Fortnightly</option>
                <option value="monthly">Monthly</option>
                <option value="yearly">Yearly</option>
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-1 text-muted">
                <svg className="h-3 w-3 fill-current" viewBox="0 0 20 20">
                  <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* Search */}
        <div className="relative w-full">
          <input
            type="text"
            placeholder="Search bills & expenses by name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-transparent border-b border-border pl-1 pr-8 py-2 font-body text-sm placeholder:text-muted focus:outline-none focus:border-primary text-foreground"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-foreground transition-colors p-1"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {/* Bills & Expenses Scrollable Container */}
      <div className="space-y-3">
        <div className="flex items-center justify-end px-1">
          <button
            onClick={() => setIsEditCategoryOrderOpen(true)}
            className="text-[10px] font-heading font-bold text-muted hover:text-foreground uppercase tracking-wider transition-colors"
          >
            Edit Order
          </button>
        </div>
        {!hasItems ? (
          <div className="py-10 text-center">
            <p className="text-muted font-mono text-sm">{emptyStateMessage}</p>
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
                  <span className="font-heading font-bold text-[15px] text-foreground shrink-0 group-hover:text-primary transition-colors">
                    {category}
                  </span>
                  <span className="font-mono text-[11px] font-semibold text-subtle shrink-0">
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
                          <BillCard
                            bill={row.item}
                            splits={billSplits.filter(s => s.bill_id === row.item.id)}
                            householdMembers={householdMembers}
                            displayFrequency={displayFrequency}
                          />
                        </div>
                      ) : (
                        <div key={`expense-${row.item.id}`} className="fund-row-in" style={rowStyle}>
                          <ExpenseCard
                            expense={row.item}
                            householdMembers={householdMembers}
                          />
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

      <AddBillSheet
        isOpen={isAddBillSheetOpen}
        onClose={() => setIsAddBillSheetOpen(false)}
        onSwitchToExpense={() => {
          setIsAddBillSheetOpen(false);
          setIsAddExpenseSheetOpen(true);
        }}
      />

      <AddExpenseSheet
        isOpen={isAddExpenseSheetOpen}
        onClose={() => setIsAddExpenseSheetOpen(false)}
        onSwitchToBill={() => {
          setIsAddExpenseSheetOpen(false);
          setIsAddBillSheetOpen(true);
        }}
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
