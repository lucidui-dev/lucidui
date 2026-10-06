import { signal, computed, effect, h, mount, onCleanup } from "/lucid/index.js";
import { Button, Segmented, Tooltip, Icon, toast, hotkey } from "/lucid/ui/index.js";
import { DotColumns, DotCalendar, DotMeter, ChartCard } from "/lucid/viz/index.js";
import { ExitCard } from "/exit.js";

const stored = key => { try { return localStorage.getItem(`lucid-fitness:${key}`); } catch { return null; } };
const theme = signal(stored("theme") ?? "dark");
effect(() => {
  try { localStorage.setItem("lucid-fitness:theme", theme.value); } catch {}
  if (theme.value === "system") delete document.documentElement.dataset.theme;
  else document.documentElement.dataset.theme = theme.value;
});

const RINGS = [
  { id: "move", label: "Move", unit: "kcal", goal: 600, color: "var(--ft-move)" },
  { id: "exercise", label: "Exercise", unit: "min", goal: 30, color: "var(--ft-exercise)" },
  { id: "stand", label: "Stand", unit: "hrs", goal: 12, color: "var(--ft-stand)" }
];
const today = signal({ move: 486, exercise: 38, stand: 9, steps: 8432, km: 6.2, rest: 54 });
const device = signal(null);
const WEEK = [["Mon", 9120], ["Tue", 11840], ["Wed", 7310], ["Thu", 12960], ["Fri", 8840], ["Sat", 15420], ["Sun", 8432]];
const DAY = 86400000;
const start = (() => { const d = new Date(); d.setHours(0, 0, 0, 0); return d.getTime() - 83 * DAY; })();
const CAL = Array.from({ length: 84 }, (_, i) => {
  const x = Math.sin(i * 12.9898) * 43758.5453;
  const r = x - Math.floor(x);
  return { date: start + i * DAY, value: r < 0.28 ? 0 : Math.round(r * 70) };
});
const WORKOUTS = [
  { icon: "zap", kind: "Run", detail: "5.4 km · 27:41", when: "Today, 7:10", zone: 4, kcal: 412 },
  { icon: "target", kind: "Strength", detail: "42 min · upper body", when: "Yesterday", zone: 3, kcal: 286 },
  { icon: "sun", kind: "Cycle", detail: "21.8 km · 48:02", when: "Sat", zone: 3, kcal: 538 },
  { icon: "moon", kind: "Yoga", detail: "30 min · recovery", when: "Fri", zone: 1, kcal: 96 }
];
const DEVICES = [
  { id: "ultra", name: "Stride Watch Ultra", model: "Titanium · 49 mm", battery: 82, signal: 3 },
  { id: "s2", name: "Stride Watch S2", model: "Aluminium · 41 mm", battery: 46, signal: 2 },
  { id: "band", name: "Stride Band", model: "Fitness band", battery: 71, signal: 1 }
];

function DotRing({ value, goal, r, color, dots = 48 }) {
  const items = Array.from({ length: dots }, (_, i) => {
    const a = (i / dots) * Math.PI * 2 - Math.PI / 2;
    return h("circle", {
      cx: 100 + Math.cos(a) * r, cy: 100 + Math.sin(a) * r, r: 2.6,
      fill: color,
      style: { "--i": i },
      "data-on": () => i < Math.round(Math.min(1, value() / goal) * dots)
    });
  });
  return h("g", { class: "ft-ring" }, items);
}

function Rings({ size = 200 } = {}) {
  return h("svg", { class: "ft-rings", width: size, height: size, viewBox: "0 0 200 200", role: "img", aria: { label: () => RINGS.map(k => `${k.label} ${today.value[k.id]} of ${k.goal} ${k.unit}`).join(", ") } },
    RINGS.map((k, i) => DotRing({ value: () => today.value[k.id], goal: k.goal, r: 86 - i * 18, color: k.color, dots: 56 - i * 10 })));
}

