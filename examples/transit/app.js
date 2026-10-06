import { signal, computed, effect, h, mount, For } from "/lucid/index.js";
import { Button, Segmented, Select, Dialog, Field, Input, Icon, Tooltip, Kbd, Switch, toast, hotkey } from "/lucid/ui/index.js";
import { StatTile, DotColumns, Waffle, UnitRows, DotMeter, DotSparkline, ChartCard } from "/lucid/viz/index.js";
import { ExitCard } from "/exit.js";
import { LINES, LINE, STATIONS, HOURS } from "./data.js";
import {
  theme, focusLine, selected, hovered, labels, showTrains, showCrowds, composing, draft, clock, alerts, postAlert, resolveAlert,
  lineStatus, STATUS, fleet, totals, trends, crowding, crowdLabel, elevatorsOut, arrivals, tick, hourIndex
} from "./sim.js";
import { NetworkMap, LineBadge } from "./map.js";

const TYPES = [
  { value: "delay", label: "Delay", icon: "clock" },
  { value: "reduced", label: "Reduced", icon: "trending-down" },
  { value: "suspended", label: "Suspended", icon: "x" },
  { value: "elevator", label: "Elevator", icon: "alert-circle" }
];
const TYPE_TITLE = { delay: "Delays", reduced: "Reduced service", suspended: "No service", elevator: "Elevator out of service" };
const CAUSES = ["Signal problem", "Medical emergency", "Track work", "Security incident", "Mechanical problem", "Power off", "Elevator out of service"];

const time = d => d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false });
const ago = at => {
  const minutes = Math.max(0, Math.round((clock.value.getTime() - at) / 60000));
  return minutes < 1 ? "just now" : minutes < 60 ? `${minutes} min ago` : `${Math.floor(minutes / 60)} h ${minutes % 60} min ago`;
};
const short = name => (name === "Vaughan Metropolitan Centre" ? "Vaughan Metro Centre" : name);
const range = a => (a.from === a.to ? short(LINE[a.line].stations[a.from].name) : `${short(LINE[a.line].stations[a.from].name)} to ${short(LINE[a.line].stations[a.to].name)}`);

function Rail() {
  const lineCard = line => h("button", {
    type: "button",
    class: "tr-line-card",
    "aria-pressed": () => focusLine.value === line.id,
    style: { "--c": line.color },
    onClick: () => { focusLine.value = focusLine.peek() === line.id ? null : line.id; }
  },
  LineBadge(line.id, 22),
  h("span", { class: "tr-line-copy" },
    h("b", `Line ${line.id}`, h("span", line.name)),
    h("span", { class: "tr-line-status", "data-tone": () => STATUS[lineStatus.value[line.id]].tone },
      h("i"), () => STATUS[lineStatus.value[line.id]].label)),
  h("span", { class: "tr-line-headway" }, () => `${fleet.value[line.id].headway.toFixed(1)}′`));

  return h("aside", { class: "tr-rail" },
    h("div", { class: "tr-brand" },
      h("span", { class: "tr-mark", "aria-hidden": "true" }, h("i"), h("i"), h("i")),
      h("span", { class: "tr-brand-copy" }, h("b", "Headway"), h("span", "Service control"))),
    h("div", { class: "tr-rail-label" }, "Lines", h("span", "Headway")),
    h("div", { class: "tr-lines" }, LINES.map(lineCard)),
    h("div", { class: "tr-rail-label" }, "Map layers"),
    h("div", { class: "tr-layers" },
      Switch({ label: "Trains", checked: showTrains, onChange: e => { showTrains.value = e.target.checked; } }),
      Switch({ label: "Crowding", checked: showCrowds, onChange: e => { showCrowds.value = e.target.checked; } }),
      h("div", { class: "tr-layer-row" }, "Labels",
        Segmented({ value: labels, size: "sm", aria: { label: "Station labels" }, options: [{ value: "key", label: "Key" }, { value: "all", label: "All" }] }))),
    h("div", { class: "lucid-spacer" }),
    h("div", { class: "tr-rail-foot" },
      ExitCard(),
      h("div", { class: "tr-appearance" }, "Appearance",
        Segmented({
          value: theme, size: "sm", iconOnly: true, aria: { label: "Theme" },
          options: [{ value: "light", label: "Light", icon: "sun" }, { value: "dark", label: "Dark", icon: "moon" }, { value: "system", label: "System", icon: "monitor" }]
        }))));
}

