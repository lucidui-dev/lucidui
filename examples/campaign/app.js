import { signal, computed, effect, h, mount } from "/lucid/index.js";
import { Button, Segmented, Tooltip, Icon } from "/lucid/ui/index.js";
import { DotSparkline, UnitRows, Waffle, ChartCard } from "/lucid/viz/index.js";
import { ExitCard } from "/exit.js";
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

function Rail() {
  const link = (id, icon, label) => h("a", { class: "cr-nav-link", href: `#${id}` }, Icon({ name: icon, size: 15 }), label);
  const soon = label => h("span", { class: "cr-nav-soon", "aria-disabled": "true" }, Icon({ name: "lock", size: 13 }), label, h("small", "Soon"));
  return h("aside", { class: "cr-rail" },
    Logo(),
    h("div", { class: "cr-rail-tag" }, h("i"), "Race Center"),
    h("nav", { class: "cr-nav", aria: { label: "Sections" } },
      link("top", "hexagon", "Overview"),
      link("polls", "chart", "Polls"),
      link("map", "target", "County map"),
      link("money", "layers", "Money"),
      link("trail", "calendar", "Campaign trail")),
    h("div", { class: "cr-rail-label" }, "Other races"),
    h("div", { class: "cr-nav" }, soon("Senate · Westmere"), soon("Mayor · Brightwater")),
    h("div", { class: "lucid-spacer" }),
    h("div", { class: "cr-rail-foot" },
      ExitCard(),
      h("div", { class: "cr-appearance" }, "Appearance",
        Segmented({
          value: theme, size: "sm", iconOnly: true, aria: { label: "Theme" },
          options: [{ value: "light", label: "Paper", icon: "sun" }, { value: "dark", label: "Studio", icon: "moon" }, { value: "system", label: "System", icon: "monitor" }]
        }))));
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
        h("p", { class: "cr-muted" }, `${tossups.length} of ${COUNTIES.length} counties are toss-ups at the current margin. Hover or select a county.`),
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

function App() {
  return h("div", { class: "cr-app" },
    Rail(),
    h("main", { class: "cr-main" },
      Masthead(),
      Ticker(),
      h("div", { class: "cr-cands" }, CANDIDATES.map(CandidateCard)),
      h("div", { class: "cr-split", id: "polls" },
        h("section", { class: "cr-card" },
          h("header", { class: "cr-card-head" },
            h("div", h("div", { class: "cr-eyebrow" }, "Polling average"), h("h2", "Six months of the race")),
            h("span", { class: "lucid-spacer" }),
            h("div", { class: "cr-key" }, CANDIDATES.map(c => h("span", { style: { "--c": c.color } }, h("i"), c.last)))),
          PollChart()),
        Forecast()),
      h("section", { class: "cr-section", id: "map" },
        h("div", { class: "cr-section-head" },
          h("div", { class: "cr-eyebrow" }, "County map"),
          h("h2", "Every dot is about a thousand voters"),
          h("p", { class: "cr-muted" }, "Coloured by projected margin. Move the forecast slider and watch the map shift.")),
        h("div", { class: "cr-map" },
          h("div", { class: "cr-map-stage" }, CountyMap(),
            h("div", { class: "cr-legend" },
              h("span", { style: { color: CANDIDATE.whitfield.color } }, "Whitfield"),
              h("i", { class: "cr-legend-ramp" }),
              h("span", { style: { color: CANDIDATE.okafor.color } }, "Okafor"))),
          CountyPanel())),
      h("section", { class: "cr-section" },
        h("div", { class: "cr-section-head" }, h("div", { class: "cr-eyebrow" }, "Latest polls"), h("h2", "What the pollsters found")),
        PollBoard()),
      Money(),
      Trail(),
      h("footer", { class: "cr-foot" },
        Logo(),
        h("p", "Crest News is a fictional newsroom. Every candidate, poll, county and headline here is invented for a Lucid UI demo. Built with Lucid UI, custom-branded with its tokens."))));
}

mount(App, "#app");
