"use client";

import { useState, useMemo, useEffect, useRef, useId } from "react";
import { flushSync } from "react-dom";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Calculator, ChevronDown, ChevronUp, SlidersHorizontal } from "lucide-react";
import { useApp, type Fund } from "@/context/AppContext";
import AddFlow from "@/components/AddFlow";
import AddGoalFlow from "@/components/AddGoalFlow";
import GoalDetailSheet from "@/components/GoalDetailSheet";
import AddAmountModal from "@/components/AddAmountModal";
import EditCategoryOrderModal from "@/components/EditCategoryOrderModal";
import ImpactCalculator from "@/components/ImpactCalculator";
import PageHeader from "@/components/PageHeader";
import GoalRow from "@/components/GoalRow";
import WishRow from "@/components/WishRow";
import Button from "@/components/ui/Button";
import Chip from "@/components/ui/Chip";
import Dialog from "@/components/ui/Dialog";
import { loadCategoryOrder, saveCategoryOrder } from "@/lib/categoryOrderPreferences";
import { hasAddSheetParam, stripAddSheetParam } from "@/lib/finishSetup";
import { applyToggle, loadCollapsed, saveCollapsed } from "@/lib/categoryCollapse";
import { loadFrequency, type FrequencyType } from "@/lib/frequencyPreference";
import { todayInZone } from "@/lib/notifications/timezone";
import { useCountUp } from "@/hooks/useCountUp";
import { useHouseholdTotal } from "@/hooks/useHouseholdTotal";
import { useRowHighlight } from "@/hooks/useRowHighlight";
import { GOAL_CATEGORIES, goalRowKey, type AddedGoal } from "@/lib/addGoalFlow";
import type { BillPrefill } from "@/lib/impactCalc";
import {
  isTracking,
  pace as paceFor,
  savingGoals,
  savingTotals,
  sortByCost,
  sortByProgress,
} from "@/lib/goalPace";

// Legacy goal category names → new 8-category scheme
const GOAL_CATEGORY_REMAP: Record<string, string> = {
  "Emergency Fund": "Emergency",
  "Buy a House": "Home & Living",
  "Vacation": "Vacation & Travel",
  "Transport": "Vacation & Travel",
  "Debt Payoff": "Debt & Finance",
  "Interest Free Payment": "Debt & Finance",
  "Short-Term": "Other",
  // "Wish List" is no longer a category: Kind (Just tracking) is the only switch.
  "Wish List": "Other",
};

/** Goals keep their own remembered open/closed choices (a Bills category can share a name). */
const COLLAPSE_SCOPE = "goals";
/** The Wish list group's key in that list. Not a real category name, so it can never clash with one. */
const WISH_KEY = "__wish_list__";

