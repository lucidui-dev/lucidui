import { signal, computed, effect, h, mount } from "/lucid/index.js";
import { Button, Segmented, Tooltip, Icon } from "/lucid/ui/index.js";
import { DotSparkline, UnitRows, Waffle, ChartCard, DotMeter } from "/lucid/viz/index.js";
import { ExitDock } from "/exit.js";
import { RACE, CANDIDATES, CANDIDATE, WEEKS, POLLS, POLLSTERS, COUNTIES, COUNTY, GRID, CELLS, CENTROIDS, FUNDS, PRIORITIES, TRAIL, HEADLINES } from "./data.js";

const stored = key => { try { return localStorage.getItem(`lucid-campaign:${key}`); } catch { return null; } };
const theme = signal(stored("theme") ?? "dark");
effect(() => {
  try { localStorage.setItem("lucid-campaign:theme", theme.value); } catch {}
  if (theme.value === "system") delete document.documentElement.dataset.theme;
  else document.documentElement.dataset.theme = theme.value;
});

const focus = signal(null);
const swing = signal(0);
const hoveredCounty = signal(null);
const selectedCounty = signal(null);

const last = id => POLLS[id][POLLS[id].length - 1];
const fourWeeks = id => POLLS[id][POLLS[id].length - 5];
const days = Math.round((RACE.election - RACE.today) / 86400000);
const margin = computed(() => last("okafor") - last("whitfield") + swing.value);
const leader = computed(() => (margin.value >= 0 ? CANDIDATE.okafor : CANDIDATE.whitfield));
const chances = computed(() => {
  const sorensen = 1;
  const okafor = Math.round((1 / (1 + Math.exp(-margin.value / 2.1))) * (100 - sorensen));
  return { okafor, whitfield: 100 - sorensen - okafor, sorensen };
});
const countyMargin = id => COUNTY[id].lean + margin.value - 1.4;
const rating = m => (Math.abs(m) < 2.5 ? "Toss-up" : Math.abs(m) < 7 ? `Lean ${m > 0 ? "Okafor" : "Whitfield"}` : `Likely ${m > 0 ? "Okafor" : "Whitfield"}`);
const pct = v => `${v.toFixed(1)}%`;
const signed = v => `${v > 0 ? "+" : v < 0 ? "−" : "±"}${Math.abs(v).toFixed(1)}`;
const short = d => d.toLocaleDateString("en-US", { month: "short", day: "numeric" });

const headline = computed(() => {
  const m = Math.abs(margin.value);
  const who = leader.value.last;
  if (m < 1.5) return `Okafor and Whitfield are neck and neck with ${days} days to go`;
  if (m < 4) return `${who} holds a narrow lead with ${days} days to go`;
  return `${who} pulls ahead with ${days} days to go`;
});

function Logo() {
  return h("a", { class: "cr-logo", href: "#top", aria: { label: "Crest News, Race Center" } },
    h("span", { class: "cr-logo-mark" }, "CREST"),
    h("span", { class: "cr-logo-word" }, "NEWS"));
}

const SECTIONS = [
  { value: "overview", label: "Overview" },
  { value: "polls", label: "Polls" },
  { value: "map", label: "County map" },
  { value: "money", label: "Money" },
  { value: "trail", label: "Trail" },
  { value: "results", label: "Election night", fresh: true }
];
const section = signal(stored("section") ?? "overview");
effect(() => { try { localStorage.setItem("lucid-campaign:section", section.value); } catch {} });
const open = value => {
  section.value = value;
  document.querySelector(".cr-main")?.scrollTo({ top: 0 });
};

function Nameplate() {
  return h("header", { class: "cr-plate" },
    h("div", { class: "cr-plate-top" },
      Logo(),
      h("div", { class: "cr-plate-tag" }, h("i"), "Race Center"),
      h("span", { class: "cr-plate-race" }, `${RACE.state} ${RACE.office} · ${RACE.year}`),
      h("span", { class: "lucid-spacer" }),
      Segmented({
        value: theme, size: "sm", iconOnly: true, aria: { label: "Theme" },
        options: [{ value: "light", label: "Paper", icon: "sun" }, { value: "dark", label: "Studio", icon: "moon" }, { value: "system", label: "System", icon: "monitor" }]
      })),
    h("nav", { class: "cr-tabs", aria: { label: "Sections" } }, SECTIONS.map(s => h("button", {
      type: "button",
      class: "cr-tab",
      "aria-current": () => (section.value === s.value ? "page" : undefined),
      onClick: () => open(s.value)
    }, s.label, s.fresh ? h("span", { class: "cr-tab-new" }, "Live") : null))));
}

