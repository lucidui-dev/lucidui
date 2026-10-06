import { signal, computed, effect, h, mount } from "/lucid/index.js";
import { Button, Segmented, Dialog, Tooltip, Icon, toast } from "/lucid/ui/index.js";
import { DotMeter } from "/lucid/viz/index.js";
import { ExitCard } from "/exit.js";

const stored = key => { try { return localStorage.getItem(`lucid-maison:${key}`); } catch { return null; } };
const theme = signal(stored("theme") ?? "light");
effect(() => {
  try { localStorage.setItem("lucid-maison:theme", theme.value); } catch {}
  if (theme.value === "system") delete document.documentElement.dataset.theme;
  else document.documentElement.dataset.theme = theme.value;
});

const SIZES = [
  { value: "two", label: "2-seat", price: 1890, seats: 2, width: 360, chaise: false, dims: "184 × 96 cm" },
  { value: "three", label: "3-seat", price: 2390, seats: 3, width: 470, chaise: false, dims: "232 × 96 cm" },
  { value: "corner", label: "Corner", price: 3290, seats: 3, width: 470, chaise: true, dims: "296 × 162 cm" }
];
const MATERIALS = [
  { value: "boucle", label: "Bouclé", add: 0, weeks: 5, rub: 4, note: "Looped wool blend, soft and nubby" },
  { value: "linen", label: "Linen", add: 0, weeks: 4, rub: 3, note: "Washed Belgian linen, relaxed and breathable" },
  { value: "velvet", label: "Velvet", add: 240, weeks: 6, rub: 4, note: "Cotton velvet with a low, warm sheen" },
  { value: "leather", label: "Leather", add: 680, weeks: 8, rub: 5, note: "Vegetable-tanned leather that ages well" }
];
const COLORS = {
  boucle: [["Ivory", "#ece4d6"], ["Oat", "#d6c5a8"], ["Pebble", "#b5ada1"], ["Charcoal", "#4a4643"]],
  linen: [["Sand", "#cdb995"], ["Sage", "#a3ad95"], ["Terracotta", "#b66a49"], ["Ink", "#34414f"]],
  velvet: [["Moss", "#4f6b4a"], ["Ochre", "#c08a2b"], ["Rose", "#c48c8a"], ["Midnight", "#27304a"]],
  leather: [["Cognac", "#985a33"], ["Tan", "#b98559"], ["Espresso", "#4b3426"], ["Black", "#242120"]]
};
const LEGS = [
  { value: "oak", label: "Oak", color: "#c9a273", add: 0 },
  { value: "walnut", label: "Walnut", color: "#6b4630", add: 90 },
  { value: "black", label: "Black", color: "#1f1d1c", add: 0 }
];

const size = signal("three");
const material = signal("boucle");
const color = signal("Oat");
const legs = signal("oak");
const cart = signal([]);
const cartOpen = signal(false);
const swatches = signal([]);

const S = computed(() => SIZES.find(s => s.value === size.value));
const M = computed(() => MATERIALS.find(m => m.value === material.value));
const L = computed(() => LEGS.find(l => l.value === legs.value));
const hex = computed(() => (COLORS[material.value].find(([n]) => n === color.value) ?? COLORS[material.value][0])[1]);
const price = computed(() => S.value.price + M.value.add + L.value.add);
const money = n => `$${n.toLocaleString("en-US")}`;
const count = computed(() => cart.value.reduce((n, l) => n + l.qty, 0) + swatches.value.length);

effect(() => {
  const names = COLORS[material.value].map(([n]) => n);
  if (!names.includes(color.peek())) color.value = names[1];
});

const shade = (c, amount) => `color-mix(in oklab, ${c} ${100 - amount}%, ${amount > 0 ? "black" : "white"})`;