const moneyFmt = (n: number) =>
  `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function FundsClient() {
  const { funds, session, isDataLoading, contributionRules, paySchedules, householdTimezone } = useApp();
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  // ── Local UI state ────────────────────────────────────────────────
  // R11: keep the id and look the goal up each render, so the sheet follows every
  // save and closes by itself if the goal is deleted.
  const [selectedGoalId, setSelectedGoalId] = useState<string | null>(null);
  const selectedGoal =
    selectedGoalId === null ? null : (funds.find((f) => String(f.id) === selectedGoalId) ?? null);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const { highlightKey, flash } = useRowHighlight();
  const [addAmountGoal, setAddAmountGoal] = useState<Fund | null>(null);
  const addAmountInputId = useId();

  const [categoryFilter, setCategoryFilter] = useState("All");
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  // F04: the Category pick is a draft until Apply; re-seeded from the live filter each time the card opens.
  const [draftCategory, setDraftCategory] = useState("All");
  // R15 pattern: categories start open; only the ones a person closed are remembered (on this phone).
  const [collapsed, setCollapsed] = useState<string[]>([]);
  const [isEditCategoryOrderOpen, setIsEditCategoryOrderOpen] = useState(false);
  const [categoryOrder, setCategoryOrder] = useState<string[]>([]);

  // Check impact (R16 calculator, now also from Goals). The "amounts as" choice is the
  // one remembered on the Bills page; read after mount so the first render matches the server.
  const [displayFrequency, setDisplayFrequency] = useState<FrequencyType>("weekly");
  const [isImpactOpen, setIsImpactOpen] = useState(false);
  const [impactInitial, setImpactInitial] = useState<{ name: string; amount: number } | undefined>(undefined);
  const householdTotal = useHouseholdTotal(displayFrequency);
  // "Turn into a bill" opens the Add flow here, prefilled; adding goes to Bills to show the new bill.
  const [isBillFlowOpen, setIsBillFlowOpen] = useState(false);
  const [billPrefill, setBillPrefill] = useState<BillPrefill | undefined>(undefined);

  const toggleCategory = (category: string) => {
    const collapse = !collapsed.includes(category);
    setCollapsed(collapse ? [...collapsed, category] : collapsed.filter((c) => c !== category));
    // Persist from what is stored plus this one toggle, so categories opened by a
    // new row are never saved as a choice.
    const userId = session?.user?.id;
    if (userId) saveCollapsed(userId, applyToggle(loadCollapsed(userId, COLLAPSE_SCOPE), category, collapse), COLLAPSE_SCOPE);
  };
  // Opens a category in state only (a new row); never changes what is remembered.
  const openCategory = (category: string) =>
    setCollapsed((prev) => (prev.includes(category) ? prev.filter((c) => c !== category) : prev));

  useEffect(() => {
    const userId = session?.user?.id;
    if (!userId) return;
    // One-shot sync from localStorage, not a render cascade.
    /* eslint-disable react-hooks/set-state-in-effect */
    setCollapsed(loadCollapsed(userId, COLLAPSE_SCOPE));
    setDisplayFrequency(loadFrequency(userId));
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [session?.user?.id]);

  useEffect(() => {
    const userId = session?.user?.id;
    if (!userId) return;
    loadCategoryOrder(userId, "goal_category_order", "goalCategoryOrder", GOAL_CATEGORY_REMAP, GOAL_CATEGORIES)
      .then(setCategoryOrder)
      .catch(() => {});
  }, [session?.user?.id]);

  // Notification-tap links (#193, same strip-on-use pattern as Payday's
  // #182 links): /funds?goalId=<fund id> opens that goal's detail popup
  // once household data has loaded. The param is stripped as soon as it's
  // used, so refresh/back never re-opens it; a missing/deleted goal just
  // lands on the plain Goals page.
  const handledGoalLinkRef = useRef<string | null>(null);
  useEffect(() => {
    if (isDataLoading || !searchParams) return;
    const goalId = searchParams.get("goalId");
    if (!goalId) {
      // Reset so the same link tapped again later (e.g. from the inbox while
      // already on this page) still works.
      handledGoalLinkRef.current = null;
      return;
    }
    if (handledGoalLinkRef.current === goalId) return;
    handledGoalLinkRef.current = goalId;

    const target = funds.find((f) => String(f.id) === goalId);
    if (target) {
      // One-shot sync with an external input (the tapped link), guarded by
      // handledGoalLinkRef — not a render cascade.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSelectedGoalId(String(target.id));
    }

    const params = new URLSearchParams(searchParams.toString());
    params.delete("goalId");
    const rest = params.toString();
    router.replace(`${pathname}${rest ? `?${rest}` : ""}`, { scroll: false });
  }, [isDataLoading, searchParams, funds, pathname, router]);

  // Finish setting up card (#333): /funds?add=1 opens the Add Goal flow once.
  // Not gated on isDataLoading (the sheet needs no data). Waits while a goalId
  // link is pending so the two router.replace strips (each built from the
  // current params) can't resurrect each other's param.
  const handledAddRef = useRef(false);
  useEffect(() => {
    if (!searchParams) return;
    if (!hasAddSheetParam(searchParams)) {
      handledAddRef.current = false;
      return;
    }
    if (handledAddRef.current || searchParams.get("goalId")) return;
    handledAddRef.current = true;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsAddOpen(true);
    const rest = stripAddSheetParam(searchParams);
    router.replace(`${pathname}${rest ? `?${rest}` : ""}`, { scroll: false });
  }, [searchParams, pathname, router]);

  // ── Derived values ────────────────────────────────────────────────
  // Only Saving goals count towards the total and the pace; Just tracking goals live in the Wish list.
  const filterActive = categoryFilter !== "All";

  const saving = useMemo(() => savingGoals(funds), [funds]);
  const listedSaving = useMemo(
    () =>
      saving.filter(
        (f) => !filterActive || (f.category === "Wish List" ? "Other" : f.category || "Other") === categoryFilter,
      ),
    [saving, filterActive, categoryFilter],
  );
  // The Wish list is its own group (Kind is the only switch), so the category Filter does not apply to it.
  const listedWish = useMemo(() => sortByCost(funds.filter(isTracking)), [funds]);

  const totals = useMemo(() => savingTotals(listedSaving), [listedSaving]);
  // Count the headline total up/down when it changes (adding money, deleting a goal)
  // instead of popping to the new figure.
  const displayTotalSaved = useCountUp(totals.saved);

  const groupedSaving = useMemo(() => {
    const groups: Record<string, Fund[]> = {};
    listedSaving.forEach((fund) => {
      // A retired "Wish List" category on an old Saving row reads as Other until its data is updated.
      const cat = !fund.category || fund.category === "Wish List" ? "Other" : fund.category;
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(fund);
    });
    Object.keys(groups).forEach((cat) => {
      groups[cat] = sortByProgress(groups[cat]);
    });
    return groups;
  }, [listedSaving]);

  const allCategories = useMemo(() => {
    const currentCats = Array.from(new Set(funds.map((f) => f.category || "Other")));
    // "Wish List" is a retired category name some old rows still carry; it is not a choice any more.
    return Array.from(new Set([...categoryOrder, ...GOAL_CATEGORIES, ...currentCats])).filter((c) => c !== "Wish List");
  }, [funds, categoryOrder]);

  const today = useMemo(() => todayInZone(householdTimezone || "Australia/Sydney"), [householdTimezone]);

  const hasRows = listedSaving.length > 0 || listedWish.length > 0;

  // ── Handlers ──────────────────────────────────────────────────────
  // Open "Add to {goal}" and focus its box inside the same tap, so the iOS keyboard rises with it.
  const openAddAmount = (fund: Fund) => {
    flushSync(() => setAddAmountGoal(fund));
    document.getElementById(addAmountInputId)?.focus();
  };

  const openImpact = (fund?: Fund) => {
    setImpactInitial(fund ? { name: fund.name, amount: fund.targetAmount } : undefined);
    setIsImpactOpen(true);
  };

  // After an add: show the new goal (clear the category filter), open its group, then
  // scroll to it and let it glow. The longer delay waits out the category expand animation
  // (--duration-structural, 550ms) so the scroll lands on the settled row.
  const handleAdded = (goal: AddedGoal) => {
    setCategoryFilter("All");
    openCategory(goal.category || "Other");
    openCategory(WISH_KEY);
    flash(goalRowKey(goal.id), 600);
  };

  const sortedCategories = (names: string[]) =>
    [...names].sort((a, b) => {
      const idxA = allCategories.indexOf(a);
      const idxB = allCategories.indexOf(b);
      if (idxA !== -1 && idxB !== -1) return idxA - idxB;
      if (idxA !== -1) return -1;
      if (idxB !== -1) return 1;
      return a.localeCompare(b);
    });

  /** One group: a header button (name, count, optional subtotal) and a smoothly collapsing body. */
  const renderGroup = (key: string, title: string, count: number, subtotal: string | null, rows: (isExpanded: boolean) => React.ReactNode) => {
    const isExpanded = !collapsed.includes(key);
    return (
      <div key={key} className="flex flex-col">
        <button
          type="button"
          onClick={() => toggleCategory(key)}
          aria-expanded={isExpanded}
          className="group flex min-h-11 w-full items-center gap-3 px-1 text-left focus:outline-none"
        >
          <span className="shrink-0 text-[15px] font-bold text-foreground transition-colors group-hover:text-primary-ink">
            {title}
          </span>
          <span className="shrink-0 text-[11px] font-semibold text-subtle">({count})</span>
          {subtotal && (
            <span className="shrink-0 text-[11px] font-semibold tabular-nums text-muted">{subtotal}</span>
          )}
          <span
            className="h-0.5 flex-1 rounded-sm"
            style={{ background: "linear-gradient(90deg, var(--color-primary), transparent)" }}
          />
          {isExpanded ? (
            <ChevronUp className="h-4 w-4 shrink-0 text-subtle transition-colors group-hover:text-foreground" aria-hidden="true" />
          ) : (
            <ChevronDown className="h-4 w-4 shrink-0 text-subtle transition-colors group-hover:text-foreground" aria-hidden="true" />
          )}
        </button>

        {/* Expand/collapse via grid-template-rows (Slice 99, same technique as the
            dashboard's other collapsible cards) so rows grow/shrink smoothly. */}
        <div
          className="grid transition-[grid-template-rows] duration-(--duration-structural) ease-(--ease-enter)"
          style={{ gridTemplateRows: isExpanded ? "1fr" : "0fr" }}
        >
          <div className="min-h-0 overflow-hidden" aria-hidden={!isExpanded} inert={!isExpanded ? true : undefined}>
            <div className="mt-1 flex flex-col">{rows(isExpanded)}</div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="flex-1 w-full max-w-4xl mx-auto px-4 pt-4 pb-8 sm:px-6 md:pt-6 md:pb-12 space-y-4">
      <PageHeader title="Goals" subtitle="What you are saving towards" onAdd={() => setIsAddOpen(true)} addLabel="New goal" />

      {/* Total of Saving goals only (Just tracking goals are in the Wish list below) */}
      <div className="px-1">
        <div className="text-xs font-bold uppercase tracking-wider text-subtle">
          {filterActive ? "Filtered total" : "Total saved"}
        </div>
        <div className="mt-1 text-3xl font-bold tracking-tight text-primary-ink">{moneyFmt(displayTotalSaved)}</div>
        <p className="mt-1 text-xs font-body text-muted">
          {totals.count === 0 ? (
            "No saving goals yet"
          ) : (
            <>
              {totals.count} goal{totals.count !== 1 ? "s" : ""} · {moneyFmt(totals.toGo)} still to go
            </>
          )}
        </p>
      </div>

      {/* Filter */}
      <div
        role="group"
        aria-label="Filters"
        className="scrollbar-none -mx-4 flex items-center gap-2 overflow-x-auto px-4 sm:mx-0 sm:px-0"
      >
        <Chip
          onClick={() => {
            setDraftCategory(categoryFilter);
            setIsFilterOpen(true);
          }}
          aria-haspopup="dialog"
        >
          <span className="relative inline-flex">
            <SlidersHorizontal size={16} aria-hidden="true" />
            {filterActive && (
              <span className="absolute -right-1 -top-1 h-2 w-2 rounded-full bg-primary" aria-hidden="true" />
            )}
          </span>
          Filter
          {filterActive && <span className="sr-only"> (filters chosen)</span>}
        </Chip>
        <Chip onClick={() => openImpact()} aria-haspopup="dialog">
          <Calculator size={16} aria-hidden="true" />
          Check impact
        </Chip>
      </div>

      {/* Goals */}
      <div className="space-y-3">
        {!hasRows ? (
          <div className="flex flex-col items-center gap-3 py-10 text-center">
            {funds.length === 0 ? (
              <>
                <p className="text-sm text-muted">No goals yet.</p>
                <Button onClick={() => setIsAddOpen(true)}>Add your first goal</Button>
              </>
            ) : (
              <>
                <p className="text-sm text-muted">No goals in {categoryFilter}</p>
                <Button variant="ghost" onClick={() => setCategoryFilter("All")}>
                  Clear filter
                </Button>
              </>
            )}
          </div>
        ) : (
          <div className="space-y-6">
            {sortedCategories(Object.keys(groupedSaving)).map((category) => {
              const categoryFunds = groupedSaving[category];
              const subtotal = moneyFmt(categoryFunds.reduce((s, f) => s + f.currentAmount, 0));
              return renderGroup(category, category, categoryFunds.length, subtotal, (isExpanded) =>
                categoryFunds.map((fund, index) => (
                  // Inner wrapper: the add highlight must not override fund-row-in.
                  <div
                    key={fund.id}
                    id={goalRowKey(fund.id)}
                    className={highlightKey === goalRowKey(fund.id) ? "row-highlight" : undefined}
                  >
                    <GoalRow
                      fund={fund}
                      pace={paceFor(fund, contributionRules, paySchedules, today)}
                      staggerIndex={index}
                      isExpanded={isExpanded}
                      onOpen={() => setSelectedGoalId(String(fund.id))}
                      onAddAmount={() => openAddAmount(fund)}
                    />
                  </div>
                )),
              );
            })}

            {/* Wish list: Just tracking goals, always last, whatever their category */}
            {listedWish.length > 0 &&
              renderGroup(WISH_KEY, "Wish list", listedWish.length, null, (isExpanded) =>
                listedWish.map((fund, index) => (
                  <div
                    key={fund.id}
                    id={goalRowKey(fund.id)}
                    className={highlightKey === goalRowKey(fund.id) ? "row-highlight" : undefined}
                  >
                    <WishRow
                      fund={fund}
                      staggerIndex={index}
                      isExpanded={isExpanded}
                      onOpen={() => setSelectedGoalId(String(fund.id))}
                    />
                  </div>
                )),
              )}
          </div>
        )}
      </div>

      <Dialog
        open={isFilterOpen}
        onClose={() => setIsFilterOpen(false)}
        title="Filter"
        placement="bottom"
        footer={
          <div className="flex w-full flex-col gap-2">
            <Button
              fullWidth
              onClick={() => {
                setCategoryFilter(draftCategory);
                setIsFilterOpen(false);
              }}
            >
              Apply
            </Button>
            <div className="flex gap-2">
              <Button
                variant="ghost"
                className="flex-1"
                disabled={draftCategory === "All"}
                onClick={() => setDraftCategory("All")}
              >
                Reset
              </Button>
              <Button
                variant="ghost"
                className="flex-1"
                onClick={() => {
                  setIsFilterOpen(false);
                  setIsEditCategoryOrderOpen(true);
                }}
              >
                Edit order
              </Button>
            </div>
          </div>
        }
      >
        <div>
          <div className="mb-2 text-xs font-bold uppercase tracking-wider text-subtle">Category</div>
          <div role="group" aria-label="Category" className="flex flex-wrap gap-2">
            {["All", ...allCategories].map((c) => (
              <Chip key={c} selected={draftCategory === c} onClick={() => setDraftCategory(c)}>
                {c}
              </Chip>
            ))}
          </div>
        </div>
      </Dialog>

      {/* Goal Detail Sheet — keyed so it genuinely remounts per open (the
          component itself is always mounted here; only its internal
          isOpen/goal check hides it), including reopening the same goal. */}
      <GoalDetailSheet
        key={selectedGoal ? `open-${selectedGoal.id}` : "closed"}
        isOpen={selectedGoal !== null}
        onClose={() => setSelectedGoalId(null)}
        goal={selectedGoal}
        onCheckImpact={openImpact}
      />

      {/* Add Goal flow */}
      <AddGoalFlow open={isAddOpen} onClose={() => setIsAddOpen(false)} onAdded={handleAdded} />

      {/* Check impact: the full calculator, including Turn into a bill */}
      <ImpactCalculator
        open={isImpactOpen}
        onClose={() => setIsImpactOpen(false)}
        frequency={displayFrequency}
        currentTotal={householdTotal}
        initial={impactInitial}
        onTurnIntoBill={(prefill) => {
          setBillPrefill(prefill);
          setIsBillFlowOpen(true);
        }}
      />

      {/* Add flow for "Turn into a bill": after it saves, go to Bills so the new bill is seen */}
      <AddFlow
        open={isBillFlowOpen}
        onClose={() => setIsBillFlowOpen(false)}
        onAdded={() => router.push("/bills")}
        prefill={billPrefill}
      />

      {/* Add Amount Modal */}
      <AddAmountModal
        isOpen={addAmountGoal !== null}
        onClose={() => setAddAmountGoal(null)}
        goal={addAmountGoal}
        inputId={addAmountInputId}
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