function SectionHead({ eyebrow, title, text }) {
  return h("div", { class: "cr-section-head" },
    h("div", { class: "cr-eyebrow" }, eyebrow),
    h("h2", title),
    text ? h("p", { class: "cr-muted" }, text) : null);
}

function Masthead() {
  return h("header", { class: "cr-mast", id: "top" },
    h("div", { class: "cr-mast-copy" },
      h("div", { class: "cr-kicker" }, h("span", { class: "cr-live" }, h("i"), "Live"), `${RACE.state} ${RACE.office} ${RACE.year}`),
      h("h1", { class: "cr-headline" }, headline),
      h("p", { class: "cr-dek" }, "Polling average, forecast and county-by-county picture, updated as new polls land. Updated ", short(RACE.today), ", 7:42 AM.")),
    h("div", { class: "cr-count" },
      h("div", { class: "cr-count-num" }, String(days)),
      h("div", { class: "cr-count-label" }, h("b", "Days to go"), h("span", RACE.election.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })))));
}

function Ticker() {
  const items = [...HEADLINES, ...HEADLINES];
  return h("section", { class: "cr-ticker", aria: { label: "Latest headlines" } },
    h("span", { class: "cr-ticker-tag" }, "Latest"),
    h("div", { class: "cr-ticker-track" },
      h("ul", { class: "cr-ticker-list" }, items.map((text, i) => h("li", { "aria-hidden": i >= HEADLINES.length ? "true" : undefined }, h("i"), text)))));
}

function CandidateCard(c) {
  const now = last(c.id);
  const change = now - fourWeeks(c.id);
  return h("button", {
    type: "button",
    class: "cr-cand",
    style: { "--c": c.color, "--soft": c.soft },
    "aria-pressed": () => focus.value === c.id,
    "data-dim": () => Boolean(focus.value && focus.value !== c.id),
    onClick: () => { focus.value = focus.peek() === c.id ? null : c.id; }
  },
  h("div", { class: "cr-cand-top" },
    h("span", { class: "cr-avatar" }, c.name.split(" ").map(p => p[0]).join("")),
    h("span", { class: "cr-cand-who" },
      h("b", c.name),
      h("span", h("em", c.party), ` · ${c.role}`)),
    () => (leader.value.id === c.id ? h("span", { class: "cr-lead-pill" }, "Leads") : null)),
  h("div", { class: "cr-cand-num" },
    h("span", { class: "cr-big" }, now.toFixed(1), h("small", "%")),
    h("span", { class: "cr-change", "data-up": change >= 0 }, Icon({ name: change >= 0 ? "trending-up" : "trending-down", size: 13 }), `${signed(change)} in 4 wks`)),
  h("div", { class: "cr-cand-spark" }, DotSparkline({ data: POLLS[c.id].slice(-12), height: 30, color: c.color, label: `${c.name} polling, last 12 weeks` })));
}