function Sofa() {
  const geo = computed(() => {
    const s = S.value;
    const total = s.chaise ? s.width + 140 : s.width;
    const x0 = 300 - total / 2;
    const arm = 34;
    const inner = s.width - arm * 2;
    const seatW = inner / s.seats;
    return { s, x0, total, arm, inner, seatW };
  });
  const fill = () => hex.value;
  const pattern = () => `url(#ms-${material.value})`;
  const seat = i => ({
    x: () => geo.value.x0 + geo.value.arm + i * geo.value.seatW + 3,
    width: () => (i < geo.value.s.seats ? geo.value.seatW - 6 : 0)
  });
  return h("svg", { class: "ms-sofa", viewBox: "0 0 600 330", role: "img", aria: { label: () => `${S.value.label} Arlo sofa in ${color.value} ${M.value.label.toLowerCase()} with ${L.value.label.toLowerCase()} legs` } },
    h("defs",
      h("pattern", { id: "ms-boucle", width: 7, height: 7, patternUnits: "userSpaceOnUse" }, h("circle", { cx: 3.5, cy: 3.5, r: 1.3, fill: "rgb(255 255 255 / .22)" }), h("circle", { cx: 0, cy: 0, r: 1, fill: "rgb(0 0 0 / .08)" })),
      h("pattern", { id: "ms-linen", width: 4, height: 4, patternUnits: "userSpaceOnUse" }, h("path", { d: "M0 2 H4", stroke: "rgb(255 255 255 / .12)", "stroke-width": 1 }), h("path", { d: "M2 0 V4", stroke: "rgb(0 0 0 / .05)", "stroke-width": 1 })),
      h("linearGradient", { id: "ms-velvet", x1: 0, y1: 0, x2: 0, y2: 1 }, h("stop", { offset: 0, "stop-color": "rgb(255 255 255 / .28)" }), h("stop", { offset: 0.45, "stop-color": "rgb(255 255 255 / 0)" }), h("stop", { offset: 1, "stop-color": "rgb(0 0 0 / .18)" })),
      h("linearGradient", { id: "ms-leather", x1: 0, y1: 0, x2: 1, y2: 1 }, h("stop", { offset: 0, "stop-color": "rgb(255 255 255 / .3)" }), h("stop", { offset: 0.35, "stop-color": "rgb(255 255 255 / .04)" }), h("stop", { offset: 1, "stop-color": "rgb(0 0 0 / .2)" })),
      h("radialGradient", { id: "ms-floor", cx: 0.5, cy: 0.5, r: 0.5 }, h("stop", { offset: 0, "stop-color": "rgb(40 28 18 / .35)" }), h("stop", { offset: 1, "stop-color": "rgb(40 28 18 / 0)" }))),
    h("rect", { x: -3000, y: 290, width: 7000, height: 3000, class: "ms-floor", "aria-hidden": "true" }),
    h("g", { class: "ms-room", "aria-hidden": "true" },
      h("rect", { x: 70, y: 18, width: 92, height: 118, rx: 2, class: "ms-frame" }),
      h("rect", { x: 80, y: 28, width: 72, height: 98, class: "ms-art" }),
      h("circle", { cx: 116, cy: 70, r: 20, class: "ms-art-sun" }),
      h("path", { d: "M520 300 V92", class: "ms-lamp-pole" }),
      h("path", { d: "M492 92 L548 92 L536 58 L504 58 Z", class: "ms-lamp-shade" }),
      h("ellipse", { cx: 520, cy: 300, rx: 22, ry: 4, class: "ms-lamp-base" })),
    h("ellipse", { cx: 300, cy: 296, rx: () => geo.value.total / 2 + 30, ry: 16, fill: "url(#ms-floor)", class: "ms-anim" }),
    h("g", { class: "ms-legs" }, [0, 1, 2, 3].map(i => h("rect", {
      class: "ms-anim", y: 262, width: 10, height: 26, rx: 2, fill: () => L.value.color,
      x: () => {
        const g = geo.value;
        const right = g.x0 + g.total;
        return [g.x0 + 20, g.x0 + g.s.width - 30, right - 30, g.x0 + g.s.width / 2 - 5][i];
      },
      opacity: () => (i === 2 && !geo.value.s.chaise ? 0 : i === 3 && geo.value.s.value === "two" ? 0 : 1)
    }))),
    h("rect", { class: "ms-anim", x: () => geo.value.x0 + 18, y: 82, width: () => geo.value.s.width - 36, height: 104, rx: 26, fill, style: { "--f": fill } }),
    h("rect", { class: "ms-anim", x: () => geo.value.x0 + 18, y: 82, width: () => geo.value.s.width - 36, height: 104, rx: 26, fill: pattern }),
    h("rect", { class: "ms-anim ms-chaise", x: () => geo.value.x0 + geo.value.s.width - 40, y: 166, width: () => (geo.value.s.chaise ? 180 : 0), height: 100, rx: 18, fill: () => shade(hex.value, 6) }),
    h("rect", { class: "ms-anim", x: () => geo.value.x0 + geo.value.s.width - 40, y: 166, width: () => (geo.value.s.chaise ? 180 : 0), height: 100, rx: 18, fill: pattern }),
    h("rect", { class: "ms-anim", x: () => geo.value.x0 + 10, y: 214, width: () => geo.value.s.width - 20, height: 50, rx: 12, fill: () => shade(hex.value, 14) }),
    [0, 1, 2].map(i => [
      h("rect", { class: "ms-anim", ...seat(i), y: 160, height: 60, rx: 16, fill }),
      h("rect", { class: "ms-anim", ...seat(i), y: 160, height: 60, rx: 16, fill: pattern }),
      h("rect", { class: "ms-anim", ...seat(i), y: 160, height: 14, rx: 7, fill: "rgb(255 255 255 / .14)" })
    ]),
    [0, 1].map(side => [
      h("rect", { class: "ms-anim", x: () => (side ? geo.value.x0 + geo.value.s.width - geo.value.arm : geo.value.x0), y: 140, width: () => geo.value.arm, height: 124, rx: 17, fill: () => shade(hex.value, 4) }),
      h("rect", { class: "ms-anim", x: () => (side ? geo.value.x0 + geo.value.s.width - geo.value.arm : geo.value.x0), y: 140, width: () => geo.value.arm, height: 124, rx: 17, fill: pattern })
    ]));
}

