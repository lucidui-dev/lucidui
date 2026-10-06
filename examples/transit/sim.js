import { signal, computed, effect, batch } from "/lucid/index.js";
import { LINES, LINE, STATIONS, HOURS, SEED_ALERTS } from "./data.js";

const stored = key => { try { return localStorage.getItem(`lucid-transit:${key}`); } catch { return null; } };
const store = (key, value) => { try { localStorage.setItem(`lucid-transit:${key}`, value); } catch {} };

export const theme = signal(stored("theme") ?? "system");
effect(() => {
  store("theme", theme.value);
  if (theme.value === "system") delete document.documentElement.dataset.theme;
  else document.documentElement.dataset.theme = theme.value;
});

export const focusLine = signal(null);
export const selected = signal(null);
export const hovered = signal(null);
export const labels = signal("key");
export const showTrains = signal(true);
export const showCrowds = signal(true);
export const composing = signal(false);
export const draft = signal(null);

const SPEED = 12;
const realStart = performance.now();
const simStart = (() => {
  const d = new Date();
  d.setHours(8, 12, 0, 0);
  return d.getTime();
})();
export const simNow = () => new Date(simStart + (performance.now() - realStart) * SPEED);
export const clock = signal(simNow());
export const tick = signal(0);

let nextAlert = 3;
export const alerts = signal(SEED_ALERTS.map(a => ({ ...a, at: simStart + a.posted * 60000 })));

export function postAlert({ line, type, from, to, cause }) {
  const alert = { id: nextAlert++, line, type, from: Math.min(from, to), to: Math.max(from, to), cause, at: simNow().getTime() };
  alerts.value = [alert, ...alerts.peek()];
  return alert;
}

export function resolveAlert(id) {
  alerts.value = alerts.peek().filter(a => a.id !== id);
}

const SEVERITY = { suspended: 3, delay: 2, reduced: 1, elevator: 0 };
export const STATUS = {
  good: { label: "Good service", tone: "good" },
  reduced: { label: "Reduced service", tone: "warn" },
  delay: { label: "Delays", tone: "warn" },
  suspended: { label: "Suspended", tone: "bad" }
};

export const lineStatus = computed(() => {
  const out = Object.fromEntries(LINES.map(l => [l.id, "good"]));
  for (const a of alerts.value) {
    if (a.type === "elevator") continue;
    if (out[a.line] === "good" || SEVERITY[a.type] > SEVERITY[out[a.line]]) out[a.line] = a.type;
  }
  return out;
});

export const elevatorsOut = computed(() => new Set(alerts.value.filter(a => a.type === "elevator").map(a => LINE[a.line].stations[a.from].name)));

export const alertedStations = computed(() => {
  const names = new Set();
  for (const a of alerts.value) for (let i = a.from; i <= a.to; i++) names.add(LINE[a.line].stations[i].name);
  return names;
});

const noise = (seed, t) => {
  const x = Math.sin(seed * 12.9898 + t * 78.233) * 43758.5453;
  return x - Math.floor(x);
};
const seedOf = name => [...name].reduce((s, c) => s + c.charCodeAt(0), 0);

export const hourIndex = computed(() => Math.max(0, Math.min(HOURS.length - 1, clock.value.getHours() - 5)));

export const crowding = computed(() => {
  const t = tick.value;
  const factor = HOURS[hourIndex.value][1] / 168;
  const hot = alertedStations.value;
  const out = new Map();
  for (const [name, s] of STATIONS) {
    const base = (s.weight / 10) * (0.35 + factor * 0.75);
    const wobble = 0.82 + noise(seedOf(name), Math.floor(t / 2)) * 0.36;
    out.set(name, Math.max(0.04, Math.min(1, base * wobble + (hot.has(name) ? 0.22 : 0))));
  }
  return out;
});

export const crowdLabel = value => (value > 0.8 ? "Very busy" : value > 0.55 ? "Busy" : value > 0.3 ? "Steady" : "Quiet");

export const trains = [];
for (const line of LINES) {
  const loop = 2 * (line.stations.length - 1);
  for (let k = 0; k < line.trains; k++) {
    trains.push({ line: line.id, id: `${line.id}-${String(k + 1).padStart(2, "0")}`, u: (k / line.trains) * loop + noise(k, line.stations.length) * 0.6, x: 0, y: 0, delayed: false, held: false });
  }
}