function Rail() {
  const nav = (icon, label, active) => h("button", {
    type: "button", class: "ft-nav", "aria-current": active ? "page" : undefined,
    onClick: () => { if (!active) toast(`${label} isn't part of this demo`, { icon: "info" }); }
  }, Icon({ name: icon, size: 16 }), label);
  return h("aside", { class: "ft-rail" },
    h("div", { class: "ft-brand" }, h("span", { class: "ft-mark", "aria-hidden": "true" }, h("i"), h("i"), h("i")), h("b", "Stride")),
    h("nav", { class: "ft-navs", aria: { label: "Main" } },
      nav("hexagon", "Today", true), nav("zap", "Workouts"), nav("moon", "Sleep"), nav("chart", "Trends")),
    h("button", { type: "button", class: "ft-device", onClick: openSync },
      h("span", { class: "ft-device-icon" }, Icon({ name: "link", size: 15 })),
      h("span", { class: "ft-device-copy" },
        h("b", () => device.value?.name ?? "No watch connected"),
        h("span", () => (device.value ? "Synced just now" : "Tap to sync a device")))),
    h("div", { class: "lucid-spacer" }),
    h("div", { class: "ft-rail-foot" },
      ExitCard(),
      h("div", { class: "ft-appearance" }, "Appearance",
        Segmented({
          value: theme, size: "sm", iconOnly: true, aria: { label: "Theme" },
          options: [{ value: "light", label: "Light", icon: "sun" }, { value: "dark", label: "Dark", icon: "moon" }, { value: "system", label: "System", icon: "monitor" }]
        }))));
}

function Today() {
  const stat = (label, value, unit) => h("div", { class: "ft-stat" }, h("span", label), h("b", value, h("small", unit)));
  const hr = Array.from({ length: 48 }, (_, i) => Math.round(62 + Math.sin(i / 3.2) * 9 + (i > 28 && i < 34 ? 46 - Math.abs(31 - i) * 9 : 0) + Math.sin(i * 2.7) * 3));
  return h("div", { class: "ft-main-inner" },
    h("header", { class: "ft-head" },
      h("div",
        h("p", { class: "ft-kicker" }, new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })),
        h("h1", "Good morning, Alex")),
      h("span", { class: "lucid-spacer" }),
      Button({ variant: "primary", size: "lg", icon: "link", class: "ft-sync-btn", kbd: "S", onClick: openSync }, () => (device.value ? "Sync again" : "Sync a watch"))),
    h("section", { class: "ft-hero" },
      h("div", { class: "ft-hero-rings" }, Rings({ size: 220 })),
      h("div", { class: "ft-hero-legend" }, RINGS.map(k => h("div", { class: "ft-legend", style: { "--c": k.color } },
        h("span", h("i"), k.label),
        h("b", () => today.value[k.id], h("small", `/${k.goal} ${k.unit}`))))),
      h("div", { class: "ft-hero-stats" },
        stat("Steps", () => today.value.steps.toLocaleString("en-US"), ""),
        stat("Distance", () => today.value.km.toFixed(1), " km"),
        stat("Resting heart rate", () => today.value.rest, " bpm"),
        h("div", { class: "ft-hr" },
          h("span", "Heart rate today"),
          h("svg", { viewBox: "0 0 240 60", class: "ft-hr-svg", "aria-hidden": "true" },
            hr.map((v, i) => h("circle", { cx: 3 + i * 5, cy: 58 - (v - 50) * 0.9, r: v > 90 ? 2.4 : 1.8, "data-peak": v > 90 }))))),
    ),
    h("div", { class: "ft-grid" },
      ChartCard({ title: "Steps this week", subtitle: "Goal 10,000 a day", table: () => ({ columns: ["Day", "Steps"], rows: WEEK }) },
        DotColumns({ data: WEEK.map(([label, value]) => ({ label, value })), height: 190, unit: "steps", color: "var(--ft-accent)", label: "Steps per day" })),
      ChartCard({ title: "Training, last 12 weeks", subtitle: "Minutes of workouts each day" },
        DotCalendar({ days: CAL, unit: "min", label: "Workout minutes per day" }))),
    h("section", { class: "ft-card ft-workouts" },
      h("header", { class: "ft-card-head" }, h("h2", "Recent workouts")),
      h("ul", WORKOUTS.map(w => h("li",
        h("span", { class: "ft-w-icon" }, Icon({ name: w.icon, size: 16 })),
        h("div", { class: "ft-w-copy" }, h("b", w.kind), h("span", w.detail)),
        h("div", { class: "ft-w-zone" }, DotMeter({ value: w.zone, max: 5, dots: 5, color: "var(--ft-move)", label: `Zone ${w.zone}` }), h("span", `Zone ${w.zone}`)),
        h("span", { class: "ft-w-kcal" }, `${w.kcal} kcal`),
        h("span", { class: "ft-w-when" }, w.when))))));
}