function PollChart() {
  const W = 720;
  const H = 280;
  const pad = { l: 36, r: 64, t: 16, b: 30 };
  const x = i => pad.l + (i / (WEEKS.length - 1)) * (W - pad.l - pad.r);
  const y = v => pad.t + (1 - v / 52) * (H - pad.t - pad.b);
  const hover = signal(null);
  const grid = [0, 10, 20, 30, 40, 50].map(v => h("g", { class: "cr-grid" },
    h("line", { x1: pad.l, x2: W - pad.r, y1: y(v), y2: y(v) }),
    h("text", { x: pad.l - 8, y: y(v) + 4, "text-anchor": "end" }, `${v}%`)));
  const months = WEEKS.map((d, i) => (i % 4 === 0 ? h("text", { class: "cr-axis", x: x(i), y: H - 8, "text-anchor": "middle" }, short(d)) : null));
  const series = CANDIDATES.map(c => h("g", {
    class: "cr-series",
    "data-dim": () => Boolean(focus.value && focus.value !== c.id),
    style: { "--c": c.color }
  },
  h("path", { class: "cr-trace", d: POLLS[c.id].map((v, i) => `${i ? "L" : "M"}${x(i)} ${y(v)}`).join(" ") }),
  POLLS[c.id].map((v, i) => h("circle", { class: "cr-dot", cx: x(i), cy: y(v), r: i === POLLS[c.id].length - 1 ? 5.5 : 3.2, style: { "--i": i } })),
  h("text", { class: "cr-end", x: W - pad.r + 12, y: y(last(c.id)) + 4 }, `${last(c.id).toFixed(1)}`)));
  const hits = WEEKS.map((d, i) => h("rect", {
    class: "cr-hit", x: x(i) - (W - pad.l - pad.r) / (WEEKS.length - 1) / 2, y: pad.t, width: (W - pad.l - pad.r) / (WEEKS.length - 1), height: H - pad.t - pad.b,
    onPointerenter: () => { hover.value = i; }
  }));
  return h("div", { class: "cr-poll", onPointerleave: () => { hover.value = null; } },
    h("svg", { viewBox: `0 0 ${W} ${H}`, class: "cr-poll-svg", role: "img", aria: { label: `Polling average over 24 weeks. Okafor ${pct(last("okafor"))}, Whitfield ${pct(last("whitfield"))}, Sorensen ${pct(last("sorensen"))}.` } },
      grid, months,
      () => (hover.value == null ? null : h("line", { class: "cr-guide", x1: x(hover.value), x2: x(hover.value), y1: pad.t, y2: H - pad.b })),
      series, hits),
    () => {
      const i = hover.value;
      if (i == null) return null;
      return h("div", { class: "cr-poll-tip", style: { left: `${(x(i) / W) * 100}%` }, "data-flip": i > 15 },
        h("b", `Week of ${short(WEEKS[i])}`),
        CANDIDATES.map(c => h("div", { style: { "--c": c.color } }, h("i"), c.last, h("span", pct(POLLS[c.id][i])))));
    });
}

function Forecast() {
  const label = computed(() => {
    const s = swing.value;
    return s === 0 ? "Polls as they stand" : `${s > 0 ? "Okafor" : "Whitfield"} gains ${Math.abs(s).toFixed(1)} points`;
  });
  return h("section", { class: "cr-card cr-forecast" },
    h("header", { class: "cr-card-head" },
      h("div", h("div", { class: "cr-eyebrow" }, "Forecast"), h("h2", "Who wins in 100 simulated elections"))),
    h("div", { class: "cr-odds" }, CANDIDATES.map(c => h("div", { class: "cr-odds-item", style: { "--c": c.color } },
      h("span", { class: "cr-odds-num" }, () => chances.value[c.id]),
      h("span", { class: "cr-odds-name" }, h("i"), c.last)))),
    Waffle({
      columns: 20, rows: 5,
      segments: () => CANDIDATES.map(c => ({ label: `${c.last} wins`, value: chances.value[c.id], color: c.color })),
      label: "Wins out of 100 simulated elections"
    }),
    h("div", { class: "cr-swing" },
      h("div", { class: "cr-swing-head" },
        h("label", { for: "cr-swing" }, "What if the race moves?"),
        h("b", label)),
      h("input", {
        id: "cr-swing", type: "range", min: -6, max: 6, step: 0.5, class: "cr-range",
        value: () => swing.value,
        style: { "--p": () => `${((swing.value + 6) / 12) * 100}%` },
        aria: { valuetext: label },
        onInput: e => { swing.value = Number(e.target.value); }
      }),
      h("div", { class: "cr-swing-ends" },
        h("span", { style: { color: CANDIDATE.whitfield.color } }, "Whitfield +6"),
        Button({ size: "xs", variant: "ghost", onClick: () => { swing.value = 0; }, disabled: () => swing.value === 0 }, "Reset"),
        h("span", { style: { color: CANDIDATE.okafor.color } }, "Okafor +6"))));
}

