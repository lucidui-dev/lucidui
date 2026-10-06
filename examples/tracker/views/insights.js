import { signal, computed, h } from "/lucid/index.js";
import { Segmented, Select, Card } from "/lucid/ui/index.js";
import { StatTile, ChartCard, DotDumbbell, Waffle, DotColumns, UnitRows, DotCalendar } from "/lucid/viz/index.js";
import { issues, NOW, DAY } from "../store.js";
import { PEOPLE } from "../data.js";
import { PersonAvatar, teamOptions } from "../parts.js";

const weekLabel = new Intl.DateTimeFormat("en", { month: "short", day: "numeric" });

const median = list => {
  if (!list.length) return null;
  const sorted = [...list].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
};

const pct = (now, before) => (before ? ((now - before) / before) * 100 : null);

export function InsightsView() {
  const weeks = signal(12);
  const team = signal("all");
  const end = NOW + DAY;

  const scoped = computed(() => issues.value.filter(issue => team.value === "all" || issue.team === team.value));

  const stats = computed(() => {
    const list = scoped.value;
    const R = weeks.value;
    const start = end - R * 7 * DAY;
    const prevStart = start - R * 7 * DAY;
    const within = (at, from, to) => at != null && at >= from && at < to;
    const done = issue => issue.status === "done";

    const buckets = Array.from({ length: R }, (_, k) => {
      const from = start + k * 7 * DAY;
      const to = from + 7 * DAY;
      const completed = list.filter(issue => done(issue) && within(issue.completedAt, from, to));
      return {
        label: weekLabel.format(from),
        created: list.filter(issue => within(issue.createdAt, from, to)).length,
        bugs: list.filter(issue => issue.labels.includes("bug") && within(issue.createdAt, from, to)).length,
        completed: completed.length,
        open: list.filter(issue => issue.createdAt < to && !(issue.completedAt != null && issue.completedAt < to)).length,
        cycle: median(completed.map(issue => (issue.completedAt - (issue.startedAt ?? issue.createdAt)) / DAY)) ?? 0
      };
    });

    const completedNow = list.filter(issue => done(issue) && within(issue.completedAt, start, end));
    const completedPrev = list.filter(issue => done(issue) && within(issue.completedAt, prevStart, start));
    const cycles = completedNow.map(issue => (issue.completedAt - (issue.startedAt ?? issue.createdAt)) / DAY);
    const cyclesPrev = completedPrev.map(issue => (issue.completedAt - (issue.startedAt ?? issue.createdAt)) / DAY);
    const createdNow = list.filter(issue => within(issue.createdAt, start, end)).length;
    const createdPrev = list.filter(issue => within(issue.createdAt, prevStart, start)).length;
    const bugsNow = list.filter(issue => issue.labels.includes("bug") && within(issue.createdAt, start, end)).length;
    const bugsPrev = list.filter(issue => issue.labels.includes("bug") && within(issue.createdAt, prevStart, start)).length;
    const open = list.filter(issue => !["done", "canceled"].includes(issue.status));
    const openAtStart = list.filter(issue => issue.createdAt < start && !(issue.completedAt != null && issue.completedAt < start)).length;
    const hasPrev = prevStart >= NOW - 26 * 7 * DAY - DAY;

    const cycleBuckets = [
      ["Under 1d", 0, 1], ["1–2d", 1, 2], ["2–4d", 2, 4], ["4–7d", 4, 7], ["1–2w", 7, 14], ["2w+", 14, Infinity]
    ].map(([label, lo, hi]) => ({ label, value: cycles.filter(c => c >= lo && c < hi).length }));

    const activity = new Map();
    const days = R * 7;
    const dayStart = end - days * DAY;
    const bump = at => {
      if (at == null || at < dayStart || at >= end) return;
      const key = Math.floor((at - dayStart) / DAY);
      activity.set(key, (activity.get(key) ?? 0) + 1);
    };
    for (const issue of list) {
      bump(issue.createdAt);
      bump(issue.startedAt);
      bump(issue.completedAt);
      for (const c of issue.comments) bump(c.at);
    }

    return {
      buckets,
      completed: completedNow.length,
      completedDelta: hasPrev ? pct(completedNow.length, completedPrev.length) : null,
      created: createdNow,
      createdDelta: hasPrev ? pct(createdNow, createdPrev) : null,
      bugs: bugsNow,
      bugsDelta: hasPrev ? pct(bugsNow, bugsPrev) : null,
      cycle: median(cycles),
      cycleDelta: hasPrev ? pct(median(cycles) ?? 0, median(cyclesPrev) ?? 0) : null,
      open: open.length,
      openDelta: openAtStart >= 8 ? pct(open.length, openAtStart) : null,
      status: ["backlog", "todo", "in_progress", "in_review"].map(id => ({ id, value: open.filter(issue => issue.status === id).length })),
      cycleBuckets,
      workload: PEOPLE
        .filter(person => team.value === "all" || person.teams.includes(team.value))
        .map(person => {
          const mine = open.filter(issue => issue.assignee === person.id);
          const counts = {};
          for (const issue of mine) counts[issue.status] = (counts[issue.status] ?? 0) + 1;
          return { id: person.id, label: person.name, counts, total: mine.length };
        })
        .filter(row => row.total > 0)
        .sort((a, b) => b.total - a.total),
      days: Array.from({ length: days }, (_, i) => ({ date: dayStart + i * DAY, value: activity.get(i) ?? 0 }))
    };
  });

  const rangeLabel = computed(() => `last ${weeks.value} weeks`);
  const vsLabel = computed(() => `vs prior ${weeks.value} wks`);

  const STATUS_SEGMENTS = [
    { key: "in_progress", label: "In progress", color: "var(--lucid-series-4)" },
    { key: "in_review", label: "In review", color: "var(--lucid-series-3)" },
    { key: "todo", label: "Todo", color: "var(--lucid-ink-3)" },
    { key: "backlog", label: "Backlog", color: "var(--lucid-ink-3)", hollow: true }
  ];

  const tile = (props) => Card({ padding: "md" }, StatTile(props));

  return h("div", { class: "tk-scroll" },
    h("div", { class: "tk-insights" },
      h("div", { class: "tk-hero" },
        h("div",
          h("div", { class: "tk-hero-eyebrow" }, "Completed, ", rangeLabel),
          h("div", { class: "tk-hero-figure" }, () => stats.value.completed, h("small", "issues shipped"))),
        h("div", { class: "lucid-row", style: { "--gap": "8px" } },
          Select({
            value: team,
            options: [{ value: "all", label: "All teams", icon: "layers" }, ...teamOptions],
            size: "sm",
            aria: { label: "Team" }
          }),
          Segmented({
            value: weeks,
            size: "sm",
            aria: { label: "Date range" },
            options: [{ value: 4, label: "4 weeks" }, { value: 12, label: "12 weeks" }, { value: 26, label: "26 weeks" }]
          }))),
      h("div", { class: "tk-span-3" }, tile({
        label: "Open issues", value: () => stats.value.open, delta: () => stats.value.openDelta, deltaLabel: "since start",
        upIsGood: false, trend: () => stats.value.buckets.map(b => b.open)
      })),
      h("div", { class: "tk-span-3" }, tile({
        label: "Created", value: () => stats.value.created, delta: () => stats.value.createdDelta, deltaLabel: vsLabel,
        upIsGood: null, trend: () => stats.value.buckets.map(b => b.created)
      })),
      h("div", { class: "tk-span-3" }, tile({
        label: "Median cycle time", value: () => stats.value.cycle ?? 0, unit: "days", format: v => v.toFixed(1),
        delta: () => stats.value.cycleDelta, deltaLabel: vsLabel, upIsGood: false,
        trend: () => stats.value.buckets.map(b => b.cycle)
      })),
      h("div", { class: "tk-span-3" }, tile({
        label: "Bugs opened", value: () => stats.value.bugs, delta: () => stats.value.bugsDelta, deltaLabel: vsLabel,
        upIsGood: false, trend: () => stats.value.buckets.map(b => b.bugs)
      })),
      h("div", { class: "tk-span-8" }, ChartCard({
        title: "Created vs completed",
        subtitle: "Issues per week. The stem is the gap between new and finished work.",
        table: () => ({ columns: ["Week of", "Created", "Completed", "Net"], rows: stats.peek().buckets.map(b => [b.label, b.created, b.completed, b.created - b.completed]) })
      }, DotDumbbell({
        labels: () => stats.value.buckets.map(b => b.label),
        series: () => [
          { name: "Created", color: "var(--lucid-series-2)", values: stats.value.buckets.map(b => b.created) },
          { name: "Completed", color: "var(--lucid-series-1)", values: stats.value.buckets.map(b => b.completed) }
        ],
        height: 230,
        label: "Issues created and completed per week"
      }))),
      h("div", { class: "tk-span-4" }, ChartCard({
        title: "Open work",
        subtitle: "Every open issue by status, one dot per 1%.",
        table: () => ({ columns: ["Status", "Issues"], rows: STATUS_SEGMENTS.map(s => [s.label, stats.peek().status.find(x => x.id === s.key).value]) })
      }, Waffle({
        columns: 20,
        rows: 5,
        segments: () => STATUS_SEGMENTS.map(s => ({ ...s, value: stats.value.status.find(x => x.id === s.key).value })),
        label: "Open issues by status"
      }))),
      h("div", { class: "tk-span-5" }, ChartCard({
        title: "Cycle time",
        subtitle: "From start to done, for issues completed in range.",
        table: () => ({ columns: ["Cycle time", "Issues"], rows: stats.peek().cycleBuckets.map(b => [b.label, b.value]) })
      }, DotColumns({ data: () => stats.value.cycleBuckets, height: 210, unit: "issues", label: "Cycle time distribution" }))),
      h("div", { class: "tk-span-7" }, ChartCard({
        title: "Workload",
        subtitle: "Open issues per person, one dot each.",
        table: () => ({ columns: ["Person", "In progress", "In review", "Todo", "Backlog"], rows: stats.peek().workload.map(r => [r.label, r.counts.in_progress ?? 0, r.counts.in_review ?? 0, r.counts.todo ?? 0, r.counts.backlog ?? 0]) })
      }, UnitRows({
        rows: () => stats.value.workload.map(r => ({ ...r, avatar: PersonAvatar(r.id, 20) })),
        segments: STATUS_SEGMENTS,
        label: "Open issues per person"
      }))),
      h("div", { class: "tk-span-12" }, ChartCard({
        title: "Activity",
        subtitle: "Issues opened, started, finished and discussed each day.",
        table: () => ({ columns: ["Day", "Events"], rows: stats.peek().days.filter(d => d.value).map(d => [weekLabel.format(d.date), d.value]) })
      }, DotCalendar({ days: () => stats.value.days, unit: "events", label: "Daily activity" })))));
}