const syncOpen = signal(false);
const phase = signal("scan");
const chosen = signal(null);
const progress = signal(0);

function openSync() {
  phase.value = "scan";
  chosen.value = null;
  progress.value = 0;
  syncOpen.value = true;
  setTimeout(() => { if (phase.peek() === "scan") phase.value = "found"; }, 1800);
}

function closeSync() { syncOpen.value = false; }

function choose(d) {
  chosen.value = d;
  phase.value = "pair";
}

function confirmPair() {
  phase.value = "sync";
  const begin = performance.now();
  const run = now => {
    const t = Math.min(1, (now - begin) / 3600);
    progress.value = t;
    if (t < 1 && phase.peek() === "sync") requestAnimationFrame(run);
    else if (t >= 1) {
      phase.value = "done";
      device.value = chosen.peek();
      today.value = { ...today.peek(), steps: today.peek().steps + 1268, move: today.peek().move + 74, km: today.peek().km + 0.9, stand: Math.min(12, today.peek().stand + 1) };
    }
  };
  requestAnimationFrame(run);
}

function WatchScreen() {
  return h("svg", { class: "ft-screen-svg", viewBox: "0 0 180 214", "aria-hidden": "true" }, () => {
    const p = phase.value;
    if (p === "pair") return [
      h("text", { x: 90, y: 70, class: "ft-s-small" }, "Pairing code"),
      h("text", { x: 90, y: 116, class: "ft-s-code" }, "482 913"),
      h("text", { x: 90, y: 150, class: "ft-s-small" }, "Confirm on your phone")
    ];
    if (p === "sync") {
      const n = 40;
      return [
        Array.from({ length: n }, (_, i) => {
          const a = (i / n) * Math.PI * 2 - Math.PI / 2;
          return h("circle", { cx: 90 + Math.cos(a) * 62, cy: 107 + Math.sin(a) * 62, r: 3, "data-on": () => i < Math.round(progress.value * n), class: "ft-s-dot" });
        }),
        h("text", { x: 90, y: 116, class: "ft-s-code" }, () => `${Math.round(progress.value * 100)}%`),
        h("text", { x: 90, y: 140, class: "ft-s-small" }, "Syncing")
      ];
    }
    return [
      h("text", { x: 90, y: 50, class: "ft-s-small" }, "WED 7"),
      h("text", { x: 90, y: 98, class: "ft-s-time" }, "9:41"),
      h("g", { transform: "translate(45 112) scale(.45)" }, Rings({ size: 200 })),
      h("text", { x: 90, y: 206, class: "ft-s-small" }, "72 bpm")
    ];
  });
}

function Watch() {
  return h("div", { class: "ft-watch-stage" },
    h("div", { class: "ft-watch", "data-phase": phase },
      h("div", { class: "ft-band ft-band-top" }),
      h("div", { class: "ft-band ft-band-bottom" }),
      h("div", { class: "ft-case" },
        h("div", { class: "ft-crown" }),
        h("div", { class: "ft-button" }),
        h("div", { class: "ft-screen" }, WatchScreen()))),
    h("div", { class: "ft-shadow" }));
}

function LiveHeart() {
  const points = signal(Array.from({ length: 36 }, () => 70));
  let t = 0;
  const timer = setInterval(() => {
    t++;
    const beat = t % 9 === 0 ? 34 : t % 9 === 1 ? -14 : 0;
    points.value = [...points.peek().slice(1), 70 + Math.sin(t / 4) * 4 + beat];
  }, 110);
  onCleanup(() => clearInterval(timer));
  return h("svg", { class: "ft-live", viewBox: "0 0 216 70", "aria-hidden": "true" },
    () => points.value.map((v, i) => h("circle", { cx: 3 + i * 6, cy: 72 - (v - 40), r: v > 90 ? 2.8 : 2, "data-peak": v > 90, style: { opacity: String(0.25 + (i / 36) * 0.75) } })));
}

function Readout({ label, delay = 0 }, ...children) {
  return h("div", { class: "ft-readout", style: { "--d": `${delay}ms` } }, h("span", { class: "ft-readout-label" }, label), children);
}