function CountyMap() {
  const S = 14;
  const active = computed(() => selectedCounty.value ?? hoveredCounty.value);
  const groups = COUNTIES.map(county => {
    const own = CELLS.filter(cell => cell.county === county.id);
    const m = () => countyMargin(county.id);
    const fill = () => {
      const v = m();
      const strength = Math.min(1, Math.abs(v) / 14);
      const color = v >= 0 ? CANDIDATE.okafor.color : CANDIDATE.whitfield.color;
      return `color-mix(in oklab, ${color} ${Math.round(28 + strength * 72)}%, var(--cr-neutral))`;
    };
    return h("g", {
      class: "cr-county",
      role: "button",
      tabindex: 0,
      "data-tossup": () => Math.abs(m()) < 2.5,
      "data-active": () => active.value === county.id,
      "data-dim": () => Boolean(active.value && active.value !== county.id),
      style: { "--fill": fill },
      aria: { label: () => `${county.name} County, ${rating(m())}, ${county.voters} thousand voters` },
      onPointerenter: () => { hoveredCounty.value = county.id; },
      onPointerleave: () => { if (hoveredCounty.peek() === county.id) hoveredCounty.value = null; },
      onFocus: () => { hoveredCounty.value = county.id; },
      onBlur: () => { if (hoveredCounty.peek() === county.id) hoveredCounty.value = null; },
      onClick: () => { selectedCounty.value = selectedCounty.peek() === county.id ? null : county.id; },
      onKeydown: e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); selectedCounty.value = selectedCounty.peek() === county.id ? null : county.id; } }
    },
    own.map(cell => h("circle", { cx: cell.c * S + S / 2, cy: cell.r * S + S / 2, r: 4.7, style: { "--d": `${(cell.c + cell.r) * 14}ms` } })),
    h("text", { class: "cr-county-label", x: CENTROIDS[county.id].c * S + S / 2, y: CENTROIDS[county.id].r * S + S / 2 + 4 }, county.name.toUpperCase()));
  });
  return h("svg", { class: "cr-map-svg", viewBox: `0 0 ${GRID.cols * S} ${GRID.rows * S}`, role: "group", aria: { label: "Westmere county map, coloured by projected margin" } }, groups);
}

function CountyPanel() {
  return () => {
    const id = selectedCounty.value ?? hoveredCounty.value;
    if (!id) {
      const tossups = COUNTIES.filter(c => Math.abs(countyMargin(c.id)) < 2.5);
      return h("div", { class: "cr-county-panel" },
        h("div", { class: "cr-eyebrow" }, "Statewide"),
        h("h3", "Where it will be decided"),
        h("p", { class: "cr-muted" }, `${tossups.length} of ${COUNTIES.length} counties are toss-ups at the current margin. Hover or tap a county.`),
        h("div", { class: "cr-chips" }, tossups.map(c => h("button", { type: "button", class: "cr-chip", onClick: () => { selectedCounty.value = c.id; } }, c.name, h("span", signed(countyMargin(c.id)))))));
    }
    const county = COUNTY[id];
    const m = countyMargin(id);
    const share = 50 + m / 2;
    const visits = TRAIL.filter(t => t.place === county.name);
    return h("div", { class: "cr-county-panel" },
      h("div", { class: "cr-eyebrow" }, `${county.name} County`),
      h("h3", rating(m)),
      h("p", { class: "cr-muted" }, `Seat: ${county.seat} · ${county.voters}k registered voters`),
      h("div", { class: "cr-bar", style: { "--o": `${share}%` } },
        h("span", { class: "cr-bar-o" }, `Okafor ${share.toFixed(1)}`),
        h("span", { class: "cr-bar-w" }, `Whitfield ${(100 - share).toFixed(1)}`)),
      h("dl", { class: "cr-facts" },
        h("div", h("dt", "Projected margin"), h("dd", `${m >= 0 ? "Okafor" : "Whitfield"} ${signed(Math.abs(m))}`)),
        h("div", h("dt", "2024 result"), h("dd", `${county.lean >= 0 ? "Harbor" : "Summit"} +${Math.abs(county.lean)}`)),
        h("div", h("dt", "Campaign stops"), h("dd", visits.length ? visits.map(v => CANDIDATE[v.who]?.last ?? "Debate").join(", ") : "None yet"))),
      selectedCounty.value ? Button({ size: "sm", variant: "ghost", icon: "x", onClick: () => { selectedCounty.value = null; } }, "Clear selection") : null);
  };
}

