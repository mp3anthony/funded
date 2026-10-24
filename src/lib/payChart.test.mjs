// Runtime tests for the Payday history chart rules (R22, #409).
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  PERIODS,
  periodStart,
  listRows,
  buildSeries,
  householdTotal,
  sharePercent,
  pendingInPeriod,
  toggleMember,
  filterLabel,
  niceTop,
  chartDomain,
  xFraction,
  axisLabel,
  shortDate,
  domainDate,
  seriesColour,
  SERIES_COLOURS,
  isChartable,
} from "./payChart.ts";

const row = (id, member, date, amount, extra = {}) => ({ id, member_id: member, pay_date: date, amount, status: "confirmed", ...extra });
const TODAY = "2026-10-24";

test("periods: 4 weeks is 28 days including today, months clamp, All has no start", () => {
  assert.deepEqual(PERIODS.map((p) => p.value), ["4w", "3m", "12m", "all"]);
  assert.equal(periodStart("4w", TODAY), "2026-09-27");
  assert.equal(periodStart("3m", TODAY), "2026-07-24");
  assert.equal(periodStart("12m", TODAY), "2025-10-24");
  assert.equal(periodStart("3m", "2026-05-31"), "2026-02-28");
  assert.equal(periodStart("all", TODAY), null);
  assert.equal(periodStart("3m", ""), null);
});

test("list: chosen members, inside the period, newest first, Pending included", () => {
  const rows = [
    row(1, "a", "2026-10-01", 100),
    row(2, "a", "2026-10-15", 110),
    row(3, "b", "2026-10-15", 200),
    row(4, "a", "2026-06-01", 90),
    row(5, "a", "2026-10-20", null, { status: "pending" }),
  ];
  const out = listRows(rows, ["a"], "2026-07-24").map((r) => r.id);
  assert.deepEqual(out, [5, 2, 1]);
  assert.deepEqual(listRows(rows, ["a", "b"], null).map((r) => r.id).slice(0, 2), [5, 2]);
});

test("same-day rows break the tie on created_at", () => {
  const rows = [
    row(1, "a", "2026-10-01", 1, { created_at: "2026-10-01T01:00:00Z" }),
    row(2, "a", "2026-10-01", 2, { created_at: "2026-10-01T02:00:00Z" }),
  ];
  assert.deepEqual(listRows(rows, ["a"], null).map((r) => r.id), [2, 1]);
});

test("series: confirmed pays only, oldest first, total and mean; Pending and null skipped", () => {
  const rows = [
    row(1, "a", "2026-10-15", 110),
    row(2, "a", "2026-10-01", 100),
    row(3, "a", "2026-10-20", null, { status: "pending" }),
    row(4, "a", "2026-10-22", 50, { status: "pending" }),
    row(5, "b", "2026-10-15", 200),
  ];
  const [a, b, c] = buildSeries(rows, ["a", "b", "c"], null);
  assert.deepEqual(a.points.map((p) => p.date), ["2026-10-01", "2026-10-15"]);
  assert.equal(a.total, 210);
  assert.equal(a.average, 105);
  assert.equal(b.total, 200);
  assert.equal(c.points.length, 0);
  assert.equal(c.average, null);
  assert.equal(c.total, 0);
});

test("a pay from before the period is left out", () => {
  const rows = [row(1, "a", "2026-01-01", 500), row(2, "a", "2026-10-01", 100)];
  const [a] = buildSeries(rows, ["a"], "2026-07-24");
  assert.equal(a.total, 100);
});

test("household total counts everyone, share rounds and handles zero", () => {
  const rows = [row(1, "a", "2026-10-01", 300), row(2, "b", "2026-10-01", 100), row(3, "b", "2026-10-02", null, { status: "pending" })];
  const hh = householdTotal(rows, null);
  assert.equal(hh, 400);
  assert.equal(sharePercent(300, hh), 75);
  assert.equal(sharePercent(1, 3), 33);
  assert.equal(sharePercent(0, 0), null);
});

