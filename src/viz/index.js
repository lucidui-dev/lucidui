import { signal, read, getOwner, onCleanup } from "../reactive.js";
import { h, insert } from "../dom.js";
import { Icon } from "../ui/icons.js";
import { Segmented } from "../ui/components.js";

const later = fn => {
  if (getOwner()) onCleanup(fn);
};

const compact = new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 });
const plain = new Intl.NumberFormat("en", { maximumFractionDigits: 1 });
export const formatNumber = value => (Math.abs(value) >= 10000 ? compact.format(value) : plain.format(value));

const fmt = (format, value) => (format ? format(value) : formatNumber(value));

function niceStep(raw) {
  if (raw <= 1) return 1;
  const power = 10 ** Math.floor(Math.log10(raw));
  for (const m of [1, 2, 5, 10]) if (m * power >= raw) return m * power;
  return 10 * power;
}

function niceTicks(max, count = 4) {
  const step = niceStep(max / count);
  const top = Math.max(step, Math.ceil(max / step) * step);
  const ticks = [];
  for (let value = 0; value <= top + 1e-9; value += step) ticks.push(value);
  return { ticks, top };
}

function frame({ class: cls, height, aria, render }) {
  const width = signal(0);
  const box = h("div", { class: ["lucid-viz", cls], style: { minHeight: height ? `${height}px` : undefined }, role: "figure", aria });
  insert(box, () => (width.value > 0 ? render(width.value) : null));
  if (typeof ResizeObserver !== "undefined") {
    let frameId = 0;
    let previous = 0;
    const observer = new ResizeObserver(([entry]) => {
      const next = Math.floor(entry.contentRect.width);
      cancelAnimationFrame(frameId);
      frameId = requestAnimationFrame(() => {
        const current = width.peek();
        if (next === current) return;
        if (next === previous && Math.abs(next - current) <= 20) return;
        previous = current;
        width.value = next;
      });
    });
    observer.observe(box);
    later(() => { observer.disconnect(); cancelAnimationFrame(frameId); });
  }
  return box;
}

let tipElement = null;

function tip() {
  if (!tipElement || !tipElement.isConnected) {
    tipElement = h("div", { class: "lucid-viz-tip", popover: "manual", "aria-hidden": "true" });
    (document.querySelector(".lucid-app") ?? document.body).append(tipElement);
  }
  return tipElement;
}

function tipContent({ title, rows }) {
  let divided = false;
  return [
    title ? h("div", { class: "lucid-viz-tip-title" }, title) : null,
    h("div", { class: "lucid-viz-tip-grid" }, rows.map(row => {
      const separator = row.summary && !divided && rows.some(other => !other.summary);
      if (row.summary) divided = true;
      if (row.summary) {
        return [
          separator ? h("div", { class: "lucid-viz-tip-sep", "aria-hidden": "true" }) : null,
          h("div", { class: "lucid-viz-tip-summary" }, h("strong", row.value), h("span", row.label))
        ];
      }
      return [
        row.color ? h("span", { class: "lucid-viz-tip-key", "data-dot": row.dot, style: { "--c": row.color } }) : h("span"),
        h("strong", row.value),
        h("span", row.label)
      ];
    }))
  ];
}

function showTip(x, y, content) {
  const el = tip();
  el.replaceChildren(...tipContent(content).flat().filter(Boolean));
  if (!el.matches(":popover-open")) el.showPopover();
  const width = el.offsetWidth;
  const height = el.offsetHeight;
  const vw = document.documentElement.clientWidth;
  let left = x + 16;
  if (left + width > vw - 8) left = x - width - 16;
  const top = Math.max(8, Math.min(y - height / 2, window.innerHeight - height - 8));
  el.style.left = `${Math.max(8, left)}px`;
  el.style.top = `${top}px`;
}

function hideTip() {
  if (tipElement?.matches(":popover-open")) tipElement.hidePopover();
}

