"use client";

import { useState, useMemo, useEffect } from "react";
import { Target, Plus, ChevronDown, ChevronUp } from "lucide-react";
import { useApp, useCurrentUser, type Fund } from "@/context/AppContext";
import AddGoalSheet from "@/components/AddGoalSheet";
import EditGoalSheet from "@/components/EditGoalSheet";
import GoalDetailSheet from "@/components/GoalDetailSheet";
import AddAmountModal from "@/components/AddAmountModal";
import EditCategoryOrderModal from "@/components/EditCategoryOrderModal";
import PageHeader from "@/components/PageHeader";
import SectionHeader from "@/components/ui/SectionHeader";
import { loadCategoryOrder, saveCategoryOrder } from "@/lib/categoryOrderPreferences";

const GOAL_CATEGORIES = [
  "Home & Living",
  "Vacation & Travel",
  "Wish List",
  "Education",
  "Debt & Finance",
  "Savings",
  "Emergency",
  "Other",
];

// Legacy goal category names → new 8-category scheme
const GOAL_CATEGORY_REMAP: Record<string, string> = {
  "Emergency Fund": "Emergency",
  "Buy a House": "Home & Living",
  "Vacation": "Vacation & Travel",
  "Transport": "Vacation & Travel",
  "Debt Payoff": "Debt & Finance",
  "Interest Free Payment": "Debt & Finance",
  "Short-Term": "Wish List",
};