function Header() {
  const options = [...STATIONS.values()].map(s => ({ value: s.name, label: short(s.name), keywords: `line ${s.lines.join(" ")}` })).sort((a, b) => a.label.localeCompare(b.label));
  const find = signal(null);
  effect(() => { if (find.value) { selected.value = find.value; find.value = null; } });
  return h("header", { class: "tr-head" },
    h("div", { class: "tr-title" },
      h("h1", "Network"),
      h("span", { class: "tr-live" }, h("i"), "Live", h("span", { class: "tr-clock" }, () => time(clock.value)))),
    h("span", { class: "lucid-spacer" }),
    Select({ value: find, options, searchable: true, placeholder: "Find a station", searchPlaceholder: "Station or line", icon: "search", size: "md", width: 260, aria: { label: "Find a station" } }),
    Button({ variant: "primary", icon: "plus", kbd: "A", onClick: () => openComposer() }, "Post alert"));
}

function openComposer(prefill) {
  draft.value = prefill ?? null;
  composing.value = true;
}

function MapCard() {
  return h("section", { class: "tr-card tr-map-card", aria: { label: "Network map" } },
    h("header", { class: "tr-card-head" },
      h("div", h("h2", "Subway network"), h("p", () => `${totals.value.running} trains in service · ${alerts.value.length} active alert${alerts.value.length === 1 ? "" : "s"}`)),
      h("span", { class: "lucid-spacer" }),
      h("div", { class: "tr-legend" },
        h("span", h("i", { class: "tr-key-train" }), "Train"),
        h("span", h("i", { class: "tr-key-late" }), "Delayed"),
        h("span", h("i", { class: "tr-key-crowd" }), "Crowding"),
        h("span", h("i", { class: "tr-key-alert" }), "Alert"))),
    NetworkMap(),
    h("footer", { class: "tr-map-foot" },
      h("span", Kbd("←"), Kbd("→"), " move along a line"),
      h("span", Kbd("L"), " switch line"),
      h("span", Kbd("enter"), " open station"),
      h("span", { class: "lucid-spacer" }),
      h("span", { class: "tr-disclaimer" }, "Simulated data. Inspired by Toronto's subway; not affiliated with the TTC.")));
}

function AlertItem(a) {
  return h("li", { class: "tr-alert-item", "data-type": a.type, style: { "--c": LINE[a.line].color } },
    LineBadge(a.line, 20),
    h("div", { class: "tr-alert-copy" },
      h("b", TYPE_TITLE[a.type]),
      h("span", range(a)),
      h("small", () => `${a.cause} · ${ago(a.at)}`)),
    Tooltip({ label: "Resolve" }, Button({
      variant: "ghost", size: "xs", icon: "check", aria: { label: `Resolve ${TYPE_TITLE[a.type]} at ${range(a)}` },
      onClick: () => { resolveAlert(a.id); toast("Alert resolved", { tone: "success", description: `Line ${a.line} · ${range(a)}` }); }
    })));
}

function NetworkPanel() {
  const t = () => totals.value;
  return h("div", { class: "tr-panel" },
    h("div", { class: "tr-stats" },
      StatTile({ label: "On time", value: () => t().punctuality, unit: "%", trend: () => trends.value.onTime, trendColor: "#1fa463" }),
      StatTile({ label: "Avg headway", value: () => Math.round(t().headway * 10) / 10, unit: "min", trend: () => trends.value.headway, trendColor: "#f2c200", format: v => v.toFixed(1) }),
      StatTile({ label: "Trains running", value: () => t().running, delta: () => (t().held ? -Math.round((t().held / (t().running + t().held)) * 100) : null), deltaLabel: "held", upIsGood: true }),
      StatTile({ label: "Riders this hour", value: () => t().riders, trend: () => trends.value.riders, trendColor: "#a7479c" })),
    h("section", { class: "tr-card tr-alerts-card" },
      h("header", { class: "tr-card-head" },
        h("div", h("h2", "Service alerts"), h("p", () => (alerts.value.length ? "Live on platforms, apps and screens" : "All lines running normally"))),
        h("span", { class: "lucid-spacer" }),
        Button({ size: "sm", icon: "plus", onClick: () => openComposer() }, "New")),
      () => alerts.value.length
        ? h("ul", { class: "tr-alert-list" }, For({ each: alerts, key: a => a.id }, AlertItem))
        : h("div", { class: "tr-empty" }, Icon({ name: "check-circle", size: 18 }), "Good service on all lines")));
}