function interactive(root, group, content) {
  const enter = (x, y) => {
    root.setAttribute("data-focus", "");
    for (const el of root.querySelectorAll("[data-hot]")) el.removeAttribute("data-hot");
    group.setAttribute("data-hot", "");
    showTip(x, y, content());
  };
  const leave = () => {
    group.removeAttribute("data-hot");
    if (!root.querySelector("[data-hot]")) root.removeAttribute("data-focus");
    hideTip();
  };
  return {
    onPointermove: event => enter(event.clientX, event.clientY),
    onPointerleave: leave,
    onFocus: event => {
      const rect = event.currentTarget.getBoundingClientRect();
      enter(rect.left + rect.width / 2, rect.top + rect.height / 2);
    },
    onBlur: leave
  };
}

function legend(items) {
  return h("div", { class: "lucid-legend" }, items.map(item => h("span", { class: "lucid-legend-item", "data-key": item.key ?? item.label },
    h("span", { class: "lucid-key", "data-hollow": item.hollow, style: { "--c": item.color } }),
    item.label,
    item.value != null ? h("b", item.value) : null)));
}

export function DotSparkline({ data, height = 32, color = "var(--lucid-accent)", label } = {}) {
  return frame({
    height,
    aria: { label: label ?? "Trend" },
    render: width => {
      const values = read(data) ?? [];
      if (values.length < 2) return null;
      const min = Math.min(...values);
      const max = Math.max(...values);
      const pad = 4;
      const x = i => pad + (i * (width - pad * 2)) / (values.length - 1);
      const y = v => (max === min ? height / 2 : height - pad - ((v - min) / (max - min)) * (height - pad * 2));
      const last = values.length - 1;
      return h("svg", { width, height, viewBox: `0 0 ${width} ${height}`, "aria-hidden": "true" },
        h("polyline", { points: values.map((v, i) => `${x(i)},${y(v)}`).join(" "), fill: "none", stroke: "var(--lucid-line-strong)", "stroke-width": 1.25, "stroke-linejoin": "round", "stroke-linecap": "round" }),
        values.slice(0, -1).map((v, i) => h("circle", { class: "lucid-viz-dot", cx: x(i), cy: y(v), r: 1.75, fill: "var(--lucid-ink-4)", style: { "--i": i } })),
        h("circle", { class: "lucid-viz-dot lucid-viz-ring", cx: x(last), cy: y(values[last]), r: 3.5, fill: color, style: { "--i": last } }));
    }
  });
}

export function StatTile({ label, value, unit, delta, deltaLabel, upIsGood = true, trend, format, trendColor } = {}) {
  const deltaView = () => {
    const d = read(delta);
    if (d == null || !Number.isFinite(d)) return null;
    const rounded = Math.round(d);
    const good = rounded === 0 || upIsGood == null ? null : (rounded > 0) === upIsGood;
    return h("span", { class: "lucid-delta", "data-good": good == null ? undefined : String(good) },
      rounded !== 0 ? Icon({ name: rounded > 0 ? "trending-up" : "trending-down", size: 13 }) : null,
      h("b", `${rounded > 0 ? "+" : ""}${rounded}%`),
      deltaLabel ? ` ${read(deltaLabel)}` : null);
  };
  return h("div", { class: "lucid-stat" },
    h("div", { class: "lucid-stat-label" }, label),
    h("div", { class: "lucid-stat-value" }, () => fmt(format, read(value) ?? 0), unit ? h("small", unit) : null),
    h("div", { class: "lucid-stat-foot" },
      deltaView,
      trend ? h("div", { style: { width: "96px", flex: "none" } }, DotSparkline({ data: trend, height: 28, color: trendColor, label: `${label} trend` })) : null));
}