test("pending count follows members and period", () => {
  const rows = [
    row(1, "a", "2026-10-01", null, { status: "pending" }),
    row(2, "b", "2026-10-01", null, { status: "pending" }),
    row(3, "a", "2026-01-01", null, { status: "pending" }),
  ];
  assert.equal(pendingInPeriod(rows, ["a"], "2026-07-24"), 1);
  assert.equal(pendingInPeriod(rows, ["a", "b"], null), 3);
});

test("ticking: flips one, keeps member order, never empties", () => {
  const all = ["a", "b", "c"];
  assert.deepEqual(toggleMember(["a", "b", "c"], "b", all), ["a", "c"]);
  assert.deepEqual(toggleMember(["a", "c"], "b", all), ["a", "b", "c"]);
  assert.deepEqual(toggleMember(["a"], "a", all), ["a"]);
});

test("filter chip label", () => {
  const names = { a: "Sam", b: "Alex", c: "Jo" };
  const all = ["a", "b", "c"];
  assert.equal(filterLabel(all, all, names, "3m"), "Everyone · 3 months");
  assert.equal(filterLabel(["b"], all, names, "all"), "Alex · All");
  assert.equal(filterLabel(["a", "c"], all, names, "4w"), "2 people · 4 weeks");
  assert.equal(filterLabel(["a"], ["a"], names, "12m"), "Sam · 12 months");
});

test("axis: nice tops, domain from the period, y starts at zero", () => {
  assert.equal(niceTop(0), 100);
  assert.equal(niceTop(870), 1000);
  assert.equal(niceTop(1100), 2000);
  assert.equal(niceTop(250), 400);
  assert.equal(niceTop(500), 500);
  const series = buildSeries([row(1, "a", "2026-10-01", 870)], ["a"], "2026-07-24");
  const d = chartDomain(series, "2026-07-24", TODAY);
  assert.equal(domainDate(d.minDay), "2026-07-24");
  assert.equal(domainDate(d.maxDay), TODAY);
  assert.deepEqual(d.ticks, [0, 500, 1000]);
  assert.ok(xFraction("2026-10-01", d) > 0 && xFraction("2026-10-01", d) < 1);
  assert.equal(xFraction("2020-01-01", d), 0);
});

test("All uses the first to the last pay; one pay does not divide by zero", () => {
  const one = buildSeries([row(1, "a", "2026-10-01", 100)], ["a"], null);
  const d = chartDomain(one, null, TODAY);
  assert.ok(d.maxDay > d.minDay);
  assert.ok(Number.isFinite(xFraction("2026-10-01", d)));
  const none = chartDomain(buildSeries([], ["a"], null), null, TODAY);
  assert.ok(none.maxDay > none.minDay);
  assert.equal(none.yTop, 100);
});

test("labels and colours", () => {
  assert.equal(axisLabel(0), "$0");
  assert.equal(axisLabel(250), "$250");
  assert.equal(axisLabel(1500), "$1.5k");
  assert.equal(axisLabel(2000), "$2k");
  assert.equal(shortDate("2026-10-04"), "4 Oct");
  assert.equal(seriesColour(0), SERIES_COLOURS[0]);
  assert.equal(seriesColour(SERIES_COLOURS.length), SERIES_COLOURS[0]);
  assert.equal(seriesColour(-1), SERIES_COLOURS[SERIES_COLOURS.length - 1]);
});

test("isChartable: confirmed with an amount above 0 only (F01)", () => {
  assert.equal(isChartable(row(1, "a", "2026-10-01", 100)), true);
  assert.equal(isChartable(row(2, "a", "2026-10-01", 0)), false);
  assert.equal(isChartable(row(3, "a", "2026-10-01", null)), false);
  assert.equal(isChartable(row(4, "a", "2026-10-01", 100, { status: "pending" })), false);
});

test("a legacy $0 row is not plotted and does not count in totals", () => {
  const rows = [row(1, "a", "2026-10-01", 300), row(2, "a", "2026-10-08", 0), row(3, "a", "2026-10-15", 100)];
  const [s] = buildSeries(rows, ["a"], null);
  assert.equal(s.points.length, 2);
  assert.equal(s.total, 400);
  assert.equal(s.average, 200);
  assert.equal(householdTotal(rows, null), 400);
});