function StationPanel() {
  const name = () => selected.value;
  const station = () => STATIONS.get(name());
  const value = () => crowding.value.get(name()) ?? 0;
  const color = () => LINE[station().lines[0]].color;
  const profile = () => {
    const w = station().weight / 10;
    return HOURS.map(([, v]) => Math.round(v * w * 9));
  };
  return h("div", { class: "tr-panel" },
    h("section", { class: "tr-card tr-station-card", style: { "--c": color } },
      h("header", { class: "tr-station-head" },
        h("div", { class: "tr-station-badges" }, () => station().lines.map(id => LineBadge(id, 22))),
        Tooltip({ label: "Close", kbd: "esc" }, Button({ variant: "ghost", size: "sm", icon: "x", aria: { label: "Close station" }, onClick: () => { selected.value = null; } }))),
      h("h2", { class: "tr-station-name" }, () => short(name())),
      h("p", { class: "tr-station-lines" }, () => station().lines.map(id => `Line ${id} ${LINE[id].name}`).join(" · ")),
      h("div", { class: "tr-crowd" },
        h("div", { class: "tr-crowd-top" }, h("span", "Platform crowding"), h("b", () => crowdLabel(value()))),
        () => DotMeter({ value: () => Math.round(value() * 100), dots: 24, color: color(), label: "Platform crowding" })),
      () => elevatorsOut.value.has(name())
        ? h("div", { class: "tr-access", "data-ok": "false" }, Icon({ name: "alert-circle", size: 14 }), "Elevator out of service. Step-free access unavailable.")
        : h("div", { class: "tr-access", "data-ok": "true" }, Icon({ name: "check-circle", size: 14 }), "Elevators working. Step-free access available.")),
    h("section", { class: "tr-card" },
      h("header", { class: "tr-card-head" }, h("div", h("h2", "Next trains"), h("p", "Live predictions"))),
      () => {
        tick.value;
        return h("ul", { class: "tr-next" }, arrivals(name()).map(a => h("li",
          LineBadge(a.line, 18),
          h("span", { class: "tr-next-to" }, "to ", short(a.toward)),
          h("span", { class: "tr-next-times" }, a.etas.length
            ? a.etas.map((m, i) => h("b", { "data-first": i === 0 }, m < 0.6 ? "Due" : `${Math.round(m)}`))
            : h("em", "None due")),
          a.etas.length ? h("small", "min") : null)));
      }),
    h("section", { class: "tr-card" },
      h("header", { class: "tr-card-head" }, h("div", h("h2", "Riders through the day"), h("p", "Typical weekday, taps per hour"))),
      h("div", { class: "tr-spark" }, () => DotSparkline({ data: profile(), height: 48, color: color(), label: "Riders per hour" }))),
    Button({ icon: "alert-circle", onClick: () => {
      const s = station().points[0];
      openComposer({ line: s.line, from: s.index, to: s.index });
    } }, "Post alert for this station"));
}