export function DotColumns({ data, height = 200, unit = "", color = "var(--lucid-series-1)", format, label } = {}) {
  let root;
  root = frame({
    height: height + 28,
    aria: { label: label ?? "Dot column chart" },
    render: width => {
      const items = read(data) ?? [];
      if (!items.length) return null;
      const labelBand = 22;
      const valueBand = 18;
      const plotH = height - labelBand - valueBand;
      const colW = width / items.length;
      const d = Math.max(5, Math.min(10, colW * 0.16));
      const pitch = d + Math.max(3, d * 0.42);
      const rows = Math.max(3, Math.floor(plotH / pitch));
      const across = Math.max(1, Math.min(4, Math.floor((colW * 0.62) / pitch)));
      const max = Math.max(1, ...items.map(item => item.value));
      const step = niceStep(max / (rows * across));
      const usedRows = Math.min(rows, Math.ceil(max / step / across));
      const baseY = valueBand + plotH - d / 2;
      const groups = items.map((item, column) => {
        const cx0 = column * colW + colW / 2 - ((across - 1) * pitch) / 2;
        const units = item.value / step;
        const full = Math.floor(units);
        const fraction = units - full;
        const dots = [];
        for (let i = 0; i < usedRows * across; i++) {
          const row = Math.floor(i / across);
          const cx = cx0 + (i % across) * pitch;
          const cy = baseY - row * pitch;
          if (i < full) dots.push(h("circle", { class: "lucid-viz-dot", cx, cy, r: d / 2, fill: color, style: { "--i": column * 3 + row } }));
          else if (i === full && fraction > 0.04) {
            dots.push(h("circle", { class: "lucid-viz-track", cx, cy, r: d / 2 }));
            dots.push(h("circle", { class: "lucid-viz-dot", cx, cy, r: (d / 2) * Math.sqrt(fraction), fill: color, style: { "--i": column * 3 + row } }));
          } else dots.push(h("circle", { class: "lucid-viz-track", cx, cy, r: d / 2 }));
        }
        const topRow = Math.max(0, Math.ceil(units / across) - 1);
        const g = h("g", { class: "lucid-viz-group" },
          h("rect", { class: "lucid-viz-band", x: column * colW + 2, y: 0, width: colW - 4, height: height - labelBand + 4, rx: 8 }),
          dots,
          h("text", { class: "lucid-viz-value", x: column * colW + colW / 2, y: baseY - topRow * pitch - d / 2 - 6, "text-anchor": "middle" }, fmt(format, item.value)),
          h("text", { x: column * colW + colW / 2, y: height - 4, "text-anchor": "middle" }, item.label));
        const hit = h("rect", {
          class: "lucid-viz-hit", x: column * colW, y: 0, width: colW, height, tabindex: 0,
          role: "img", aria: { label: `${item.label}: ${fmt(format, item.value)} ${unit}` },
          ...interactive(root, g, () => ({ title: item.label, rows: [{ color, dot: true, value: fmt(format, item.value), label: unit }] }))
        });
        return [g, hit];
      });
      return [
        h("svg", { width, height, viewBox: `0 0 ${width} ${height}` }, groups),
        h("div", { class: "lucid-viz-caption" },
          h("svg", { width: 8, height: 8, "aria-hidden": "true" }, h("circle", { cx: 4, cy: 4, r: 4, fill: color })),
          `Each dot = ${step} ${step === 1 ? unit.replace(/s$/, "") : unit}`.trim())
      ];
    }
  });
  return root;
}