export const positionOf = train => {
  const n = LINE[train.line].stations.length - 1;
  const u = ((train.u % (2 * n)) + 2 * n) % (2 * n);
  return u <= n ? { pos: u, dir: 1 } : { pos: 2 * n - u, dir: -1 };
};

const affecting = (train, pos) => {
  let worst = null;
  for (const a of alerts.peek()) {
    if (a.line !== train.line || a.type === "elevator") continue;
    if (pos >= a.from - 0.5 && pos <= a.to + 0.5 && (!worst || SEVERITY[a.type] > SEVERITY[worst])) worst = a.type;
  }
  return worst;
};

export function step(dt) {
  for (const train of trains) {
    const line = LINE[train.line];
    const { pos } = positionOf(train);
    const impact = affecting(train, pos);
    const frac = pos - Math.floor(pos);
    const near = Math.min(frac, 1 - frac);
    const dwell = 0.22 + 1.56 * near;
    const pace = impact === "delay" ? 0.3 : impact === "reduced" ? 0.7 : 1;
    train.u += dt * 0.42 * dwell * pace * (2.1 / line.minutes);
    train.delayed = impact === "delay";
    train.held = impact === "suspended";
  }
}

export const fleet = signal(summarise());
const history = { onTime: [], headway: [], riders: [] };
export const trends = signal({ onTime: [], headway: [], riders: [] });

function summarise() {
  const out = {};
  for (const line of LINES) {
    const own = trains.filter(t => t.line === line.id);
    const held = own.filter(t => t.held).length;
    const delayed = own.filter(t => t.delayed).length;
    const running = own.length - held;
    const roundTrip = 2 * (line.stations.length - 1) * line.minutes;
    const slow = 1 + (delayed / Math.max(1, running)) * 1.4;
    out[line.id] = { total: own.length, held, delayed, onTime: running - delayed, headway: (roundTrip / Math.max(1, running)) * slow };
  }
  return out;
}

export const totals = computed(() => {
  const f = fleet.value;
  const ids = Object.keys(f);
  const running = ids.reduce((s, id) => s + f[id].total - f[id].held, 0);
  const onTime = ids.reduce((s, id) => s + f[id].onTime, 0);
  const delayed = ids.reduce((s, id) => s + f[id].delayed, 0);
  const held = ids.reduce((s, id) => s + f[id].held, 0);
  const headway = ids.reduce((s, id) => s + f[id].headway * (f[id].total - f[id].held), 0) / Math.max(1, running);
  let riders = 0;
  for (const [name, value] of crowding.value) riders += value * STATIONS.get(name).weight * 310;
  return { running, onTime, delayed, held, headway, riders: Math.round(riders), punctuality: running ? Math.round((onTime / running) * 100) : 0 };
});

effect(() => {
  tick.value;
  const t = totals.peek();
  const push = (key, value) => { history[key] = [...history[key].slice(-15), value]; };
  push("onTime", t.punctuality);
  push("headway", Math.round(t.headway * 10) / 10);
  push("riders", t.riders);
  trends.value = { ...history };
});

setInterval(() => batch(() => {
  tick.value++;
  fleet.value = summarise();
}), 2500);

setInterval(() => { clock.value = simNow(); }, 1000);

export function arrivals(name) {
  const station = STATIONS.get(name);
  const out = [];
  for (const point of station.points) {
    const line = LINE[point.line];
    const last = line.stations.length - 1;
    for (const dir of [1, -1]) {
      if ((dir === 1 && point.index === last) || (dir === -1 && point.index === 0)) continue;
      const toward = dir === 1 ? line.stations[last].name : line.stations[0].name;
      const etas = trains
        .filter(t => t.line === line.id && !t.held)
        .map(t => {
          const { pos, dir: d } = positionOf(t);
          if (d !== dir) return null;
          const gap = (point.index - pos) * dir;
          return gap >= 0 ? gap * line.minutes * (t.delayed ? 2.6 : 1) : null;
        })
        .filter(v => v != null)
        .sort((a, b) => a - b)
        .slice(0, 3);
      out.push({ line: line.id, toward, etas });
    }
  }
  return out;
}
