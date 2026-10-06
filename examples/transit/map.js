import { signal, computed, effect, h, For, onCleanup } from "/lucid/index.js";
import { Icon, Button } from "/lucid/ui/index.js";
import { DotMeter } from "/lucid/viz/index.js";
import { LINES, LINE, STATIONS, INTERCHANGES, KEY, pointAt, segmentPath } from "./data.js";
import {
  focusLine, selected, hovered, labels, showTrains, showCrowds, alerts, crowding, crowdLabel,
  trains, positionOf, step, alertedStations, elevatorsOut, arrivals, tick
} from "./sim.js";

const VIEW = { x: 0, y: 66, w: 1000, h: 700 };
const UNIQUE = [...STATIONS.values()].flatMap(s => {
  const seen = new Map();
  for (const p of s.points) {
    const key = `${p.x},${p.y}`;
    const prev = seen.get(key);
    if (!prev || p.line === "2") seen.set(key, p);
  }
  return [...seen.values()].map((p, i, all) => ({ ...s, x: p.x, y: p.y, at: p, quiet: all.length > 1 && p.line !== "2", key: `${s.name}@${p.line}` }));
});
const short = name => (name === "Vaughan Metropolitan Centre" ? "Vaughan Metro Centre" : name);

export const LineBadge = (id, size = 18) => h("span", {
  class: "tr-badge",
  style: { "--c": LINE[id].color, "--ink": LINE[id].ink, width: `${size}px`, height: `${size}px`, fontSize: `${Math.round(size * 0.58)}px` },
  aria: { label: `Line ${id}` }
}, id);

const zoomed = computed(() => (selected.value ? STATIONS.get(selected.value) : null));
const activeLines = computed(() => (zoomed.value ? zoomed.value.lines : focusLine.value ? [focusLine.value] : null));
const dimmed = lines => {
  const active = activeLines.value;
  return Boolean(active && !lines.some(id => active.includes(id)));
};

const ZOOM = 2.4;
const HOME = { x: VIEW.x, y: VIEW.y, w: VIEW.w, h: VIEW.h, tilt: 0, twist: 0, lz: 1, lw: 1 };
const pan = signal({ x: 0, y: 0 });
const dragging = signal(false);
const panned = computed(() => Math.abs(pan.value.x) > 0.5 || Math.abs(pan.value.y) > 0.5);
const view = signal({ ...HOME });

function base() {
  const s = zoomed.peek();
  if (!s) return { ...HOME };
  const p = s.points.find(q => q.line === "2") ?? s.points[0];
  const w = VIEW.w / ZOOM;
  const h = VIEW.h / ZOOM;
  return { x: p.x - w / 2, y: p.y - h / 2, w, h, tilt: 18, twist: p.x < 500 ? -3 : 3, lz: 0.62, lw: 0.55 };
}

const goal = () => {
  const b = base();
  return { ...b, x: b.x + pan.peek().x, y: b.y + pan.peek().y };
};

let tween = 0;
function glide(to, duration = 1100) {
  cancelAnimationFrame(tween);
  const from = view.peek();
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) { view.value = to; return; }
  const start = performance.now();
  const ease = t => 1 - Math.pow(1 - t, 4);
  const step = now => {
    const t = Math.min(1, (now - start) / duration);
    const k = ease(t);
    const next = {};
    for (const key in to) next[key] = from[key] + (to[key] - from[key]) * k;
    view.value = next;
    if (t < 1) tween = requestAnimationFrame(step);
  };
  tween = requestAnimationFrame(step);
}