function PollBoard() {
  const at = v => `${(v / 50) * 100}%`;
  return h("section", { class: "cr-card cr-board" },
    h("div", { class: "cr-board-scale", "aria-hidden": "true" },
      h("span"), h("span"), h("span"),
      h("div", [0, 10, 20, 30, 40, 50].map(v => h("i", { style: { left: at(v) } }, `${v}%`)))),
    h("ul", { class: "cr-board-list" }, POLLSTERS.map((p, i) => {
      const lead = p.okafor - p.whitfield;
      const ahead = lead >= 0 ? CANDIDATE.okafor : CANDIDATE.whitfield;
      return h("li", { class: "cr-board-row", style: { "--i": i } },
        h("div", { class: "cr-board-who" }, h("b", p.name), h("span", h("em", p.grade), ` · n=${p.size.toLocaleString("en-US")}`)),
        h("div", { class: "cr-board-track", role: "img", aria: { label: `${p.name}: Okafor ${p.okafor}%, Whitfield ${p.whitfield}%, Sorensen ${p.sorensen}%` } },
          h("i", { class: "cr-board-gap", style: { left: at(Math.min(p.okafor, p.whitfield)), width: `${(Math.abs(lead) / 50) * 100}%`, "--c": ahead.color } }),
          CANDIDATES.map(c => h("span", {
            class: "cr-board-dot",
            "data-dim": () => Boolean(focus.value && focus.value !== c.id),
            style: { left: at(p[c.id]), "--c": c.color }
          }, h("small", `${p[c.id]}`)))),
        h("div", { class: "cr-board-lead", style: { "--c": ahead.color } }, lead === 0 ? "Tied" : `${ahead.last} +${Math.abs(lead)}`));
    })));
}

function Money() {
  const rows = FUNDS.map(f => ({ id: f.id, label: CANDIDATE[f.id].last, counts: { small: f.small, large: f.large, pac: f.pac } }));
  return h("section", { class: "cr-section", id: "money" },
    h("div", { class: "cr-section-head" }, h("div", { class: "cr-eyebrow" }, "Money"), h("h2", "Who's paying for the race")),
    h("div", { class: "cr-money" },
      ChartCard({
        title: "Raised to date",
        subtitle: "One dot = $1 million",
        table: () => ({ columns: ["Candidate", "Small donors", "Large donors", "PACs"], rows: FUNDS.map(f => [CANDIDATE[f.id].last, `$${f.small}M`, `$${f.large}M`, `$${f.pac}M`]) })
      }, UnitRows({
        rows,
        segments: [
          { key: "small", label: "Small donors", color: "#ffd400" },
          { key: "large", label: "Large donors", color: "#ff8f3f" },
          { key: "pac", label: "PACs", color: "#8a8a93", hollow: true }
        ],
        label: "Money raised by source"
      })),
      h("div", { class: "cr-cash" }, FUNDS.map(f => h("div", { class: "cr-cash-item", style: { "--c": CANDIDATE[f.id].color } },
        h("span", { class: "cr-cash-who" }, h("i"), CANDIDATE[f.id].last),
        h("b", `$${f.cash.toFixed(1)}M`),
        h("small", `cash on hand · $${f.spent.toFixed(1)}M spent`)))),
      ChartCard({
        title: "What voters say matters most",
        subtitle: "Share of likely voters, Westmere Ledger",
        table: () => ({ columns: ["Issue", "Share"], rows: PRIORITIES.map(p => [p.label, `${p.value}%`]) })
      }, Waffle({ columns: 20, rows: 5, segments: PRIORITIES, label: "Top issue for likely voters" }))));
}

function Trail() {
  return h("section", { class: "cr-section", id: "trail" },
    h("div", { class: "cr-section-head" }, h("div", { class: "cr-eyebrow" }, "On the trail"), h("h2", "Where the candidates are this fortnight")),
    h("ol", { class: "cr-trail" }, TRAIL.map(t => {
      const c = CANDIDATE[t.who];
      return h("li", { class: "cr-stop", "data-all": !c, style: { "--c": c?.color ?? "var(--cr-yellow)" } },
        h("div", { class: "cr-date" }, h("b", String(t.day)), h("span", t.month)),
        h("div", { class: "cr-stop-body" },
          h("div", { class: "cr-stop-meta" }, h("span", { class: "cr-kind" }, t.kind), `${t.place} County · ${t.time}`),
          h("b", t.title),
          h("span", { class: "cr-muted" }, c ? `${c.name}, ${c.party}` : "All three candidates")),
        Tooltip({ label: "Show on map" }, Button({ size: "sm", variant: "ghost", icon: "target", aria: { label: `Show ${t.place} County on the map` }, onClick: () => {
          const county = COUNTIES.find(k => k.name === t.place);
          selectedCounty.value = county.id;
          document.getElementById("map").scrollIntoView({ behavior: "smooth", block: "start" });
        } })));
    })));
}