export default function FundsClient() {
  const { funds, deleteGoal, addToGoal, session } = useApp();
  const currentUser = useCurrentUser();

  // ── Local UI state ────────────────────────────────────────────────
  const [selectedGoal, setSelectedGoal] = useState<Fund | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [addAmountGoal, setAddAmountGoal] = useState<Fund | null>(null);

  const [categoryFilter, setCategoryFilter] = useState("All");
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
    const userId = session?.user?.id;
    if (!userId) return;
    loadCategoryOrder(userId, "goal_category_order", "goalCategoryOrder", GOAL_CATEGORY_REMAP, GOAL_CATEGORIES)
      .then(setCategoryOrder)
      .catch(() => {});
  }, [session?.user?.id]);

  // ── Derived summary values ────────────────────────────────────────
  const totalSaved = funds.reduce((sum, f) => sum + f.currentAmount, 0);
  const avgCompletion =
    funds.length > 0
      ? funds.reduce((sum, f) => sum + (f.currentAmount / f.targetAmount) * 100, 0) /
        funds.length
      : 0;

  const filteredFunds = useMemo(() => {
    return funds.filter((f) => {
      if (categoryFilter === "All") return true;
      return (f.category || "Other") === categoryFilter;
    });
  }, [funds, categoryFilter]);

  const groupedFunds = useMemo(() => {
    const groups: Record<string, typeof filteredFunds> = {};
    filteredFunds.forEach((fund) => {
      const cat = fund.category || "Other";
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(fund);
    });

    Object.keys(groups).forEach((cat) => {
      groups[cat].sort((a, b) => b.currentAmount - a.currentAmount);
    });

    return groups;
  }, [filteredFunds]);

  const allCategories = useMemo(() => {
    const currentCats = Object.keys(groupedFunds);
    return Array.from(new Set([...categoryOrder, ...GOAL_CATEGORIES, ...currentCats]));
  }, [groupedFunds, categoryOrder]);

  // ── Handlers ──────────────────────────────────────────────────────
  const handleDeleteGoal = async () => {
    if (selectedGoal && confirm(`Are you sure you want to delete "${selectedGoal.name}"?`)) {
      try {
        await deleteGoal(selectedGoal.id);
        setIsDetailOpen(false);
        setSelectedGoal(null);
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : "Unknown error";
        alert("Failed to delete goal: " + errMsg);
      }
    }
  };

  return (
    <div className="flex-1 w-full max-w-4xl mx-auto px-4 pt-4 pb-8 sm:px-6 md:pt-6 md:pb-12 space-y-6">
      <PageHeader
        title="Goals"
        subtitle="Track your savings and financial targets"
        action={
          <button
            onClick={() => setIsAddOpen(true)}
            className="flex items-center gap-2 bg-secondary hover:bg-secondary-dark active:scale-95 text-secondary-fg text-xs font-semibold px-3 py-2 rounded-xl shadow-md shadow-secondary/15 transition-all duration-200"
          >
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">New Goal</span>
          </button>
        }
      />

      {/* Summary bar — de-boxed editorial (live figures only) */}
      <div className="px-1">
        <div className="text-3xl font-bold text-primary tracking-tight font-mono">
          ${totalSaved.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </div>
        <div className="text-xs font-bold uppercase tracking-wider text-subtle mt-1">
          Total Accumulated Savings
        </div>
        <div className="text-[11px] font-mono text-muted mt-2">
          {funds.length} active goal{funds.length !== 1 ? "s" : ""} · {avgCompletion.toFixed(1)}% avg completion
        </div>
      </div>

      {/* Savings Goals */}
      <div>
        <SectionHeader
          title="Savings Goals"
          trailing={
            <button
              onClick={() => setIsEditCategoryOrderOpen(true)}
              className="text-[10px] font-heading font-bold text-muted hover:text-foreground uppercase tracking-wider transition-colors"
            >
              Edit Order
            </button>
          }
        />

        {/* Category filter — hairline underline select */}
        <div className="px-1 mb-4 max-w-xs">
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
                <option value="Home & Living">Home & Living</option>
                <option value="Debt & Finance">Debt & Finance</option>
                <option value="Vacation & Travel">Vacation & Travel</option>
                <option value="Savings">Savings</option>
                <option value="Emergency">Emergency</option>
                <option value="Wish List">Wish List</option>
                <option value="Education">Education</option>
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

        {filteredFunds.length === 0 ? (
          <div className="py-10 text-center">
            {categoryFilter !== "All" ? (
              <p className="text-muted font-mono text-sm">No goals in {categoryFilter}</p>
            ) : (
              <>
                <p className="text-muted font-mono text-sm">No goals configured yet.</p>
                <p className="text-subtle text-xs mt-1 font-body">Create your first savings goal to get started.</p>
              </>
            )}
          </div>
        ) : (
          <div className="space-y-6">
            {Object.entries(groupedFunds)
              .sort(([a], [b]) => {
                const idxA = allCategories.indexOf(a);
                const idxB = allCategories.indexOf(b);
                if (idxA !== -1 && idxB !== -1) return idxA - idxB;
                if (idxA !== -1) return -1;
                if (idxB !== -1) return 1;
                return a.localeCompare(b);
              })
              .map(([category, categoryFunds]) => (
              <div key={category} className="flex flex-col">
                <button
                  onClick={() => toggleCategory(category)}
                  className="flex items-center gap-3 w-full text-left px-1 focus:outline-none group"
                >
                  <span className="font-heading font-bold text-[15px] text-foreground shrink-0 group-hover:text-primary transition-colors">
                    {category}
                  </span>
                  <span className="font-mono text-[11px] font-semibold text-subtle shrink-0">
                    ({categoryFunds.length})
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
                    {categoryFunds.map((fund) => {
                      const IconComponent = fund.icon;
                      const percentage = Math.min((fund.currentAmount / fund.targetAmount) * 100, 100);
                      const isComplete = fund.currentAmount >= fund.targetAmount;

                      return (
                        <div
                          key={fund.id}
                          role="button"
                          tabIndex={0}
                          onClick={() => {
                            setSelectedGoal(fund);
                            setIsDetailOpen(true);
                          }}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") {
                              e.preventDefault();
                              setSelectedGoal(fund);
                              setIsDetailOpen(true);
                            }
                          }}
                          className="border-t border-border py-3 cursor-pointer hover:bg-surface/40 transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-inset rounded-sm"
                        >
                          {/* Header: icon · name/category · percent */}
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div className={`flex h-8 w-8 rounded-lg items-center justify-center shrink-0 ${fund.bgLight || "bg-white/5 text-foreground"}`}>
                                <IconComponent className="h-4 w-4" />
                              </div>
                              <div className="min-w-0">
                                <h4 className="font-body font-semibold text-[15px] text-foreground truncate leading-tight">
                                  {fund.name}
                                </h4>
                                <span className="text-[10px] font-mono font-semibold uppercase tracking-wider text-subtle block mt-0.5">
                                  {fund.category}
                                </span>
                              </div>
                            </div>
                            <span className={`font-mono font-bold text-sm shrink-0 ${fund.accentText || "text-primary"}`}>
                              {percentage.toFixed(1)}%
                            </span>
                          </div>

                          {/* Progress bar — driven by live state */}
                          <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden mt-2.5">
                            <div
                              className={`h-full rounded-full transition-all duration-500 ${fund.barColor || "bg-primary"}`}
                              style={{ width: `${percentage}%` }}
                            />
                          </div>

                          {/* Amounts */}
                          <div className="flex items-center justify-between font-mono text-[11px] mt-1.5">
                            <span className="font-semibold text-foreground">
                              ${fund.currentAmount.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                            </span>
                            <span className="text-subtle">
                              target: ${fund.targetAmount.toLocaleString("en-US", { minimumFractionDigits: 0 })}
                            </span>
                          </div>

                          {/* Add Money / Completed action */}
                          {isComplete ? (
                            <div className="flex items-center gap-1.5 mt-2.5 text-primary text-[11px] font-mono font-bold uppercase tracking-wider">
                              <Target className="h-3.5 w-3.5" />
                              <span>Goal Reached! 🎉</span>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setAddAmountGoal(fund);
                              }}
                              className="mt-2.5 inline-flex items-center gap-1.5 py-1 text-[11px] font-heading font-bold uppercase tracking-wider text-muted hover:text-primary transition-colors"
                            >
                              <Plus className="h-3.5 w-3.5" />
                              Add Amount
                            </button>
                          )}
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

      {/* Goal Detail Sheet */}
      <GoalDetailSheet
        isOpen={isDetailOpen}
        onClose={() => {
          setIsDetailOpen(false);
          setSelectedGoal(null);
        }}
        goal={selectedGoal}
        onEdit={() => {
          setIsDetailOpen(false);
          setIsEditOpen(true);
        }}
        onDelete={handleDeleteGoal}
      />

      {/* Edit Goal Sheet */}
      <EditGoalSheet
        isOpen={isEditOpen}
        onClose={() => {
          setIsEditOpen(false);
          setSelectedGoal(null);
        }}
        existingGoal={selectedGoal}
      />

      {/* Add Goal Sheet */}
      <AddGoalSheet
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
      />

      {/* Add Amount Modal */}
      <AddAmountModal
        isOpen={addAmountGoal !== null}
        onClose={() => setAddAmountGoal(null)}
        goal={addAmountGoal}
        onConfirm={(amount) => {
          if (addAmountGoal) {
            addToGoal(addAmountGoal.id, amount);
          }
        }}
      />

      {/* Edit Category Order Modal */}
      <EditCategoryOrderModal
        isOpen={isEditCategoryOrderOpen}
        onClose={() => setIsEditCategoryOrderOpen(false)}
        categories={allCategories}
        onSave={(newOrder) => {
          setCategoryOrder(newOrder);
          if (session?.user?.id) {
            saveCategoryOrder(session.user.id, "goal_category_order", newOrder).catch(() => {});
          }
        }}
      />
    </div>
  );
}