export function NetworkMap() {
  const cursor = signal({ line: "1", index: 21 });
  const svgNodes = new Map();
  let trainLayer;
  const dots = new Map();

  const live = computed(() => {
    const hot = alertedStations.value;
    const sel = selected.value;
    const hov = hovered.value;
    const all = labels.value === "all";
    const zoom = zoomed.value;
    return name => all || KEY.has(name) || hot.has(name) || name === sel || name === hov || Boolean(zoom && STATIONS.get(name).lines.some(id => zoom.lines.includes(id)));
  });

  const focusName = ({ line, index }) => LINE[line].stations[index].name;

  const move = (delta, event) => {
    event.preventDefault();
    const { line, index } = cursor.peek();
    const stations = LINE[line].stations;
    const next = Math.max(0, Math.min(stations.length - 1, index + delta));
    cursor.value = { line, index: next };
    hovered.value = stations[next].name;
    svgNodes.get(stations[next].name)?.focus();
  };

  const switchLine = event => {
    event.preventDefault();
    const name = focusName(cursor.peek());
    const station = STATIONS.get(name);
    const at = station.points.findIndex(p => p.line === cursor.peek().line);
    const other = station.points[(at + 1) % station.points.length];
    cursor.value = { line: other.line, index: other.index };
  };

  const keys = event => {
    if (event.key === "ArrowRight" || event.key === "ArrowDown") move(1, event);
    else if (event.key === "ArrowLeft" || event.key === "ArrowUp") move(-1, event);
    else if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      const name = focusName(cursor.peek());
      selected.value = selected.peek() === name ? null : name;
    } else if (event.key.toLowerCase() === "l") switchLine(event);
    else if (event.key === "Escape") hovered.value = null;
  };

  const lineLayer = LINES.map(line => h("path", {
    class: "tr-line",
    d: line.path,
    stroke: line.color,
    "data-line": line.id,
    "data-dim": () => dimmed([line.id])
  }));

  const casing = LINES.map(line => h("path", { class: "tr-casing", d: line.path }));

  const halos = UNIQUE.map(s => h("circle", {
    class: "tr-halo",
    cx: s.x,
    cy: s.y,
    fill: LINE[s.lines[0]].color,
    r: () => (showCrowds.value ? 5 + (crowding.value.get(s.name) ?? 0) * 17 : 0),
    "data-hot": () => (crowding.value.get(s.name) ?? 0) > 0.8,
    "data-dim": () => dimmed(s.lines)
  }));

  const overlays = h("g", { class: "tr-alerts" },
    For({ each: alerts, key: a => a.id }, a => a.type === "elevator"
      ? h("g", { class: "tr-elevator" },
          h("circle", { cx: LINE[a.line].stations[a.from].x, cy: LINE[a.line].stations[a.from].y, r: 13, class: "tr-elevator-ring" }))
      : h("path", { class: "tr-alert", "data-type": a.type, d: segmentPath(LINE[a.line], a.from, a.to) })));

  const stationNodes = UNIQUE.map(s => {
    const interchange = INTERCHANGES.has(s.name) && s.lines.length > 1 && !s.quiet;
    const lbl = s.name === "Sheppard-Yonge" ? { x: s.x - 11, y: s.y + 3.5, anchor: "end" } : s.at.label;
    const node = h("g", {
      class: "tr-station",
      role: "button",
      tabindex: () => (!s.quiet && focusName(cursor.value) === s.name ? 0 : -1),
      "data-interchange": interchange,
      "data-selected": () => selected.value === s.name,
      "data-alert": () => alertedStations.value.has(s.name),
      "data-dim": () => dimmed(s.lines),
      aria: { label: () => `${s.name}, line ${s.lines.join(" and ")}, ${crowdLabel(crowding.value.get(s.name) ?? 0).toLowerCase()}` },
      onClick: () => {
        selected.value = selected.peek() === s.name ? null : s.name;
        cursor.value = { line: s.at.line, index: s.at.index };
      },
      onPointerenter: () => { hovered.value = s.name; },
      onPointerleave: () => { if (hovered.peek() === s.name) hovered.value = null; },
      onFocus: () => { if (!selected.peek()) hovered.value = s.name; },
      ref: el => { if (!s.quiet) svgNodes.set(s.name, el); }
    },
    h("circle", { class: "tr-hit", cx: s.x, cy: s.y, r: 11 }),
    interchange
      ? h("circle", { class: "tr-xchg", cx: s.x, cy: s.y, r: 6.5 })
      : h("circle", { class: "tr-stop", cx: s.x, cy: s.y, r: 4, stroke: LINE[s.at.line].color }),
    h("text", {
      class: "tr-label",
      x: lbl.x,
      y: lbl.y,
      "text-anchor": lbl.anchor,
      transform: lbl.rotate ? `rotate(${lbl.rotate} ${lbl.x} ${lbl.y})` : undefined,
      "data-show": () => !s.quiet && live.value(s.name),
      "data-strong": KEY.has(s.name) || interchange
    }, short(s.name)));
    return node;
  });

  const transfer = h("path", { class: "tr-transfer", d: "M470 444 L436 470" });

  const lake = h("g", { class: "tr-lake", "aria-hidden": "true" },
    h("path", { d: "M0 712 C 140 700, 260 724, 400 714 S 640 700, 760 716 S 920 708, 1000 714 L1000 770 L0 770 Z" }),
    h("text", { x: 975, y: 745, "text-anchor": "end" }, "Lake Ontario / Lake America"));

  trainLayer = h("g", { class: "tr-trains", "data-hidden": () => !showTrains.value },
    trains.map(t => {
      const dot = h("circle", { class: "tr-train", r: 3.6, fill: LINE[t.line].color, "data-line": t.line });
      dots.set(t, dot);
      return dot;
    }));

  let frame = 0;
  let last = performance.now();
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const loop = now => {
    const dt = Math.min(0.1, (now - last) / 1000);
    last = now;
    if (!reduced) step(dt);
    const focus = activeLines.peek();
    for (const [t, dot] of dots) {
      const [x, y] = pointAt(LINE[t.line], positionOf(t).pos);
      dot.setAttribute("cx", x.toFixed(1));
      dot.setAttribute("cy", y.toFixed(1));
      dot.toggleAttribute("data-delayed", t.delayed);
      dot.toggleAttribute("data-held", t.held);
      dot.toggleAttribute("data-dim", Boolean(focus && !focus.includes(t.line)));
    }
    frame = requestAnimationFrame(loop);
  };
  frame = requestAnimationFrame(loop);
  onCleanup(() => cancelAnimationFrame(frame));

  const svg = h("svg", {
    class: "tr-svg",
    viewBox: () => { const v = view.value; return `${v.x.toFixed(2)} ${v.y.toFixed(2)} ${v.w.toFixed(2)} ${v.h.toFixed(2)}`; },
    role: "group",
    aria: { label: "Subway network map. Use arrow keys to move along a line, L to switch line at an interchange, Enter to open a station." },
    onKeydown: keys
  },
  h("defs",
    h("pattern", { id: "tr-grid", width: 20, height: 20, patternUnits: "userSpaceOnUse" }, h("circle", { cx: 10, cy: 10, r: 0.9, class: "tr-grid-dot" }))),
  h("g", { class: "tr-world", transform: () => {
    const v = view.value;
    const cx = v.x + v.w / 2;
    const cy = v.y + v.h / 2;
    const flat = 1 - v.tilt * 0.0045;
    return `translate(${cx.toFixed(2)} ${cy.toFixed(2)}) rotate(${v.twist.toFixed(3)}) scale(1 ${flat.toFixed(4)}) translate(${(-cx).toFixed(2)} ${(-cy).toFixed(2)})`;
  } },
  h("rect", { x: VIEW.x - 400, y: VIEW.y - 300, width: VIEW.w + 800, height: VIEW.h + 600, fill: "url(#tr-grid)" }),
  lake,
  h("g", { class: "tr-halos" }, halos),
  casing,
  lineLayer,
  transfer,
  overlays,
  trainLayer,
  () => {
    const z = zoomed.value;
    if (!z) return null;
    const p = z.points.find(q => q.line === "2") ?? z.points[0];
    return h("g", { class: "tr-ripple", "aria-hidden": "true" },
      h("circle", { cx: p.x, cy: p.y, r: 9 }),
      h("circle", { cx: p.x, cy: p.y, r: 9 }));
  },
  h("g", { class: "tr-stations", "data-focus": focusLine }, stationNodes)));

  effect(() => {
    zoomed.value;
    pan.value = { x: 0, y: 0 };
    glide(goal());
  });
  onCleanup(() => cancelAnimationFrame(tween));
  const recenter = () => { pan.value = { x: 0, y: 0 }; glide(goal(), 800); };
  const zoomOut = () => { selected.value = null; };

  let drag = null;
  let swallow = false;
  const grab = event => {
    if (event.button !== 0 || event.target.closest(".tr-hud, .tr-controls")) return;
    drag = { id: event.pointerId, x: event.clientX, y: event.clientY, from: pan.peek(), moved: false };
  };
  const slide = event => {
    if (!drag || event.pointerId !== drag.id) return;
    const dx = event.clientX - drag.x;
    const dy = event.clientY - drag.y;
    if (!drag.moved) {
      if (Math.hypot(dx, dy) < 5) return;
      drag.moved = true;
      dragging.value = true;
      hovered.value = null;
      event.currentTarget.setPointerCapture(event.pointerId);
    }
    cancelAnimationFrame(tween);
    const box = event.currentTarget.getBoundingClientRect();
    const b = base();
    const units = b.w / box.width;
    const limitX = VIEW.w * 0.45;
    const limitY = VIEW.h * 0.45;
    pan.value = {
      x: Math.max(-limitX, Math.min(limitX, drag.from.x - dx * units)),
      y: Math.max(-limitY, Math.min(limitY, drag.from.y - dy * units))
    };
    view.value = goal();
  };
  const release = event => {
    if (!drag || event.pointerId !== drag.id) return;
    swallow = drag.moved;
    drag = null;
    dragging.value = false;
  };

  const map = h("div", {
    class: "tr-map",
    "data-focus": () => focusLine.value ?? "",
    "data-zoomed": () => Boolean(zoomed.value),
    "data-dragging": dragging,
    onPointerdown: grab,
    onPointermove: slide,
    onPointerup: release,
    onPointercancel: release
  },
  h("div", {
    class: "tr-camera",
    style: {
      "--lz": () => view.value.lz.toFixed(3),
      "--lw": () => view.value.lw.toFixed(3)
    }
  }, svg),
  Peek(),
  Hud(),
  h("div", { class: "tr-controls" },
    () => (zoomed.value ? Button({ size: "sm", icon: "x", class: "tr-control", kbd: "esc", onClick: zoomOut }, "Zoom out") : null),
    () => (panned.value && !dragging.value ? Button({ size: "sm", icon: "target", class: "tr-control", onClick: recenter }, "Recenter") : null)));
  map.addEventListener("click", event => {
    if (!swallow) return;
    swallow = false;
    event.stopPropagation();
    event.preventDefault();
  }, true);
  return map;
}