const count = signal(0);
const running = signal(false);
const speed = signal("2");
let tick = 0;
const COUNT_ORDER = Object.fromEntries(COUNTIES.map((c, i) => [c.id, ((i * 7) % COUNTIES.length) / COUNTIES.length * 0.55]));
const reported = id => Math.max(0, Math.min(1, (count.value - COUNT_ORDER[id]) / 0.45));
const tally = computed(() => {
  let ok = 0;
  let wh = 0;
  let so = 0;
  const rows = COUNTIES.map(c => {
    const share = reported(c.id);
    const m = countyMargin(c.id) + Math.sin(c.voters) * 1.8;
    const votes = c.voters * 1000 * 0.62 * share;
    const okShare = 0.485 + m / 200;
    const soShare = 0.04;
    const o = votes * okShare;
    const s = votes * soShare;
    const w = votes - o - s;
    ok += o;
    wh += w;
    so += s;
    return { ...c, share, o, w, m: votes ? ((o - w) / votes) * 100 : 0 };
  });
  const total = ok + wh + so;
  const expected = COUNTIES.reduce((n, c) => n + c.voters * 1000 * 0.62, 0);
  return { rows, ok, wh, so, total, counted: total / expected };
});
const called = computed(() => {
  const t = tally.value;
  if (t.counted < 0.55 || !t.total) return null;
  const lead = (t.ok - t.wh) / t.total * 100;
  return Math.abs(lead) > 2.4 ? (lead > 0 ? CANDIDATE.okafor : CANDIDATE.whitfield) : null;
});
const votes = n => Math.round(n).toLocaleString("en-US");
const toggleCount = () => {
  if (running.peek()) { running.value = false; clearInterval(tick); return; }
  if (count.peek() >= 1) count.value = 0;
  running.value = true;
  tick = setInterval(() => {
    count.value = Math.min(1, count.peek() + 0.004 * Number(speed.peek()));
    if (count.peek() >= 1) { running.value = false; clearInterval(tick); }
  }, 80);
};

function Results() {
  const share = (who, n) => () => (tally.value.total ? `${((n() / tally.value.total) * 100).toFixed(1)}%` : "0.0%");
  return h("div", { class: "cr-page" },
    SectionHead({ eyebrow: "Election night", title: "Watch the count come in", text: "A simulation of results night: counties report in waves, and the desk calls the race once the lead is safe." }),
    h("section", { class: "cr-card cr-night" },
      h("div", { class: "cr-night-bar" },
        () => (running.value
          ? Button({ variant: "primary", icon: "clock", onClick: toggleCount }, "Pause the count")
          : Button({ variant: "primary", icon: "zap", onClick: toggleCount }, count.peek() >= 1 ? "Count again" : count.peek() > 0 ? "Resume the count" : "Start the count")),
        Segmented({ value: speed, size: "sm", aria: { label: "Speed" }, options: [{ value: "1", label: "1×" }, { value: "2", label: "2×" }, { value: "5", label: "5×" }] }),
        h("span", { class: "lucid-spacer" }),
        h("div", { class: "cr-night-counted" }, h("b", () => `${Math.round(tally.value.counted * 100)}%`), " of the expected vote counted")),
      () => (called.value
        ? h("div", { class: "cr-call", style: { "--c": called.value.color } }, h("span", { class: "cr-call-tag" }, "Crest projects"), h("b", `${called.value.name} wins the ${RACE.state} governor's race`))
        : h("div", { class: "cr-call cr-call-wait" }, h("span", { class: "cr-call-tag" }, "Too early to call"), h("b", () => (count.value ? "The desk is watching the margin" : "Polls have closed. Start the count.")))),
      h("div", { class: "cr-night-totals" }, [["okafor", () => tally.value.ok], ["whitfield", () => tally.value.wh], ["sorensen", () => tally.value.so]].map(([id, n]) => {
        const c = CANDIDATE[id];
        return h("div", { class: "cr-night-total", style: { "--c": c.color } },
          h("span", { class: "cr-night-who" }, h("i"), c.name, () => (called.value?.id === id ? h("span", { class: "cr-check" }, Icon({ name: "check", size: 12 })) : null)),
          h("span", { class: "cr-big" }, share(id, n)),
          h("span", { class: "cr-muted" }, () => `${votes(n())} votes`));
      })),
      h("div", { class: "cr-night-strip", "aria-hidden": "true" }, () => {
        const t = tally.value;
        const dots = 100;
        const ok = t.total ? Math.round((t.ok / t.total) * dots) : 0;
        const so = t.total ? Math.round((t.so / t.total) * dots) : 0;
        return Array.from({ length: dots }, (_, i) => h("i", { style: { "--c": !t.total ? "var(--cr-neutral)" : i < ok ? CANDIDATE.okafor.color : i >= dots - so ? CANDIDATE.sorensen.color : CANDIDATE.whitfield.color } }));
      })),
    h("section", { class: "cr-card cr-night-list" },
      h("header", { class: "cr-card-head" }, h("div", h("div", { class: "cr-eyebrow" }, "By county"), h("h2", "Where the votes are"))),
      h("ul", () => [...tally.value.rows].sort((a, b) => b.voters - a.voters).map(r => h("li",
        h("b", r.name),
        DotMeter({ value: Math.round(r.share * 100), max: 100, dots: 20, color: "var(--cr-yellow)", label: `${r.name} ${Math.round(r.share * 100)}% reporting` }),
        h("span", { class: "cr-muted" }, `${Math.round(r.share * 100)}% in`),
        r.share ? h("span", { class: "cr-night-lead", style: { "--c": r.m >= 0 ? CANDIDATE.okafor.color : CANDIDATE.whitfield.color } }, `${r.m >= 0 ? "Okafor" : "Whitfield"} ${signed(Math.abs(r.m)).replace("+", "+")}`) : h("span", { class: "cr-muted" }, "Waiting"))))));
}