function Swatch({ name, value, selected, onPick }) {
  return Tooltip({ label: name }, h("button", {
    type: "button", class: "ms-swatch", style: { "--s": value }, "aria-pressed": selected, aria: { label: name }, onClick: onPick
  }));
}

function addToCart() {
  const line = {
    id: `${size.peek()}-${material.peek()}-${color.peek()}-${legs.peek()}`,
    title: `The Arlo, ${S.peek().label}`,
    detail: `${color.peek()} ${M.peek().label.toLowerCase()} · ${L.peek().label.toLowerCase()} legs`,
    color: hex.peek(),
    price: price.peek(),
    qty: 1
  };
  const existing = cart.peek().find(l => l.id === line.id);
  cart.value = existing ? cart.peek().map(l => (l.id === line.id ? { ...l, qty: l.qty + 1 } : l)) : [...cart.peek(), line];
  cartOpen.value = true;
}

function orderSwatch() {
  const key = `${color.peek()} ${M.peek().label.toLowerCase()}`;
  if (swatches.peek().some(s => s.key === key)) { toast("That swatch is already in your bag", { icon: "info" }); return; }
  if (swatches.peek().length >= 3) { toast("Up to 3 free swatches per order", { icon: "info", description: "Remove one from your bag to swap it." }); return; }
  swatches.value = [...swatches.peek(), { key, color: hex.peek() }];
  toast("Free swatch added", { tone: "success", description: `${key} · ${3 - swatches.peek().length} more free` });
}

