import { signal, computed, effect, h, mount, For } from "/lucid/index.js";
import { Button, Segmented, Select, Dialog, Field, Input, Icon, Tooltip, Kbd, Switch, toast, hotkey } from "/lucid/ui/index.js";
import { StatTile, DotColumns, Waffle, UnitRows, DotMeter, DotSparkline, ChartCard } from "/lucid/viz/index.js";
import { ExitDock } from "/exit.js";
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

const screen = signal((() => { try { return localStorage.getItem("lucid-transit:screen") ?? "network"; } catch { return "network"; } })());
const panel = signal((() => { try { return localStorage.getItem("lucid-transit:panel") !== "closed"; } catch { return true; } })());
effect(() => { try { localStorage.setItem("lucid-transit:screen", screen.value); localStorage.setItem("lucid-transit:panel", panel.value ? "open" : "closed"); } catch {} });
const resolvedLog = signal([]);
const resolve = a => {
  resolveAlert(a.id);
  resolvedLog.value = [{ ...a, resolvedAt: clock.peek().getTime() }, ...resolvedLog.peek()].slice(0, 12);
  toast("Alert resolved", { tone: "success", description: `Line ${a.line} · ${range(a)}` });
};
const SCREENS = [
  { value: "network", label: "Network", icon: "target" },
  { value: "lines", label: "Lines", icon: "list" },
  { value: "alerts", label: "Alerts", icon: "alert-circle" },
  { value: "ridership", label: "Ridership", icon: "chart" }
];

function TopBar() {
  const options = [...STATIONS.values()].map(s => ({ value: s.name, label: short(s.name), keywords: `line ${s.lines.join(" ")}` })).sort((a, b) => a.label.localeCompare(b.label));
  const find = signal(null);
  effect(() => { if (find.value) { selected.value = find.value; screen.value = "network"; find.value = null; } });
  return h("header", { class: "tr-top" },
    h("div", { class: "tr-brand" },
      h("span", { class: "tr-mark", "aria-hidden": "true" }, h("i"), h("i"), h("i")),
      h("span", { class: "tr-brand-copy" }, h("b", "Headway"), h("span", "Service control"))),
    h("nav", { class: "tr-tabs", aria: { label: "Screens" } }, SCREENS.map(sc => h("button", {
      type: "button", class: "tr-tab", "aria-current": () => (screen.value === sc.value ? "page" : undefined), onClick: () => { screen.value = sc.value; }
    }, Icon({ name: sc.icon, size: 15 }), h("span", sc.label), sc.value === "alerts" ? h("span", { class: "tr-tab-count", "data-zero": () => alerts.value.length === 0 }, () => alerts.value.length) : null))),
    h("span", { class: "lucid-spacer" }),
    h("span", { class: "tr-live" }, h("i"), "Live", h("span", { class: "tr-clock" }, () => time(clock.value))),
    Select({ value: find, options, searchable: true, placeholder: "Find a station", searchPlaceholder: "Station or line", icon: "search", size: "md", width: 240, aria: { label: "Find a station" } }),
    Button({ variant: "primary", icon: "plus", kbd: "A", onClick: () => openComposer() }, "Post alert"),
    Segmented({
      value: theme, size: "sm", iconOnly: true, aria: { label: "Theme" },
      options: [{ value: "light", label: "Light", icon: "sun" }, { value: "dark", label: "Dark", icon: "moon" }, { value: "system", label: "System", icon: "monitor" }]
    }));
}

function LineChips() {
  return h("div", { class: "tr-chips", role: "group", aria: { label: "Focus a line" } }, LINES.map(line => h("button", {
    type: "button", class: "tr-chip", style: { "--c": line.color }, "aria-pressed": () => focusLine.value === line.id,
    onClick: () => { focusLine.value = focusLine.peek() === line.id ? null : line.id; }
  }, LineBadge(line.id, 18), h("span", { class: "tr-line-status", "data-tone": () => STATUS[lineStatus.value[line.id]].tone }, h("i"), () => STATUS[lineStatus.value[line.id]].label))));
}