export function DotDumbbell({ labels, series, height = 220, format, label } = {}) {
  let root;
  root = frame({
    height: height + 26,
    aria: { label: label ?? "Dot dumbbell chart" },
    render: width => {
      const xs = read(labels) ?? [];
      const set = read(series) ?? [];
      if (!xs.length || !set.length) return null;
      const gutter = 30;
      const right = 12;
      const top = 10;
      const bottom = 24;
      const plotW = width - gutter - right;
      const plotH = height - top - bottom;
      const max = Math.max(1, ...set.flatMap(s => s.values));
      const { ticks, top: yTop } = niceTicks(max, 4);
      const stepX = plotW / xs.length;
      const x = i => gutter + stepX * i + stepX / 2;
      const y = v => top + plotH - (v / yTop) * plotH;
      const every = Math.max(1, Math.ceil(46 / stepX));
      const r = Math.max(3, Math.min(5, stepX * 0.18));
      const grid = ticks.map(t => [
        h("line", { class: "lucid-viz-grid", x1: gutter, x2: width - right, y1: Math.round(y(t)) + 0.5, y2: Math.round(y(t)) + 0.5 }),
        h("text", { x: gutter - 8, y: y(t) + 3.5, "text-anchor": "end" }, fmt(format, t))
      ]);
      const groups = xs.map((name, i) => {
        const vs = set.map(s => s.values[i] ?? 0);
        const a = Math.min(...vs);
        const b = Math.max(...vs);
        const g = h("g", { class: "lucid-viz-group" },
          h("rect", { class: "lucid-viz-band", x: x(i) - stepX / 2 + 1, y: top - 6, width: stepX - 2, height: plotH + 12, rx: 6 }),
          a !== b ? h("line", { class: "lucid-viz-stem", x1: x(i), x2: x(i), y1: y(a), y2: y(b) }) : null,
          set.map((s, k) => h("circle", { class: "lucid-viz-dot lucid-viz-ring", cx: x(i), cy: y(s.values[i] ?? 0), r, fill: s.color, style: { "--i": i * set.length + k } })),
          i % every === (xs.length - 1) % every ? h("text", { x: x(i), y: height - 6, "text-anchor": "middle" }, name) : null);
        const hit = h("rect", {
          class: "lucid-viz-hit", x: x(i) - stepX / 2, y: 0, width: stepX, height, tabindex: 0, role: "img",
          aria: { label: `${name}: ${set.map(s => `${s.name} ${fmt(format, s.values[i] ?? 0)}`).join(", ")}` },
          ...interactive(root, g, () => {
            const net = vs[0] - vs[1];
            return {
              title: name,
              rows: [
                ...set.map((s, k) => ({ color: s.color, dot: true, value: fmt(format, vs[k]), label: s.name })),
                set.length === 2 ? { summary: true, value: `${net > 0 ? "+" : ""}${fmt(format, net)}`, label: `Net ${set[0].name.toLowerCase()}` } : null
              ].filter(Boolean)
            };
          })
        });
        return [g, hit];
      });
      return [
        h("div", { style: { marginBottom: "12px" } }, legend(set.map(s => ({ label: s.name, color: s.color })))),
        h("svg", { width, height, viewBox: `0 0 ${width} ${height}` }, grid, groups)
      ];
    }
  });
  return root;
}

function allocate(values, total) {
  const sum = values.reduce((a, b) => a + b, 0);
  if (!sum) return values.map(() => 0);
  const raw = values.map(v => (v / sum) * total);
  const base = raw.map(Math.floor);
  let rest = total - base.reduce((a, b) => a + b, 0);
  raw.map((v, i) => [v - base[i], i]).sort((a, b) => b[0] - a[0]).forEach(([, i]) => { if (rest > 0) { base[i]++; rest--; } });
  return base;
}

export function Waffle({ segments, columns = 25, rows = 4, label } = {}) {
  let root;
  root = frame({
    aria: { label: label ?? "Waffle chart" },
    render: width => {
      const list = read(segments) ?? [];
      const total = list.reduce((sum, s) => sum + s.value, 0);
      const cells = columns * rows;
      const counts = allocate(list.map(s => s.value), cells);
      const pitch = width / columns;
      const d = Math.min(pitch * 0.66, 16);
      const height = Math.ceil(rows * pitch);
      const groups = [];
      let cell = 0;
      list.forEach((segment, index) => {
        const dots = [];
        for (let k = 0; k < counts[index]; k++, cell++) {
          const col = Math.floor(cell / rows);
          const row = cell % rows;
          const cx = col * pitch + pitch / 2;
          const cy = row * pitch + pitch / 2;
          dots.push(segment.hollow
            ? h("circle", { class: "lucid-viz-dot lucid-viz-hollow", cx, cy, r: d / 2 - 0.75, stroke: segment.color, style: { "--i": cell } })
            : h("circle", { class: "lucid-viz-dot", cx, cy, r: d / 2, fill: segment.color, style: { "--i": cell } }));
        }
        const share = total ? Math.round((segment.value / total) * 100) : 0;
        const g = h("g", {
          class: "lucid-viz-group", tabindex: 0, role: "img",
          aria: { label: `${segment.label}: ${segment.value} (${share}%)` }
        }, dots);
        const handlers = interactive(root, g, () => ({ title: segment.label, rows: [{ color: segment.color, dot: true, value: String(segment.value), label: `${share}% of ${total}` }] }));
        for (const [name, fn] of Object.entries(handlers)) g.addEventListener(name.slice(2).toLowerCase(), fn);
        groups.push(g);
      });
      return [
        h("svg", { width, height, viewBox: `0 0 ${width} ${height}` }, groups),
        h("div", { style: { marginTop: "14px" } }, legend(list.map(s => ({
          label: s.label, color: s.color, hollow: s.hollow,
          value: total ? `${s.value} · ${Math.round((s.value / total) * 100)}%` : "0"
        }))))
      ];
    }
  });
  return root;
}