function Cart() {
  const subtotal = computed(() => cart.value.reduce((n, l) => n + l.price * l.qty, 0));
  return Dialog({ open: cartOpen, title: "Your bag", variant: "sheet", width: "420px" },
    () => (!cart.value.length && !swatches.value.length
      ? h("div", { class: "ms-empty" }, h("p", "Your bag is empty."), Button({ onClick: () => { cartOpen.value = false; } }, "Keep browsing"))
      : h("div", { class: "ms-bag" },
          h("ul", { class: "ms-lines" },
            cart.value.map(l => h("li",
              h("span", { class: "ms-line-chip", style: { "--s": l.color } }),
              h("div", { class: "ms-line-copy" }, h("b", l.title), h("span", l.detail), h("span", { class: "ms-qty" },
                h("button", { type: "button", aria: { label: "One fewer" }, onClick: () => { cart.value = cart.peek().flatMap(x => (x.id === l.id ? (x.qty > 1 ? [{ ...x, qty: x.qty - 1 }] : []) : [x])); } }, "−"),
                h("output", String(l.qty)),
                h("button", { type: "button", aria: { label: "One more" }, onClick: () => { cart.value = cart.peek().map(x => (x.id === l.id ? { ...x, qty: x.qty + 1 } : x)); } }, "+"))),
              h("b", { class: "ms-line-price" }, money(l.price * l.qty)))),
            swatches.value.map(s => h("li",
              h("span", { class: "ms-line-chip ms-line-swatch", style: { "--s": s.color } }),
              h("div", { class: "ms-line-copy" }, h("b", "Fabric swatch"), h("span", s.key)),
              h("button", { type: "button", class: "ms-remove", aria: { label: `Remove ${s.key} swatch` }, onClick: () => { swatches.value = swatches.peek().filter(x => x.key !== s.key); } }, Icon({ name: "x", size: 13 }))))),
          h("dl", { class: "ms-sum" },
            h("div", h("dt", "Subtotal"), h("dd", () => money(subtotal.value))),
            h("div", h("dt", "White-glove delivery"), h("dd", "Free")),
            h("div", { class: "ms-total" }, h("dt", "Total"), h("dd", () => money(subtotal.value)))),
          Button({ variant: "primary", size: "lg", class: "ms-checkout", onClick: () => toast("This is a demo store", { icon: "info", description: "Maison is a Lucid UI demo. Nothing is charged or shipped." }) }, "Checkout"),
          h("p", { class: "ms-fine" }, "100-night trial · free returns · 10-year frame warranty"))));
}

function Rail() {
  const nav = (label, active) => h("button", { type: "button", class: "ms-nav", "aria-current": active ? "page" : undefined, onClick: () => { if (!active) toast(`${label} aren't part of this demo`, { icon: "info" }); } }, label);
  return h("aside", { class: "ms-rail" },
    h("div", { class: "ms-logo" }, "Maison"),
    h("nav", { class: "ms-navs", aria: { label: "Shop" } }, nav("Sofas", true), nav("Chairs"), nav("Tables"), nav("Lighting"), nav("Rugs")),
    h("button", { type: "button", class: "ms-bag-btn", onClick: () => { cartOpen.value = true; } },
      Icon({ name: "inbox", size: 16 }), "Bag", h("span", { class: "ms-bag-count", "data-empty": () => count.value === 0 }, () => count.value)),
    h("div", { class: "lucid-spacer" }),
    h("div", { class: "ms-rail-foot" },
      ExitCard(),
      h("div", { class: "ms-appearance" }, "Appearance",
        Segmented({
          value: theme, size: "sm", iconOnly: true, aria: { label: "Theme" },
          options: [{ value: "light", label: "Daylight", icon: "sun" }, { value: "dark", label: "Evening", icon: "moon" }, { value: "system", label: "System", icon: "monitor" }]
        }))));
}