function SyncScene() {
  const count = computed(() => Math.round(progress.value * 1268));
  const view = computed(() => (phase.value === "scan" || phase.value === "found" ? phase.value : "stage"));
  const pairing = computed(() => phase.value === "pair");
  return h("div", { class: "ft-sync", role: "dialog", "aria-modal": "true", aria: { label: "Sync a watch" }, "data-phase": phase },
    h("div", { class: "ft-sync-top" },
      h("div", h("p", { class: "ft-kicker" }, "Devices"), h("h2", () => ({ scan: "Looking for your watch", found: "Choose a device", pair: "Pair your watch", sync: "Syncing", done: "You're in sync" })[phase.value])),
      h("span", { class: "lucid-spacer" }),
      Tooltip({ label: "Close", kbd: "esc" }, Button({ variant: "ghost", icon: "x", aria: { label: "Close sync" }, onClick: closeSync }))),
    () => {
      const p = view.value;
      if (p === "scan") return h("div", { class: "ft-scan" },
        h("div", { class: "ft-radar", "aria-hidden": "true" }, h("i"), h("i"), h("i"), h("b", Icon({ name: "link", size: 22 }))),
        h("p", "Hold your watch near this device and keep Bluetooth on."));
      if (p === "found") return h("ul", { class: "ft-found" }, DEVICES.map((d, i) => h("li", { style: { "--i": i } },
        h("button", { type: "button", class: "ft-found-item", onClick: () => choose(d) },
          h("span", { class: "ft-found-glyph", "data-kind": d.id }),
          h("span", { class: "ft-found-copy" }, h("b", d.name), h("span", d.model)),
          h("span", { class: "ft-signal", aria: { label: `Signal ${d.signal} of 3` } }, [1, 2, 3].map(n => h("i", { "data-on": n <= d.signal }))),
          Icon({ name: "chevron-right", size: 16 })))));
      const d = chosen.value;
      return h("div", { class: "ft-stage" },
        h("div", { class: "ft-side ft-side-left" },
          Readout({ label: "Device", delay: 500 }, h("b", { class: "ft-big-sm" }, d.name), h("span", { class: "ft-muted" }, `${d.model} · firmware 11.2`)),
          Readout({ label: "Battery", delay: 650 }, h("b", { class: "ft-big" }, `${d.battery}`, h("small", "%")), DotMeter({ value: d.battery, max: 100, dots: 20, color: "var(--ft-exercise)", label: "Battery" })),
          Readout({ label: "Live heart rate", delay: 800 }, h("b", { class: "ft-big" }, "72", h("small", " bpm")), LiveHeart())),
        Watch(),
        h("div", { class: "ft-side ft-side-right" }, () => pairing.value
            ? Readout({ label: "Pairing", delay: 500 }, h("p", { class: "ft-muted" }, "Check that the code on the watch matches."), h("b", { class: "ft-code" }, "482 913"),
                Button({ variant: "primary", size: "lg", icon: "check", class: "ft-sync-btn", onClick: confirmPair }, "Codes match"))
            : [
                Readout({ label: "Steps synced", delay: 500 }, h("b", { class: "ft-big" }, () => `+${count.value.toLocaleString("en-US")}`)),
                Readout({ label: "Sleep last night", delay: 650 }, h("b", { class: "ft-big" }, "7:42", h("small", " h")), h("span", { class: "ft-muted" }, "Sleep score 86 · deep 1:31")),
                Readout({ label: "VO₂ max", delay: 800 }, h("b", { class: "ft-big" }, "48.6"), h("span", { class: "ft-muted" }, "Above average for 30–39")),
                () => (phase.value === "done" ? Button({ variant: "primary", size: "lg", icon: "check", class: "ft-sync-btn", onClick: () => { closeSync(); toast(`${d.name} synced`, { tone: "success", description: "1,268 steps and last night's sleep added." }); } }, "Back to today") : null)
              ]));
    });
}

function App() {
  hotkey("s", () => { if (!syncOpen.peek()) openSync(); });
  hotkey("escape", () => { if (syncOpen.peek()) closeSync(); });
  return h("div", { class: "ft-app" },
    Rail(),
    h("main", { class: "ft-main" }, Today(), () => (syncOpen.value ? SyncScene() : null),
      h("footer", { class: "ft-foot" }, "Stride is a fictional brand. Devices, workouts and people are invented for a Lucid UI demo.")));
}

mount(App, "#app");