function Layers() {
  return h("div", { class: "tr-layers" },
    Switch({ label: "Trains", checked: showTrains, onChange: e => { showTrains.value = e.target.checked; } }),
    Switch({ label: "Crowding", checked: showCrowds, onChange: e => { showCrowds.value = e.target.checked; } }),
    Segmented({ value: labels, size: "sm", aria: { label: "Station labels" }, options: [{ value: "key", label: "Key stops" }, { value: "all", label: "All stops" }] }));
}

function openComposer(prefill) {
  draft.value = prefill ?? null;
  composing.value = true;
}

function MapCard() {
  return h("section", { class: "tr-card tr-map-card", aria: { label: "Network map" } },
    h("header", { class: "tr-card-head tr-map-head" },
      LineChips(),
      h("span", { class: "lucid-spacer" }),
      Layers(),
      Tooltip({ label: "Side panel", kbd: "P" }, Button({ variant: "ghost", size: "sm", icon: "sidebar", class: "tr-panel-toggle", "aria-pressed": () => String(panel.value), aria: { label: "Side panel" }, onClick: () => { panel.value = !panel.peek(); } }))),
    NetworkMap(),
    h("footer", { class: "tr-map-foot" },
      h("span", Kbd("←"), Kbd("→"), " move along a line"),
      h("span", Kbd("L"), " switch line"),
      h("span", Kbd("enter"), " open station"),
      h("span", { class: "lucid-spacer" }),
      h("div", { class: "tr-legend" },
        h("span", h("i", { class: "tr-key-train" }), "Train"),
        h("span", h("i", { class: "tr-key-late" }), "Delayed"),
        h("span", h("i", { class: "tr-key-crowd" }), "Crowding"),
        h("span", h("i", { class: "tr-key-alert" }), "Alert")),
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
      onClick: () => resolve(a)
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

function Lines() {
  return h("div", { class: "tr-screen" },
    h("div", { class: "tr-screen-head" }, h("h1", "Lines"), h("p", () => `${totals.value.running} trains in service across ${LINES.length} lines`)),
    h("div", { class: "tr-line-grid" }, LINES.map(line => {
      const f = () => fleet.value[line.id];
      const st = () => STATUS[lineStatus.value[line.id]];
      const lineAlerts = computed(() => alerts.value.filter(a => a.line === line.id));
      return h("section", { class: "tr-card tr-line-panel", style: { "--c": line.color } },
        h("header", { class: "tr-line-panel-head" },
          LineBadge(line.id, 34),
          h("div", h("h2", `Line ${line.id} ${line.name}`), h("span", { class: "tr-line-status", "data-tone": () => st().tone }, h("i"), () => st().label)),
          h("span", { class: "lucid-spacer" }),
          h("div", { class: "tr-line-headway-big" }, h("b", () => f().headway.toFixed(1)), h("span", "min headway"))),
        h("div", { class: "tr-line-fleet" },
          h("div", { class: "tr-line-fleet-dots", role: "img", aria: { label: () => `${f().onTime} on time, ${f().delayed} delayed, ${f().held} held` } },
            () => Array.from({ length: f().total }, (_, i) => h("i", { "data-state": i < f().onTime ? "ok" : i < f().onTime + f().delayed ? "late" : "held" }))),
          h("div", { class: "tr-line-fleet-key" },
            h("span", h("i", { "data-state": "ok" }), () => `${f().onTime} on time`),
            h("span", h("i", { "data-state": "late" }), () => `${f().delayed} delayed`),
            h("span", h("i", { "data-state": "held" }), () => `${f().held} held`))),
        h("div", { class: "tr-line-facts" },
          h("span", h("b", `${line.stations.length}`), " stations"),
          h("span", h("b", `${line.minutes}`), " min between stops"),
          h("span", h("b", () => `${lineAlerts.value.length}`), " active alerts")),
        h("footer", { class: "tr-line-actions" },
          Button({ size: "sm", icon: "target", onClick: () => { focusLine.value = line.id; screen.value = "network"; } }, "Show on map"),
          Button({ size: "sm", variant: "ghost", icon: "alert-circle", onClick: () => openComposer({ line: line.id, from: 0, to: Math.min(3, line.stations.length - 1) }) }, "Post alert")));
    })));
}

function Alerts() {
  const which = signal("all");
  const shown = computed(() => alerts.value.filter(a => which.value === "all" || a.line === which.value));
  return h("div", { class: "tr-screen" },
    h("div", { class: "tr-screen-head" },
      h("div", h("h1", "Alerts"), h("p", () => (alerts.value.length ? `${alerts.value.length} live on platforms, apps and screens` : "All lines running normally"))),
      h("span", { class: "lucid-spacer" }),
      Segmented({ value: which, size: "sm", aria: { label: "Line" }, options: [{ value: "all", label: "All lines" }, ...LINES.map(l => ({ value: l.id, label: `Line ${l.id}` }))] }),
      Button({ variant: "primary", icon: "plus", onClick: () => openComposer() }, "Post alert")),
    h("div", { class: "tr-alerts-split" },
      h("section", { class: "tr-card" },
        h("header", { class: "tr-card-head" }, h("div", h("h2", "Live"), h("p", "Resolve an alert once service is back"))),
        () => shown.value.length
          ? h("ul", { class: "tr-alert-list" }, For({ each: shown, key: a => a.id }, AlertItem))
          : h("div", { class: "tr-empty" }, Icon({ name: "check-circle", size: 18 }), "Nothing live on this line")),
      h("section", { class: "tr-card" },
        h("header", { class: "tr-card-head" }, h("div", h("h2", "Resolved today"), h("p", "Your desk's log, newest first"))),
        () => resolvedLog.value.length
          ? h("ul", { class: "tr-log" }, resolvedLog.value.map(a => h("li", LineBadge(a.line, 18), h("div", h("b", TYPE_TITLE[a.type]), h("span", range(a))), h("small", time(new Date(a.resolvedAt))))))
          : h("div", { class: "tr-empty" }, Icon({ name: "clock", size: 18 }), "Resolved alerts will show here"))));
}

function Ridership() {
  const t = () => totals.value;
  return h("div", { class: "tr-screen" },
    h("div", { class: "tr-screen-head" }, h("h1", "Ridership"), h("p", "Taps, platforms and the fleet, updated live")),
    h("div", { class: "tr-stats tr-stats-wide" },
      StatTile({ label: "On time", value: () => t().punctuality, unit: "%", trend: () => trends.value.onTime, trendColor: "#1fa463" }),
      StatTile({ label: "Avg headway", value: () => Math.round(t().headway * 10) / 10, unit: "min", trend: () => trends.value.headway, trendColor: "#f2c200", format: v => v.toFixed(1) }),
      StatTile({ label: "Trains running", value: () => t().running }),
      StatTile({ label: "Riders this hour", value: () => t().riders, trend: () => trends.value.riders, trendColor: "#a7479c" })),
    Charts());
}

function Network() {
  return h("div", { class: "tr-network", "data-panel": panel },
    MapCard(),
    h("aside", { class: "tr-side", inert: () => !panel.value, aria: { label: "Details" } }, () => (selected.value ? StationPanel() : NetworkPanel())));
}

function App() {
  hotkey("a", () => openComposer());
  hotkey("p", () => { panel.value = !panel.peek(); });
  hotkey("escape", () => { if (selected.peek() && !composing.peek()) selected.value = null; });
  effect(() => { if (selected.value) panel.value = true; });
  return h("div", { class: "tr-app" },
    TopBar(),
    h("main", { class: "tr-main" }, () => ({ network: Network, lines: Lines, alerts: Alerts, ridership: Ridership }[screen.value] ?? Network)()),
    Composer(),
    ExitDock());
}

mount(App, "#app");