function Overview() {
  return h("div", { class: "cr-page" },
    Masthead(),
    Ticker(),
    h("div", { class: "cr-cands" }, CANDIDATES.map(CandidateCard)),
    h("div", { class: "cr-split" },
      h("section", { class: "cr-card" },
        h("header", { class: "cr-card-head" },
          h("div", h("div", { class: "cr-eyebrow" }, "Polling average"), h("h2", "Six months of the race")),
          h("span", { class: "lucid-spacer" }),
          h("div", { class: "cr-key" }, CANDIDATES.map(c => h("span", { style: { "--c": c.color } }, h("i"), c.last)))),
        PollChart()),
      Forecast()));
}

function Polls() {
  return h("div", { class: "cr-page" },
    SectionHead({ eyebrow: "Polls", title: "What the pollsters found", text: "Every poll in the average, newest first. Tap a candidate on the overview to follow them through the chart." }),
    h("section", { class: "cr-card" },
      h("header", { class: "cr-card-head" },
        h("div", h("div", { class: "cr-eyebrow" }, "Polling average"), h("h2", "Six months of the race")),
        h("span", { class: "lucid-spacer" }),
        h("div", { class: "cr-key" }, CANDIDATES.map(c => h("span", { style: { "--c": c.color } }, h("i"), c.last)))),
      PollChart()),
    h("div", { style: { height: "14px" } }),
    PollBoard());
}

function MapPage() {
  return h("div", { class: "cr-page" },
    SectionHead({ eyebrow: "County map", title: "Every dot is about a thousand voters", text: "Coloured by projected margin. Move the forecast slider and watch the map shift." }),
    h("div", { class: "cr-map" },
      h("div", { class: "cr-map-stage" }, CountyMap(),
        h("div", { class: "cr-legend" },
          h("span", { style: { color: CANDIDATE.whitfield.color } }, "Whitfield"),
          h("i", { class: "cr-legend-ramp" }),
          h("span", { style: { color: CANDIDATE.okafor.color } }, "Okafor"))),
      h("div", { class: "cr-map-side" }, CountyPanel(), Forecast())));
}

function App() {
  return h("div", { class: "cr-app" },
    Nameplate(),
    h("main", { class: "cr-main" },
      () => ({ overview: Overview, polls: Polls, map: MapPage, money: Money, trail: Trail, results: Results }[section.value] ?? Overview)(),
      h("footer", { class: "cr-foot" },
        Logo(),
        h("p", "Crest News is a fictional newsroom. Every candidate, poll, county and headline here is invented for a Lucid UI demo. Built with Lucid UI, custom-branded with its tokens."))),
    ExitDock());
}

mount(App, "#app");