function Product() {
  return h("div", { class: "ms-product" },
    h("section", { class: "ms-stage" },
      h("div", { class: "ms-stage-top" }, h("span", "Sofas"), h("span", "/"), h("span", "The Arlo")),
      Sofa(),
      h("div", { class: "ms-stage-foot" },
        h("span", () => S.value.dims),
        h("span", "Seat height 44 cm"),
        h("span", "Kiln-dried oak frame"))),
    h("section", { class: "ms-panel" },
      h("p", { class: "ms-kicker" }, "Made to order in Portugal"),
      h("h1", "The Arlo Sofa"),
      h("div", { class: "ms-rating" }, DotMeter({ value: 96, max: 100, dots: 5, color: "var(--ms-accent)", label: "Rated 4.8 out of 5" }), h("span", "4.8 · 212 reviews")),
      h("p", { class: "ms-price" }, () => money(price.value), h("small", " or $", () => Math.round(price.value / 12), "/mo for 12 months")),
      h("div", { class: "ms-opt" },
        h("div", { class: "ms-opt-head" }, h("b", "Size"), h("span", () => S.value.dims)),
        Segmented({ value: size, aria: { label: "Size" }, options: SIZES.map(s => ({ value: s.value, label: s.label })) })),
      h("div", { class: "ms-opt" },
        h("div", { class: "ms-opt-head" }, h("b", "Fabric"), h("span", () => (M.value.add ? `+${money(M.value.add)}` : "Included"))),
        Segmented({ value: material, aria: { label: "Fabric" }, options: MATERIALS.map(m => ({ value: m.value, label: m.label })) }),
        h("div", { class: "ms-swatches" }, () => COLORS[material.value].map(([name, value]) => Swatch({ name, value, selected: () => color.value === name, onPick: () => { color.value = name; } }))),
        h("p", { class: "ms-note" }, () => `${color.value}. ${M.value.note}.`)),
      h("div", { class: "ms-opt" },
        h("div", { class: "ms-opt-head" }, h("b", "Legs"), h("span", () => (L.value.add ? `+${money(L.value.add)}` : `${L.value.label}, included`))),
        h("div", { class: "ms-swatches" }, LEGS.map(l => Swatch({ name: l.label, value: l.color, selected: () => legs.value === l.value, onPick: () => { legs.value = l.value; } })))),
      h("div", { class: "ms-facts" },
        h("div", h("span", "Ready in"), () => DotMeter({ value: M.value.weeks, max: 10, dots: 10, color: "var(--ms-accent)", label: `${M.value.weeks} weeks to make` }), h("b", () => `${M.value.weeks} weeks`)),
        h("div", h("span", "Durability"), () => DotMeter({ value: M.value.rub, max: 5, dots: 5, color: "var(--ms-accent)", label: `Durability ${M.value.rub} of 5` }), h("b", () => ["", "Light", "Light", "Everyday", "Family-proof", "Heirloom"][M.value.rub]))),
      h("div", { class: "ms-actions" },
        Button({ variant: "primary", size: "lg", class: "ms-add", onClick: addToCart }, () => `Add to bag · ${money(price.value)}`),
        Button({ size: "lg", class: "ms-swatch-btn", onClick: orderSwatch }, "Order a free swatch")),
      h("ul", { class: "ms-perks" },
        h("li", Icon({ name: "check", size: 14 }), "Free white-glove delivery"),
        h("li", Icon({ name: "check", size: 14 }), "100-night trial"),
        h("li", Icon({ name: "check", size: 14 }), "10-year frame warranty"))));
}

function App() {
  return h("div", { class: "ms-app" },
    Rail(),
    h("main", { class: "ms-main" }, Product(),
      h("footer", { class: "ms-foot" }, "Maison is a fictional store. Products and prices are invented for a Lucid UI demo.")),
    Cart());
}

mount(App, "#app");