function Charts() {
  const hours = () => HOURS.map(([label, value]) => ({ label, value }));
  const busiest = computed(() => [...crowding.value.entries()]
    .map(([name, v]) => ({ name, v, score: v * STATIONS.get(name).weight }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 6)
    .map(({ name, v }) => ({ id: name, label: short(name), counts: { steady: Math.round(Math.min(v, 0.8) * 20), crush: Math.round(Math.max(0, v - 0.8) * 20) } })));
  const segments = [{ key: "steady", label: "On platform", color: "var(--lucid-series-1)" }, { key: "crush", label: "Over comfort", color: "#ff8a3d" }];
  return h("div", { class: "tr-charts" },
    ChartCard({
      title: "Riders by hour",
      subtitle: () => `Thousands of taps · now ${HOURS[hourIndex.value][0]}`,
      table: () => ({ columns: ["Hour", "Thousand taps"], rows: HOURS.map(([l, v]) => [l, v]) })
    }, DotColumns({ data: hours, height: 190, unit: "k taps", label: "Riders by hour" })),
    ChartCard({
      title: "Busiest platforms",
      subtitle: "Right now, one dot = 5% of capacity",
      table: () => ({ columns: ["Station", "Crowding"], rows: busiest.value.map(r => [r.label, `${(r.counts.steady + r.counts.crush) * 5}%`]) })
    }, UnitRows({ rows: busiest, segments, label: "Busiest platforms" })),
    ChartCard({
      title: "Fleet status",
      subtitle: () => `${totals.value.running + totals.value.held} trains on the network`,
      table: () => ({ columns: ["Status", "Trains"], rows: [["On time", totals.value.onTime], ["Delayed", totals.value.delayed], ["Held", totals.value.held]] })
    }, Waffle({
      columns: 14, rows: 4,
      segments: () => [
        { label: "On time", value: totals.value.onTime, color: "#1fa463" },
        { label: "Delayed", value: totals.value.delayed, color: "#ff8a3d" },
        { label: "Held", value: totals.value.held, color: "var(--lucid-ink-4, #9aa0a6)", hollow: true }
      ],
      label: "Fleet status"
    })));
}

function Composer() {
  const line = signal("1");
  const type = signal("delay");
  const from = signal(0);
  const to = signal(3);
  const cause = signal(CAUSES[0]);
  effect(() => {
    if (!composing.value) return;
    const d = draft.peek();
    line.value = d?.line ?? "1";
    from.value = d?.from ?? 0;
    to.value = d?.to ?? Math.min(3, LINE[line.peek()].stations.length - 1);
    type.value = d && d.from === d.to ? "elevator" : "delay";
  });
  effect(() => { if (type.value === "elevator") { to.value = from.value; cause.value = "Elevator out of service"; } else if (cause.peek() === "Elevator out of service") cause.value = CAUSES[0]; });
  const stationOptions = computed(() => LINE[line.value].stations.map(s => ({ value: s.index, label: short(s.name) })));
  const close = () => { composing.value = false; };
  const submit = event => {
    event.preventDefault();
    const a = postAlert({ line: line.peek(), type: type.peek(), from: from.peek(), to: type.peek() === "elevator" ? from.peek() : to.peek(), cause: cause.peek() });
    close();
    focusLine.value = null;
    toast("Alert posted", { tone: "success", description: `Line ${a.line} · ${TYPE_TITLE[a.type]} · ${range(a)}` });
  };
  return Dialog({
    open: composing,
    title: "Post a service alert",
    description: "It goes live on the map, platform screens and the rider app.",
    size: "md",
    footer: [
      h("span", { class: "tr-preview" }, () => `${TYPE_TITLE[type.value]} · Line ${line.value} · ${range({ line: line.value, from: Math.min(from.value, type.value === "elevator" ? from.value : to.value), to: Math.max(from.value, type.value === "elevator" ? from.value : to.value) })}`),
      h("span", { class: "lucid-spacer" }),
      Button({ onClick: close }, "Cancel"),
      Button({ variant: "primary", icon: "zap", type: "submit", form: "tr-compose" }, "Post alert")
    ]
  },
  h("form", { id: "tr-compose", class: "tr-compose", onSubmit: submit },
    Field({ label: "Line" }, Segmented({
      value: line, aria: { label: "Line" },
      onChange: next => { from.value = 0; to.value = Math.min(3, LINE[next].stations.length - 1); },
      options: LINES.map(l => ({ value: l.id, label: `Line ${l.id}` }))
    })),
    Field({ label: "Type" }, Segmented({ value: type, aria: { label: "Alert type" }, options: TYPES })),
    h("div", { class: "tr-compose-row" },
      Field({ label: () => (type.value === "elevator" ? "Station" : "From") }, Select({ value: from, options: stationOptions, searchable: true, size: "md", aria: { label: "From station" } })),
      () => type.value === "elevator" ? null : Field({ label: "To" }, Select({ value: to, options: stationOptions, searchable: true, size: "md", aria: { label: "To station" } }))),
    Field({ label: "Cause" }, Select({ value: cause, options: CAUSES.map(c => ({ value: c, label: c })), size: "md", aria: { label: "Cause" } }))));
}

function App() {
  hotkey("a", () => openComposer());
  hotkey("escape", () => { if (selected.peek() && !composing.peek()) selected.value = null; });
  return h("div", { class: "tr-app" },
    Rail(),
    h("main", { class: "tr-main" },
      Header(),
      h("div", { class: "tr-grid" },
        MapCard(),
        h("div", { class: "tr-side" }, () => (selected.value ? StationPanel() : NetworkPanel()))),
      Charts()),
    Composer());
}

mount(App, "#app");