export function UnitRows({ rows, segments, label, max: cap } = {}) {
  let root;
  root = frame({
    aria: { label: label ?? "Unit chart" },
    render: width => {
      const list = read(rows) ?? [];
      const keys = read(segments) ?? [];
      const labelW = Math.min(170, Math.max(110, width * 0.3));
      const countW = 34;
      const area = width - labelW - countW;
      const longest = Math.max(1, cap ?? 0, ...list.map(row => keys.reduce((sum, k) => sum + (row.counts[k.key] ?? 0), 0)));
      const pitch = Math.max(5, Math.min(14, area / longest));
      const d = pitch * 0.7;
      const body = list.map((row, r) => {
        const dots = [];
        let i = 0;
        for (const key of keys) {
          for (let k = 0; k < (row.counts[key.key] ?? 0); k++, i++) {
            const cx = i * pitch + pitch / 2;
            dots.push(key.hollow
              ? h("circle", { class: "lucid-viz-dot lucid-viz-hollow", cx, cy: 9, r: d / 2 - 0.75, stroke: key.color, style: { "--i": r * 2 + i } })
              : h("circle", { class: "lucid-viz-dot", cx, cy: 9, r: d / 2, fill: key.color, style: { "--i": r * 2 + i } }));
          }
        }
        const line = h("div", {
          class: "lucid-viz-group lucid-unit-row",
          tabindex: 0,
          role: "img",
          aria: { label: `${row.label}: ${keys.map(k => `${row.counts[k.key] ?? 0} ${k.label}`).join(", ")}` },
          style: { display: "grid", gridTemplateColumns: `${labelW}px 1fr ${countW}px`, alignItems: "center", height: "30px", borderRadius: "8px" }
        },
        h("div", { style: { display: "flex", alignItems: "center", gap: "8px", minWidth: 0, fontSize: "var(--lucid-text-sm)", color: "var(--lucid-ink)", paddingLeft: "4px" } },
          row.avatar ?? null,
          h("span", { style: { overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" } }, row.label)),
        h("svg", { width: area, height: 18, viewBox: `0 0 ${area} 18`, "aria-hidden": "true" }, dots),
        h("div", { style: { textAlign: "right", fontSize: "var(--lucid-text-sm)", fontWeight: 500, fontVariantNumeric: "tabular-nums", paddingRight: "4px" } }, String(i)));
        const handlers = interactive(root, line, () => ({
          title: row.label,
          rows: [
            ...keys.filter(k => row.counts[k.key]).map(k => ({ color: k.color, dot: true, value: String(row.counts[k.key]), label: k.label })),
            { summary: true, value: String(i), label: "Total" }
          ]
        }));
        for (const [name, fn] of Object.entries(handlers)) line.addEventListener(name.slice(2).toLowerCase(), fn);
        return line;
      });
      return [
        h("div", { style: { marginBottom: "12px" } }, legend(keys.map(k => ({ label: k.label, color: k.color, hollow: k.hollow })))),
        h("div", { style: { display: "grid", gap: "2px" } }, body)
      ];
    }
  });
  return root;
}

const dayFormat = new Intl.DateTimeFormat("en", { weekday: "short", month: "short", day: "numeric" });
const monthFormat = new Intl.DateTimeFormat("en", { month: "short" });

export function DotCalendar({ days, unit = "events", label } = {}) {
  let root;
  root = frame({
    aria: { label: label ?? "Activity calendar" },
    render: width => {
      const list = read(days) ?? [];
      if (!list.length) return null;
      const gutter = 30;
      const top = 18;
      const first = new Date(list[0].date);
      const offset = (first.getDay() + 6) % 7;
      const weeks = Math.ceil((list.length + offset) / 7);
      const pitch = Math.max(8, Math.min(22, (width - gutter) / weeks));
      const maxR = pitch * 0.42;
      const height = top + pitch * 7;
      const max = Math.max(1, ...list.map(day => day.value));
      const level = v => (v <= 0 ? 0 : Math.min(6, 1 + Math.floor((v / max) * 5.999)));
      const months = [];
      let lastMonth = -1;
      let lastLabelCol = -9;
      const dots = list.map((day, index) => {
        const slot = index + offset;
        const col = Math.floor(slot / 7);
        const row = slot % 7;
        const date = new Date(day.date);
        if (date.getMonth() !== lastMonth && (row === 0 || index === 0)) {
          if (col - lastLabelCol >= 3) {
            months.push(h("text", { x: gutter + col * pitch, y: 10 }, monthFormat.format(date)));
            lastLabelCol = col;
          }
          lastMonth = date.getMonth();
        }
        const cx = gutter + col * pitch + pitch / 2;
        const cy = top + row * pitch + pitch / 2;
        const lv = level(day.value);
        const r = lv === 0 ? 1.6 : Math.max(2.4, maxR * Math.sqrt(day.value / max));
        const g = h("g", { class: "lucid-viz-group" },
          h("circle", { class: "lucid-viz-dot", cx, cy, r, fill: lv === 0 ? "var(--lucid-line-strong)" : `var(--lucid-seq-${lv})`, style: { "--i": col } }));
        const hit = h("rect", {
          class: "lucid-viz-hit", x: cx - pitch / 2, y: cy - pitch / 2, width: pitch, height: pitch,
          role: "img", aria: { label: `${dayFormat.format(date)}: ${day.value} ${unit}` },
          ...interactive(root, g, () => ({ title: dayFormat.format(date), rows: [{ value: String(day.value), label: unit }] }))
        });
        return [g, hit];
      });
      const dayLabels = [["Mon", 0], ["Wed", 2], ["Fri", 4]].map(([name, row]) => h("text", { x: 0, y: top + row * pitch + pitch / 2 + 3.5 }, name));
      const scale = [1, 2, 3, 4, 5, 6];
      return [
        h("svg", { width, height, viewBox: `0 0 ${width} ${height}` }, months, dayLabels, dots),
        h("div", { class: "lucid-viz-caption", style: { justifyContent: "flex-end", marginTop: "22px" } },
          "Less",
          h("svg", { width: scale.length * 14, height: 12, "aria-hidden": "true" },
            scale.map((lv, i) => h("circle", { cx: i * 14 + 6, cy: 6, r: 2.4 + (i / 5) * 3.4, fill: `var(--lucid-seq-${lv})` }))),
          "More")
      ];
    }
  });
  return root;
}

export function DotMeter({ value, max = 100, dots = 20, color = "var(--lucid-accent)", label } = {}) {
  return h("div", { class: "lucid-viz", role: "meter", "aria-valuemin": 0, "aria-valuemax": max, "aria-valuenow": () => read(value), aria: { label } },
    () => {
      const filled = Math.round((Math.max(0, Math.min(read(value), max)) / max) * dots);
      return h("svg", { width: dots * 9, height: 8, viewBox: `0 0 ${dots * 9} 8`, "aria-hidden": "true" },
        Array.from({ length: dots }, (_, i) => h("circle", {
          cx: i * 9 + 4, cy: 4, r: 3,
          fill: i < filled ? color : `color-mix(in oklab, ${color} 20%, transparent)`
        })));
    });
}

export function ChartCard({ title, subtitle, actions, table } = {}, chart) {
  const mode = signal("chart");
  const renderTable = () => {
    const { columns, rows } = table();
    return h("div", { class: "lucid-table-wrap" }, h("table", { class: "lucid-table" },
      h("thead", h("tr", columns.map(c => h("th", { scope: "col" }, c)))),
      h("tbody", rows.map(row => h("tr", row.map(cell => h("td", String(cell))))))));
  };
  return h("section", { class: "lucid-card lucid-chart-card" },
    h("header", { class: "lucid-chart-head" },
      h("div", { style: { flex: 1, minWidth: 0 } },
        h("h3", { class: "lucid-chart-title" }, title),
        subtitle ? h("p", { class: "lucid-chart-sub" }, subtitle) : null),
      actions ?? null,
      table ? Segmented({
        value: mode, size: "sm", iconOnly: true, aria: { label: `${title} view` },
        options: [{ value: "chart", label: "Chart", icon: "chart" }, { value: "table", label: "Table", icon: "table" }]
      }) : null),
    h("div", { hidden: () => mode.value !== "chart" }, chart),
    () => (mode.value === "table" ? renderTable() : null));
}