function Hud() {
  return () => {
    const z = zoomed.value;
    if (!z) return null;
    return h("div", { class: "tr-hud", role: "status" },
      h("div", { class: "tr-hud-badges" }, z.lines.map(id => LineBadge(id, 20))),
      h("div", { class: "tr-hud-copy" },
        h("b", short(z.name)),
        h("span", z.lines.length > 1 ? `Interchange · ${z.lines.map(id => `Line ${id}`).join(" and ")}` : `Line ${z.lines[0]} ${LINE[z.lines[0]].name}`)));
  };
}

function Peek() {
  const show = computed(() => (hovered.value && !selected.value && !dragging.value ? hovered.value : null));
  return () => {
    const name = show.value;
    if (!name) return null;
    const s = STATIONS.get(name);
    const p = s.points[0];
    const v = view.value;
    const left = ((p.x - v.x) / v.w) * 100;
    const top = ((p.y - v.y) / v.h) * 100;
    const value = () => crowding.value.get(name) ?? 0;
    const next = () => {
      tick.value;
      const list = arrivals(name).filter(a => a.etas.length);
      const soonest = list.sort((a, b) => a.etas[0] - b.etas[0])[0];
      return soonest ? `Next train ${Math.max(1, Math.round(soonest.etas[0]))} min · to ${short(soonest.toward)}` : "No trains due";
    };
    return h("div", { class: "tr-peek", "data-flip": left > 62, "data-below": top < 24, style: { left: `${left}%`, top: `${top}%` }, role: "status" },
      h("div", { class: "tr-peek-head" }, s.lines.map(id => LineBadge(id, 16)), h("b", short(name))),
      h("div", { class: "tr-peek-row" }, DotMeter({ value: () => Math.round(value() * 100), dots: 14, color: LINE[s.lines[0]].color, label: "Crowding" }), h("span", () => crowdLabel(value()))),
      h("div", { class: "tr-peek-next" }, Icon({ name: "clock", size: 12 }), next),
      elevatorsOut.value.has(name) ? h("div", { class: "tr-peek-warn" }, Icon({ name: "alert-circle", size: 12 }), "Elevator out of service") : null);
  };
}
