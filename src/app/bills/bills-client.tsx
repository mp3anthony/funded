"use client";

import { useState, useMemo, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { Plus, X, ChevronDown, ChevronUp } from "lucide-react";
import { useApp, useCurrentUser } from "@/context/AppContext";
import AddBillSheet from "@/components/AddBillSheet";
import AddExpenseSheet from "@/components/AddExpenseSheet";
import BillCard from "@/components/BillCard";
import ExpenseCard from "@/components/ExpenseCard";
import EditCategoryOrderModal from "@/components/EditCategoryOrderModal";
import PageHeader from "@/components/PageHeader";
import FrequencyToggle from "@/components/FrequencyToggle";
import { convertAmount } from "@/lib/utils";
import { loadCategoryOrder, saveCategoryOrder } from "@/lib/categoryOrderPreferences";

type FrequencyType = "weekly" | "fortnightly" | "monthly" | "yearly";

const BILL_CATEGORIES = [
  "Household Bills",
  "Living Costs",
  "Debt & Finance",
  "Loans",
  "Subscriptions",
  "Temporary",
  "Other",
];

// Legacy bill category names → current scheme
const BILL_CATEGORY_REMAP: Record<string, string> = {
  "Debt/Finance": "Debt & Finance",
};

export default function BillsClient() {
  const { bills, billSplits, expenses, members: householdMembers, session } = useApp();
  const currentUser = useCurrentUser();
  const searchParams = useSearchParams();

  /* Issue #98 (Slice 2 of 6): Bills vs Expenses tab. Expenses get their own
   * tab rather than being interleaved into the bills list — they have no
   * due date, no frequency, no payment-type/status, so the existing
   * due-date filter/sort/grouping logic doesn't apply to them at all, and
   * forcing a shared row layout would either hide real bill fields or show
   * meaningless ones on expense rows. A tab keeps both lists' existing,
   * already-shipped UX intact. */
  const [activeTab, setActiveTab] = useState<"bills" | "expenses">("bills");

  const [isAddBillSheetOpen, setIsAddBillSheetOpen] = useState(false);
  const [isAddExpenseSheetOpen, setIsAddExpenseSheetOpen] = useState(false);
  const [filter, setFilter] = useState<"all" | "week" | "month" | "overdue">("all");
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [displayFrequency, setDisplayFrequency] = useState<FrequencyType>("weekly");

  const [expenseCategoryFilter, setExpenseCategoryFilter] = useState("All");
  const [expenseSearchQuery, setExpenseSearchQuery] = useState("");
  const [expandedExpenseCategories, setExpandedExpenseCategories] = useState<Record<string, boolean>>({});

  const [isMounted, setIsMounted] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({});
  const [isEditCategoryOrderOpen, setIsEditCategoryOrderOpen] = useState(false);
  const [categoryOrder, setCategoryOrder] = useState<string[]>([]);

  const toggleExpenseCategory = (category: string) => {
    setExpandedExpenseCategories((prev) => ({
      ...prev,
      [category]: !prev[category],
    }));
  };

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
    loadCategoryOrder(userId, "bill_category_order", "billCategoryOrder", BILL_CATEGORY_REMAP, BILL_CATEGORIES)
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

  const totalBills = useMemo(() => {
    return bills.reduce((sum, b) => {
      return sum + convertAmount(b.amount, b.frequency || "monthly", displayFrequency);
    }, 0);
  }, [bills, displayFrequency]);

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

  const groupedBills = useMemo(() => {
    const groups: Record<string, typeof filteredBills> = {};
    filteredBills.forEach(bill => {
      const cat = bill.category || "Other";
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(bill);
    });

    Object.keys(groups).forEach(cat => {
      groups[cat].sort((a, b) => {
        const amountA = convertAmount(a.amount, a.frequency || "monthly", displayFrequency);
        const amountB = convertAmount(b.amount, b.frequency || "monthly", displayFrequency);
        return amountB - amountA;
      });
    });

    return groups;
  }, [filteredBills, displayFrequency]);

  const allCategories = useMemo(() => {
    const currentCats = Object.keys(groupedBills);
    return Array.from(new Set([...categoryOrder, ...BILL_CATEGORIES, ...currentCats]));
  }, [groupedBills, categoryOrder]);

  const emptyStateMessage = useMemo(() => {
    if (searchQuery.trim() !== "") return "No bills match your search";
    if (categoryFilter !== "All") return `No bills in ${categoryFilter}`;
    if (filter === "week") return "No bills due this week";
    if (filter === "month") return "No bills due this month";
    if (filter === "overdue") return "No overdue bills";
    return "No bills found";
  }, [filter, searchQuery, categoryFilter]);

  /* ── Expenses (Issue #98, Slice 2 of 6) ──────────────────────
     No due-date/frequency filtering — expenses don't carry those fields.
     Category ordering deliberately reuses BILL_CATEGORIES' plain order (no
     per-user custom ordering, no "Edit Order" affordance) — the #70
     category-ordering extension for expenses is a later sub-slice's job. */
  const totalExpenses = useMemo(() => {
    return expenses.reduce((sum, e) => sum + e.amount, 0);
  }, [expenses]);

  const filteredExpenses = useMemo(() => {
    return expenses.filter((e) => {
      if (expenseSearchQuery.trim() !== "") {
        const query = expenseSearchQuery.toLowerCase();
        if (!e.name.toLowerCase().includes(query)) return false;
      }
      if (expenseCategoryFilter !== "All" && e.category !== expenseCategoryFilter) {
        return false;
      }
      return true;
    });
  }, [expenses, expenseSearchQuery, expenseCategoryFilter]);

  const groupedExpenses = useMemo(() => {
    const groups: Record<string, typeof filteredExpenses> = {};
    filteredExpenses.forEach((expense) => {
      const cat = expense.category || "Other";
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(expense);
    });

    Object.keys(groups).forEach((cat) => {
      groups[cat].sort((a, b) => b.amount - a.amount);
    });

    return groups;
  }, [filteredExpenses]);

  const allExpenseCategories = useMemo(() => {
    const currentCats = Object.keys(groupedExpenses);
    return Array.from(new Set([...BILL_CATEGORIES, ...currentCats]));
  }, [groupedExpenses]);

  const expenseEmptyStateMessage = useMemo(() => {
    if (expenseSearchQuery.trim() !== "") return "No expenses match your search";
    if (expenseCategoryFilter !== "All") return `No expenses in ${expenseCategoryFilter}`;
    return "No expenses found";
  }, [expenseSearchQuery, expenseCategoryFilter]);

  return (
    // 1. Drastically reduced padding and spacing to fix the "oversized" feel
    <div className="flex-1 w-full max-w-4xl mx-auto px-4 pt-4 pb-4 sm:px-6 sm:pt-6 sm:pb-6 space-y-4">

      {/* 2. Clean Header - Action slot added to hold the Add button next to avatar */}
      <PageHeader
        title={activeTab === "bills" ? "Bills" : "Expenses"}
        subtitle={
          activeTab === "bills"
            ? "All household costs, organised by category."
            : "Variable spend — groceries, fuel, and more."
        }
        action={
          <button
            onClick={() =>
              activeTab === "bills" ? setIsAddBillSheetOpen(true) : setIsAddExpenseSheetOpen(true)
            }
            className="flex items-center gap-2 bg-secondary hover:bg-secondary-dark active:scale-95 text-secondary-fg text-xs font-semibold px-3 py-2 rounded-xl shadow-md shadow-secondary/15 transition-all duration-200 cursor-pointer animate-in fade-in duration-200"
          >
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">{activeTab === "bills" ? "Add Bill" : "Add Expense"}</span>
          </button>
        }
      />

      {/* Bills / Expenses tab switcher (Issue #98, Slice 2 of 6) */}
      <div className="grid grid-cols-2 gap-1 bg-background border border-border rounded-[2px] p-1">
        {(["bills", "expenses"] as const).map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setActiveTab(tab)}
            className={`py-2 px-3 rounded-[2px] text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
              activeTab === tab
                ? "bg-primary text-primary-fg shadow"
                : "text-muted hover:text-foreground hover:bg-white/5"
            }`}
          >
            {tab === "bills" ? "Bills" : "Expenses"}
          </button>
        ))}
      </div>

      {activeTab === "bills" ? (
        <>
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
                placeholder="Search bills by name..."
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

          {/* Bills Scrollable Container */}
          <div className="space-y-3">
            <div className="flex items-center justify-end px-1">
              <button
                onClick={() => setIsEditCategoryOrderOpen(true)}
                className="text-[10px] font-heading font-bold text-muted hover:text-foreground uppercase tracking-wider transition-colors"
              >
                Edit Order
              </button>
            </div>
            {filteredBills.length === 0 ? (
              <div className="py-10 text-center">
                <p className="text-muted font-mono text-sm">{emptyStateMessage}</p>
              </div>
            ) : (
              <div className="space-y-6">
                {Object.entries(groupedBills)
                  .sort(([a], [b]) => {
                    const idxA = allCategories.indexOf(a);
                    const idxB = allCategories.indexOf(b);
                    if (idxA !== -1 && idxB !== -1) return idxA - idxB;
                    if (idxA !== -1) return -1;
                    if (idxB !== -1) return 1;
                    return a.localeCompare(b);
                  })
                  .map(([category, categoryBills]) => (
                  <div key={category} className="flex flex-col">
                    <button
                      onClick={() => toggleCategory(category)}
                      className="flex items-center gap-3 w-full text-left px-1 focus:outline-none group"
                    >
                      <span className="font-heading font-bold text-[15px] text-foreground shrink-0 group-hover:text-primary transition-colors">
                        {category}
                      </span>
                      <span className="font-mono text-[11px] font-semibold text-subtle shrink-0">
                        ({categoryBills.length})
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
                        {categoryBills.map((bill) => (
                          <BillCard
                            key={bill.id}
                            bill={bill}
                            splits={billSplits.filter(s => s.bill_id === bill.id)}
                            householdMembers={householdMembers}
                            displayFrequency={displayFrequency}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      ) : (
        <>
          {/* 3. Total Bar (Expenses) — no frequency conversion, expenses have none */}
          <div className="px-1">
            <div className="text-3xl font-bold text-primary tracking-tight font-mono">
              ${totalExpenses.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <div className="text-xs font-bold uppercase tracking-wider text-subtle mt-1">
              Total
            </div>
          </div>

          {/* 4. Filters & Search (Expenses) */}
          <div className="flex flex-col gap-3 px-1">
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-muted uppercase tracking-wider ml-1">
                  Category
                </label>
                <div className="relative">
                  <select
                    value={expenseCategoryFilter}
                    onChange={(e) => setExpenseCategoryFilter(e.target.value)}
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
            </div>

            {/* Search */}
            <div className="relative w-full">
              <input
                type="text"
                placeholder="Search expenses by name..."
                value={expenseSearchQuery}
                onChange={(e) => setExpenseSearchQuery(e.target.value)}
                className="w-full bg-transparent border-b border-border pl-1 pr-8 py-2 font-body text-sm placeholder:text-muted focus:outline-none focus:border-primary text-foreground"
              />
              {expenseSearchQuery && (
                <button
                  onClick={() => setExpenseSearchQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-foreground transition-colors p-1"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>

          {/* Expenses Scrollable Container */}
          <div className="space-y-3">
            {filteredExpenses.length === 0 ? (
              <div className="py-10 text-center">
                <p className="text-muted font-mono text-sm">{expenseEmptyStateMessage}</p>
              </div>
            ) : (
              <div className="space-y-6">
                {Object.entries(groupedExpenses)
                  .sort(([a], [b]) => {
                    const idxA = allExpenseCategories.indexOf(a);
                    const idxB = allExpenseCategories.indexOf(b);
                    if (idxA !== -1 && idxB !== -1) return idxA - idxB;
                    if (idxA !== -1) return -1;
                    if (idxB !== -1) return 1;
                    return a.localeCompare(b);
                  })
                  .map(([category, categoryExpenses]) => (
                  <div key={category} className="flex flex-col">
                    <button
                      onClick={() => toggleExpenseCategory(category)}
                      className="flex items-center gap-3 w-full text-left px-1 focus:outline-none group"
                    >
                      <span className="font-heading font-bold text-[15px] text-foreground shrink-0 group-hover:text-primary transition-colors">
                        {category}
                      </span>
                      <span className="font-mono text-[11px] font-semibold text-subtle shrink-0">
                        ({categoryExpenses.length})
                      </span>
                      <span
                        className="h-0.5 flex-1 rounded-sm"
                        style={{ background: "linear-gradient(90deg, var(--color-primary), transparent)" }}
                      />
                      {expandedExpenseCategories[category] ? (
                        <ChevronUp className="h-4 w-4 text-subtle group-hover:text-foreground transition-colors shrink-0" />
                      ) : (
                        <ChevronDown className="h-4 w-4 text-subtle group-hover:text-foreground transition-colors shrink-0" />
                      )}
                    </button>

                    {expandedExpenseCategories[category] && (
                      <div className="flex flex-col mt-1">
                        {categoryExpenses.map((expense) => (
                          <ExpenseCard
                            key={expense.id}
                            expense={expense}
                            householdMembers={householdMembers}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}

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
