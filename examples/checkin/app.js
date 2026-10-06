import { signal, computed, effect, h, mount, onCleanup } from "/lucid/index.js";
import { Button, Segmented, Field, Input, Checkbox, Switch, Tooltip, Icon, Badge, toast, form, required, pattern, hotkey } from "/lucid/ui/index.js";
import { DotMeter } from "/lucid/viz/index.js";
import { ExitCard } from "/exit.js";
import { BOOKING, FLIGHT, PASSENGERS, COLUMNS, ROWS, SPACE_ROWS, EXIT_ROWS, TAKEN, seatKind, seatPrice } from "./data.js";

const stored = key => { try { return localStorage.getItem(`lucid-checkin:${key}`); } catch { return null; } };
const save = (key, value) => { try { localStorage.setItem(`lucid-checkin:${key}`, value); } catch {} };

const theme = signal(stored("theme") ?? "light");
effect(() => {
  save("theme", theme.value);
  if (theme.value === "system") delete document.documentElement.dataset.theme;
  else document.documentElement.dataset.theme = theme.value;
});
const collapsed = signal(stored("collapsed") === "1");
effect(() => save("collapsed", collapsed.value ? "1" : "0"));

const STEPS = [
  { id: "find", label: "Booking" },
  { id: "trip", label: "Trip" },
  { id: "seats", label: "Seats" },
  { id: "bags", label: "Bags" },
  { id: "review", label: "Review" },
  { id: "done", label: "Boarding pass" }
];
const step = signal("find");
const stepIndex = computed(() => STEPS.findIndex(s => s.id === step.value));
const go = id => {
  step.value = id;
  document.querySelector(".ci-main")?.scrollTo({ top: 0, behavior: "smooth" });
  requestAnimationFrame(() => document.querySelector(".ci-view h1")?.focus({ preventScroll: true }));
};

const travelling = signal(new Set(PASSENGERS.map(p => p.id)));
const seats = signal(Object.fromEntries(PASSENGERS.map(p => [p.id, p.seat])));
const activePax = signal(PASSENGERS[0].id);
const bags = signal(Object.fromEntries(PASSENGERS.map(p => [p.id, p.id === "p3" ? 0 : 1])));
const assist = signal(false);
const family = signal(true);
const declared = signal(false);
const checking = signal(false);

const party = computed(() => PASSENGERS.filter(p => travelling.value.has(p.id)));
const initials = p => `${p.first[0]}${p.last[0]}`;
const extraBags = computed(() => party.value.reduce((sum, p) => sum + Math.max(0, bags.value[p.id] - p.allowance), 0));
const seatFees = computed(() => party.value.reduce((sum, p) => sum + (seats.value[p.id] && seats.value[p.id] !== p.seat ? seatPrice(seats.value[p.id]) : 0), 0));
const total = computed(() => seatFees.value + extraBags.value * 100);

function Mark() {
  return h("svg", { class: "ci-mark", width: 30, height: 30, viewBox: "0 0 30 30", "aria-hidden": "true" },
    h("circle", { cx: 15, cy: 15, r: 15, class: "ci-mark-bg" }),
    h("path", { d: "M7 17.5c3.2-5.8 9.4-8.6 16-6.2", class: "ci-mark-a" }),
    h("path", { d: "M8.5 21c4-3.2 8.6-4.2 13.5-2.6", class: "ci-mark-b" }),
    h("circle", { cx: 21.5, cy: 9.6, r: 1.6, class: "ci-mark-dot" }));
}

function Rail() {
  const item = (icon, label, { active, soon } = {}) => Tooltip({ label, placement: "right" },
    h("button", {
      type: "button",
      class: "ci-nav-item",
      "aria-current": active ? "page" : undefined,
      "aria-disabled": soon ? "true" : undefined,
      aria: { label },
      onClick: () => {
        if (active) go("find");
        else toast(soon ? `${label} is coming soon` : `${label} isn't part of this demo`, { icon: soon ? "lock" : "info" });
      }
    },
    Icon({ name: icon, size: 17 }),
    h("span", { class: "ci-nav-label" }, label),
    soon ? h("span", { class: "ci-soon" }, "Soon") : null));
  const cycle = () => { theme.value = { light: "dark", dark: "system", system: "light" }[theme.peek()]; };
  return h("aside", { class: "ci-rail", "data-collapsed": collapsed },
    h("div", { class: "ci-rail-head" },
      h("a", { class: "ci-brand", href: "#", aria: { label: "Celadon Air home" }, onClick: e => { e.preventDefault(); go("find"); } },
        Mark(), h("span", { class: "ci-brand-word" }, h("b", "Celadon"), " Air")),
      Tooltip({ label: () => (collapsed.value ? "Expand menu" : "Collapse menu"), kbd: ["["], placement: "right" },
        Button({
          variant: "ghost", size: "sm", icon: "sidebar", class: "ci-collapse",
          "aria-expanded": () => !collapsed.value,
          aria: { label: () => (collapsed.value ? "Expand menu" : "Collapse menu") },
          onClick: () => { collapsed.value = !collapsed.peek(); }
        }))),
    h("nav", { class: "ci-nav", aria: { label: "Main" } },
      item("check-circle", "Check-in", { active: true }),
      item("calendar", "My trips"),
      item("clock", "Flight status"),
      item("sparkles", "Lounges", { soon: true }),
      item("message", "Help")),
    h("div", { class: "lucid-spacer" }),
    h("div", { class: "ci-rail-foot" },
      ExitCard({ compact: collapsed }),
      () => collapsed.value
        ? Tooltip({ label: `Theme: ${theme.value}`, placement: "right" }, Button({ variant: "ghost", size: "sm", class: "ci-theme-cycle", icon: theme.value === "dark" ? "moon" : theme.value === "light" ? "sun" : "monitor", aria: { label: `Theme: ${theme.value}. Change theme` }, onClick: cycle }))
        : h("div", { class: "ci-appearance" }, "Appearance",
            Segmented({
              value: theme, size: "sm", iconOnly: true, aria: { label: "Theme" },
              options: [{ value: "light", label: "Light", icon: "sun" }, { value: "dark", label: "Dark", icon: "moon" }, { value: "system", label: "System", icon: "monitor" }]
            }))));
}

function Steps() {
  return h("ol", { class: "ci-steps", aria: { label: "Check-in progress" } },
    STEPS.map((s, i) => h("li", {
      class: "ci-step",
      "data-state": () => (i < stepIndex.value ? "done" : i === stepIndex.value ? "current" : "next"),
      "aria-current": () => (i === stepIndex.value ? "step" : undefined)
    },
    h("span", { class: "ci-step-dot" }, () => (i < stepIndex.value ? Icon({ name: "check", size: 11, stroke: 3 }) : null)),
    h("span", { class: "ci-step-label" }, s.label))));
}

function Find() {
  const f = form({
    ref: { value: "", rules: [required("Enter your booking reference"), pattern(/^[A-Za-z0-9]{6}$/, "Booking references are 6 letters and numbers")] },
    last: { value: "", rules: [required("Enter the last name on the booking")] }
  });
  const looking = signal(false);
  const missing = signal(false);
  const scanning = signal(false);
  const submit = f.submit(async values => {
    missing.value = false;
    looking.value = true;
    await new Promise(r => setTimeout(r, 700));
    looking.value = false;
    if (values.ref.toUpperCase() === BOOKING.ref && values.last.trim().toLowerCase() === BOOKING.last.toLowerCase()) go("trip");
    else missing.value = true;
  });
  const fill = () => { f.fields.ref.value.value = BOOKING.ref; f.fields.last.value.value = BOOKING.last; missing.value = false; };
  const scan = async () => {
    scanning.value = true;
    await new Promise(r => setTimeout(r, 1300));
    scanning.value = false;
    fill();
    toast("Passport read", { tone: "success", description: "Jiwoo Park · booking CE7K2Q found" });
    setTimeout(() => go("trip"), 500);
  };
  return h("section", { class: "ci-view ci-find" },
    h("div", { class: "ci-hero" },
      h("p", { class: "ci-kicker" }, "Online check-in"),
      h("h1", { tabindex: -1 }, "Welcome. Let's get you on your way."),
      h("p", { class: "ci-lede" }, "Check in from 48 hours to 1 hour before departure. It takes about two minutes.")),
    h("form", { class: "ci-card ci-find-card", onSubmit: submit, novalidate: true },
      h("div", { class: "ci-find-fields" },
        Field({ label: "Booking reference", field: f.fields.ref, hint: "6 characters, on your e-ticket" },
          Input({ bind: f.fields.ref.value, class: "ci-ref", placeholder: "e.g. CE7K2Q", autocomplete: "off", maxlength: 6, spellcheck: false })),
        Field({ label: "Last name", field: f.fields.last },
          Input({ bind: f.fields.last.value, placeholder: "As on your passport", autocomplete: "family-name" }))),
      () => (missing.value ? h("div", { class: "ci-note", "data-tone": "warn", role: "alert" }, Icon({ name: "info", size: 15 }), "We couldn't find that booking. Check the reference and last name, or use the demo booking below.") : null),
      h("div", { class: "ci-find-actions" },
        Button({ type: "submit", variant: "primary", size: "lg", loading: looking, iconRight: "arrow-right" }, "Find my booking"),
        h("span", { class: "ci-or" }, "or"),
        Button({ size: "lg", icon: "image", loading: scanning, onClick: scan }, () => (scanning.value ? "Reading passport" : "Scan passport")))),
    h("button", { type: "button", class: "ci-demo", onClick: fill },
      h("span", "Demo booking"), h("code", BOOKING.ref), h("span", "·"), h("code", BOOKING.last), h("b", "Fill in")),
    h("ul", { class: "ci-perks" },
      h("li", Icon({ name: "clock", size: 16 }), h("div", h("b", "Bag drop opens 3 hours before"), h("span", "Counters H01–H12, Terminal 2"))),
      h("li", Icon({ name: "users", size: 16 }), h("div", h("b", "Travelling together"), h("span", "Check in everyone on the booking at once"))),
      h("li", Icon({ name: "check-circle", size: 16 }), h("div", h("b", "Your pass, anywhere"), h("span", "Save to your phone or print at the kiosk")))));
}

function Route() {
  const N = 23;
  const at = t => [20 + t * 360, 70 - Math.sin(t * Math.PI) * 52];
  const dots = Array.from({ length: N }, (_, i) => {
    const [x, y] = at(i / (N - 1));
    const end = i === 0 || i === N - 1;
    return h("circle", { cx: x, cy: y, r: end ? 4.5 : 2, class: end ? "ci-route-end" : "ci-route-dot" });
  });
  const plane = h("g", { class: "ci-plane" },
    h("path", { d: "M-9 -1.2 L-3 -1.2 L2.5 -7 L5 -7 L2 -1.2 L7.5 -1.2 C9.5 -1.2 10.5 -.5 10.5 0 C10.5 .5 9.5 1.2 7.5 1.2 L2 1.2 L5 7 L2.5 7 L-3 1.2 L-9 1.2 L-10.5 3.6 L-12 3.6 L-11 0 L-12 -3.6 L-10.5 -3.6 Z" }));
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const FLY = 5200;
  const REST = 900;
  const ease = t => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
  const place = t => {
    const [x, y] = at(t);
    const angle = Math.atan2(-52 * Math.PI * Math.cos(t * Math.PI), 360) * (180 / Math.PI);
    const fade = Math.min(1, t / 0.06, (1 - t) / 0.06);
    plane.setAttribute("transform", `translate(${x.toFixed(2)} ${y.toFixed(2)}) rotate(${angle.toFixed(2)})`);
    plane.style.opacity = String(Math.max(0, fade));
    dots.forEach((d, i) => d.toggleAttribute("data-lit", i / (N - 1) <= t));
  };
  let frame = 0;
  let start = performance.now();
  const loop = now => {
    const elapsed = (now - start) % (FLY + REST);
    place(elapsed < FLY ? ease(elapsed / FLY) : 1);
    frame = requestAnimationFrame(loop);
  };
  if (reduced) place(0.5);
  else frame = requestAnimationFrame(loop);
  onCleanup(() => cancelAnimationFrame(frame));
  return h("svg", { class: "ci-route", viewBox: "0 0 400 86", "aria-hidden": "true" }, dots, plane);
}

function FlightCard() {
  const stat = (label, value) => h("div", { class: "ci-stat" }, h("span", label), h("b", value));
  return h("section", { class: "ci-card ci-flight" },
    h("div", { class: "ci-flight-top" },
      h("span", { class: "ci-flight-no" }, FLIGHT.number), h("span", FLIGHT.date),
      h("span", { class: "lucid-spacer" }),
      h("span", { class: "ci-status" }, h("i"), FLIGHT.status)),
    h("div", { class: "ci-flight-route" },
      h("div", { class: "ci-port" }, h("b", FLIGHT.from.code), h("span", FLIGHT.from.city), h("strong", FLIGHT.depart)),
      h("div", { class: "ci-flight-mid" }, Route(), h("span", FLIGHT.duration, " · nonstop")),
      h("div", { class: "ci-port ci-port-to" }, h("b", FLIGHT.to.code), h("span", FLIGHT.to.city), h("strong", FLIGHT.arrive))),
    h("div", { class: "ci-flight-stats" },
      stat("Terminal", FLIGHT.from.terminal), stat("Gate", FLIGHT.gate), stat("Boarding", FLIGHT.boarding), stat("Aircraft", "777-300ER")));
}

function Trip() {
  const toggle = id => {
    const next = new Set(travelling.peek());
    next.has(id) ? next.delete(id) : next.add(id);
    travelling.value = next;
  };
  return h("section", { class: "ci-view" },
    h("div", { class: "ci-hero" },
      h("p", { class: "ci-kicker" }, `Booking ${BOOKING.ref}`),
      h("h1", { tabindex: -1 }, "Seoul to Los Angeles"),
      h("p", { class: "ci-lede" }, "Choose who's checking in today.")),
    FlightCard(),
    h("section", { class: "ci-card ci-pax" },
      h("header", { class: "ci-card-head" }, h("h2", "Passengers"), h("span", { class: "ci-muted" }, () => `${party.value.length} of ${PASSENGERS.length} selected`)),
      h("ul", { class: "ci-pax-list" }, PASSENGERS.map(p => h("li",
        Checkbox({ checked: () => travelling.value.has(p.id), onChange: () => toggle(p.id), aria: { label: `Check in ${p.first} ${p.last}` } }),
        h("span", { class: "ci-avatar" }, initials(p)),
        h("div", { class: "ci-pax-who" }, h("b", `${p.first} ${p.last}`), h("span", p.type)),
        p.tier ? Badge({ class: "ci-tier" }, p.tier) : null,
        h("span", { class: "ci-pax-seat" }, p.seat ? `Seat ${p.seat}` : "No seat yet"))))),
    h("div", { class: "ci-actions" },
      Button({ variant: "ghost", icon: "chevron-left", onClick: () => go("find") }, "Back"),
      h("span", { class: "lucid-spacer" }),
      Button({ variant: "primary", size: "lg", iconRight: "arrow-right", disabled: () => party.value.length === 0, onClick: () => { activePax.value = party.peek()[0].id; go("seats"); } }, "Choose seats")));
}

function SeatMap() {
  const LETTERS = [...COLUMNS].reverse();
  const cols = COLUMNS.filter(Boolean);
  const owner = computed(() => {
    const map = new Map();
    for (const p of party.value) if (seats.value[p.id]) map.set(seats.value[p.id], p);
    return map;
  });
  const cursor = signal(seats.peek()[activePax.peek()] ?? "32D");
  const refs = new Map();
  const choose = id => {
    if (TAKEN.has(id)) return;
    const holder = owner.peek().get(id);
    if (holder && holder.id !== activePax.peek()) {
      toast(`${id} is ${holder.first}'s seat`, { description: "Pick a different seat, or select them to move it." });
      return;
    }
    seats.value = { ...seats.peek(), [activePax.peek()]: id };
    const next = party.peek().find(p => !seats.peek()[p.id]);
    if (next) activePax.value = next.id;
  };
  const keys = event => {
    const [, r, c] = cursor.peek().match(/(\d+)(\w)/);
    let row = Number(r);
    let ci = cols.indexOf(c);
    if (event.key === "ArrowRight") row = Math.min(ROWS.at(-1), row + 1);
    else if (event.key === "ArrowLeft") row = Math.max(ROWS[0], row - 1);
    else if (event.key === "ArrowUp") ci = Math.min(cols.length - 1, ci + 1);
    else if (event.key === "ArrowDown") ci = Math.max(0, ci - 1);
    else return;
    event.preventDefault();
    cursor.value = `${row}${cols[ci]}`;
    refs.get(cursor.peek())?.focus();
  };
  const seat = (id, gridRow, gridColumn) => {
    const taken = TAKEN.has(id);
    return h("button", {
      type: "button",
      class: "ci-seat",
      style: { gridRow: String(gridRow), gridColumn: String(gridColumn) },
      ref: el => refs.set(id, el),
      tabindex: () => (cursor.value === id ? 0 : -1),
      "data-state": () => {
        if (taken) return "taken";
        const holder = owner.value.get(id);
        if (!holder) return "free";
        return holder.id === activePax.value ? "mine" : "party";
      },
      "aria-disabled": taken ? "true" : undefined,
      aria: { label: () => {
        const holder = owner.value.get(id);
        const price = seatPrice(id);
        return `Seat ${id}, ${seatKind(id).toLowerCase()}${taken ? ", taken" : holder ? `, ${holder.first}'s seat` : ", available"}${price && !taken ? `, ${price} dollars` : ""}`;
      } },
      onFocus: () => { cursor.value = id; },
      onClick: () => choose(id)
    }, () => {
      const holder = owner.value.get(id);
      return holder ? initials(holder) : null;
    });
  };
  const spaceCols = ROWS.filter(r => SPACE_ROWS.has(r)).length;
  const exitIndex = ROWS.findIndex(r => EXIT_ROWS.has(r));
  return h("div", { class: "ci-fuselage" },
    h("div", { class: "ci-nose", "aria-hidden": "true" }, h("span", "Front")),
    h("div", {
      class: "ci-cabin",
      role: "group",
      style: { "--rows": ROWS.length, gridTemplateRows: `18px ${LETTERS.map(l => (l ? "30px" : "10px")).join(" ")}` },
      aria: { label: "Seat map, rows 28 to 47, front of the plane on the left. Arrow keys move, Enter chooses." },
      onKeydown: keys
    },
    h("i", { class: "ci-zone ci-zone-space", style: { gridColumn: `2 / span ${spaceCols}` }, "aria-hidden": "true" }),
    h("i", { class: "ci-zone ci-zone-exit", style: { gridColumn: `${exitIndex + 2} / span 1` }, "aria-hidden": "true" }),
    ROWS.map((row, ri) => h("span", { class: "ci-rownum", "aria-hidden": "true", style: { gridRow: "1", gridColumn: String(ri + 2) } }, String(row))),
    LETTERS.flatMap((letter, li) => letter
      ? [h("span", { class: "ci-letter", "aria-hidden": "true", style: { gridRow: String(li + 2), gridColumn: "1" } }, letter), ...ROWS.map((row, ri) => seat(`${row}${letter}`, li + 2, ri + 2))]
      : [])),
    h("div", { class: "ci-tail", "aria-hidden": "true" }));
}

function Seats() {
  const current = computed(() => PASSENGERS.find(p => p.id === activePax.value));
  const seat = computed(() => seats.value[activePax.value]);
  return h("section", { class: "ci-view ci-view-tight" },
    h("div", { class: "ci-hero ci-hero-row" },
      h("div", h("p", { class: "ci-kicker" }, "Seats"), h("h1", { tabindex: -1 }, "Pick where you'd like to sit")),
      h("p", { class: "ci-lede" }, "Front of the plane is on the left. Economy Space rows have 7 inches more legroom.")),
    h("div", { class: "ci-card ci-cabin-card" }, SeatMap()),
    h("div", { class: "ci-card ci-seat-bar" },
      h("div", { class: "ci-seat-bar-who", role: "group", aria: { label: "Choosing a seat for" } },
        () => party.value.map(p => h("button", {
          type: "button",
          class: "ci-who-chip",
          "aria-pressed": () => activePax.value === p.id,
          onClick: () => { activePax.value = p.id; }
        },
        h("span", { class: "ci-avatar" }, initials(p)),
        h("span", { class: "ci-who-copy" }, h("b", p.first), h("span", () => seats.value[p.id] ?? "No seat"))))),
      h("div", { class: "ci-seat-now", "aria-live": "polite" }, () => {
        const id = seat.value;
        if (!id) return h("span", { class: "ci-muted" }, `Choose a seat for ${current.value.first}`);
        const row = Number(id.match(/\d+/)[0]);
        const price = current.value.seat === id ? 0 : seatPrice(id);
        return [
          h("b", { class: "ci-seat-id" }, id),
          h("span", `${seatKind(id)}${SPACE_ROWS.has(row) ? " · Economy Space" : EXIT_ROWS.has(row) ? " · Exit row" : ""}`),
          h("span", { class: "ci-price" }, price ? `+$${price}` : "Included")
        ];
      }),
      h("ul", { class: "ci-legend" },
        h("li", h("i", { "data-k": "free" }), "Open"),
        h("li", h("i", { "data-k": "mine" }), "Selected"),
        h("li", h("i", { "data-k": "party" }), "Your party"),
        h("li", h("i", { "data-k": "taken" }), "Taken"))),
    h("div", { class: "ci-actions" },
      Button({ variant: "ghost", icon: "chevron-left", onClick: () => go("trip") }, "Back"),
      h("span", { class: "lucid-spacer" }),
      h("span", { class: "ci-muted" }, () => (seatFees.value ? `Seat upgrades +$${seatFees.value}` : "")),
      Button({ variant: "primary", size: "lg", iconRight: "arrow-right", disabled: () => party.value.some(p => !seats.value[p.id]), onClick: () => go("bags") }, "Continue to bags")));
}

function Bags() {
  const set = (id, n) => { bags.value = { ...bags.peek(), [id]: Math.max(0, Math.min(4, n)) }; };
  return h("section", { class: "ci-view" },
    h("div", { class: "ci-hero" },
      h("p", { class: "ci-kicker" }, "Bags"),
      h("h1", { tabindex: -1 }, "How many bags are you checking?"),
      h("p", { class: "ci-lede" }, "Up to 23 kg each. Extra bags are $100 each, paid now or at the counter.")),
    h("section", { class: "ci-card" },
      h("ul", { class: "ci-bags" }, () => party.value.map(p => h("li",
        h("span", { class: "ci-avatar" }, initials(p)),
        h("div", { class: "ci-pax-who" }, h("b", `${p.first} ${p.last}`), h("span", `${p.allowance} bag${p.allowance > 1 ? "s" : ""} included`)),
        h("div", { class: "ci-bag-dots" }, () => DotMeter({ value: Math.min(bags.value[p.id], 4), max: 4, dots: 4, color: bags.value[p.id] > p.allowance ? "#e59a52" : "var(--ci-sky)", label: `${bags.value[p.id]} bags` })),
        h("div", { class: "ci-stepper" },
          Button({ size: "sm", class: "ci-step-btn", aria: { label: `One fewer bag for ${p.first}` }, disabled: () => bags.value[p.id] === 0, onClick: () => set(p.id, bags.peek()[p.id] - 1) }, "−"),
          h("output", { "aria-live": "polite" }, () => bags.value[p.id]),
          Button({ size: "sm", class: "ci-step-btn", aria: { label: `One more bag for ${p.first}` }, disabled: () => bags.value[p.id] === 4, onClick: () => set(p.id, bags.peek()[p.id] + 1) }, "+")))))),
    h("section", { class: "ci-card ci-assist" },
      h("header", { class: "ci-card-head" }, h("h2", "A little help"), h("span", { class: "ci-muted" }, "We'll let the airport team know")),
      Switch({ label: "Wheelchair or assistance at the airport", checked: assist, onChange: e => { assist.value = e.target.checked; } }),
      Switch({ label: "Family boarding (travelling with a child)", checked: family, onChange: e => { family.value = e.target.checked; } })),
    h("div", { class: "ci-actions" },
      Button({ variant: "ghost", icon: "chevron-left", onClick: () => go("seats") }, "Back"),
      h("span", { class: "lucid-spacer" }),
      h("span", { class: "ci-muted" }, () => (extraBags.value ? `${extraBags.value} extra bag${extraBags.value > 1 ? "s" : ""} +$${extraBags.value * 100}` : "")),
      Button({ variant: "primary", size: "lg", iconRight: "arrow-right", onClick: () => go("review") }, "Review")));
}

function Review() {
  const finish = async () => {
    checking.value = true;
    await new Promise(r => setTimeout(r, 1200));
    checking.value = false;
    go("done");
  };
  return h("section", { class: "ci-view" },
    h("div", { class: "ci-hero" },
      h("p", { class: "ci-kicker" }, "Review"),
      h("h1", { tabindex: -1 }, "Everything look right?")),
    h("section", { class: "ci-card" },
      h("ul", { class: "ci-review" }, () => party.value.map(p => h("li",
        h("span", { class: "ci-avatar" }, initials(p)),
        h("div", { class: "ci-pax-who" }, h("b", `${p.first} ${p.last}`), h("span", p.type)),
        h("div", { class: "ci-review-cell" }, h("span", "Seat"), h("b", seats.value[p.id])),
        h("div", { class: "ci-review-cell" }, h("span", "Bags"), h("b", String(bags.value[p.id])))))),
      h("div", { class: "ci-total" }, h("span", "To pay today"), h("b", () => (total.value ? `$${total.value}` : "Nothing")))),
    h("section", { class: "ci-card ci-declare" },
      h("header", { class: "ci-card-head" }, h("h2", "Before you fly")),
      h("p", { class: "ci-muted" }, "Some items can't go in your bags: spare lithium batteries in checked luggage, flammable liquids, gas canisters, fireworks and corrosives."),
      Checkbox({ checked: declared, onChange: e => { declared.value = e.target.checked; } }, "I confirm my bags don't contain dangerous goods")),
    h("div", { class: "ci-actions" },
      Button({ variant: "ghost", icon: "chevron-left", onClick: () => go("bags") }, "Back"),
      h("span", { class: "lucid-spacer" }),
      Button({ variant: "primary", size: "lg", icon: "check", loading: checking, disabled: () => !declared.value, onClick: finish }, () => `Check in ${party.value.length} passenger${party.value.length > 1 ? "s" : ""}`)));
}

function Code({ text }) {
  let seed = [...text].reduce((s, c) => s * 31 + c.charCodeAt(0), 7) >>> 0;
  const next = () => (seed = (seed * 1103515245 + 12345) >>> 0) / 4294967296;
  const N = 21;
  const finder = (r, c) => [[0, 0], [0, N - 7], [N - 7, 0]].some(([fr, fc]) => r >= fr && r < fr + 7 && c >= fc && c < fc + 7);
  const ring = (r, c) => [[0, 0], [0, N - 7], [N - 7, 0]].some(([fr, fc]) => {
    const y = r - fr, x = c - fc;
    return y >= 0 && y < 7 && x >= 0 && x < 7 && (y === 0 || y === 6 || x === 0 || x === 6 || (y >= 2 && y <= 4 && x >= 2 && x <= 4));
  });
  const dots = [];
  for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
    const on = finder(r, c) ? ring(r, c) : next() > 0.52;
    if (on) dots.push(h("circle", { cx: c * 6 + 3, cy: r * 6 + 3, r: finder(r, c) ? 2.6 : 2.3, style: { "--i": r + c } }));
  }
  return h("svg", { class: "ci-code", viewBox: `0 0 ${N * 6} ${N * 6}`, role: "img", aria: { label: "Boarding pass code" } }, dots);
}

function Done() {
  const viewing = signal(party.peek()[0].id);
  const groupOf = p => (family.peek() && party.peek().some(x => x.type.startsWith("Child")) ? "Family" : p.tier ? "2" : "4");
  return h("section", { class: "ci-view ci-done" },
    h("div", { class: "ci-hero" },
      h("div", { class: "ci-success" }, Icon({ name: "check", size: 22, stroke: 2.5 })),
      h("p", { class: "ci-kicker" }, "Checked in"),
      h("h1", { tabindex: -1 }, "You're all set. Have a lovely flight."),
      h("p", { class: "ci-lede" }, `Boarding starts at ${FLIGHT.boarding} from gate ${FLIGHT.gate}. Drop your bags at counters H01–H12 by 13:40.`)),
    party.peek().length > 1 ? Segmented({ value: viewing, class: "ci-pass-switch", aria: { label: "Boarding pass for" }, options: party.peek().map(p => ({ value: p.id, label: p.first })) }) : null,
    () => {
      const p = PASSENGERS.find(x => x.id === viewing.value);
      const seat = seats.peek()[p.id];
      return h("article", { class: "ci-pass", aria: { label: `Boarding pass for ${p.first} ${p.last}` } },
        h("div", { class: "ci-pass-top" },
          h("div", { class: "ci-pass-brand" }, Mark(), h("span", h("b", "Celadon"), " Air")),
          h("span", { class: "ci-pass-class" }, "Economy")),
        h("div", { class: "ci-pass-route" },
          h("div", h("b", FLIGHT.from.code), h("span", FLIGHT.from.city)),
          h("div", { class: "ci-pass-mid" }, h("span", FLIGHT.number), h("i"), h("span", FLIGHT.date)),
          h("div", { class: "ci-pass-to" }, h("b", FLIGHT.to.code), h("span", FLIGHT.to.city))),
        h("div", { class: "ci-pass-grid" },
          h("div", h("span", "Passenger"), h("b", `${p.last.toUpperCase()} / ${p.first.toUpperCase()}`)),
          h("div", h("span", "Seat"), h("b", seat)),
          h("div", h("span", "Gate"), h("b", FLIGHT.gate)),
          h("div", h("span", "Boarding"), h("b", FLIGHT.boarding)),
          h("div", h("span", "Group"), h("b", groupOf(p))),
          h("div", h("span", "Departs"), h("b", FLIGHT.depart))),
        h("div", { class: "ci-pass-tear", "aria-hidden": "true" }),
        h("div", { class: "ci-pass-foot" },
          Code({ text: `${BOOKING.ref}${p.id}${seat}` }),
          h("div", { class: "ci-pass-meta" },
            h("span", "Booking"), h("b", BOOKING.ref),
            h("span", "Sequence"), h("b", `00${PASSENGERS.indexOf(p) + 41}`))));
    },
    h("div", { class: "ci-done-actions" },
      Button({ variant: "primary", size: "lg", icon: "download", onClick: () => toast("Added to your phone's wallet", { tone: "success", description: "Passes update if your gate changes." }) }, "Add to wallet"),
      Button({ size: "lg", icon: "message", onClick: () => toast("Boarding passes sent", { tone: "success", description: "To the email on booking CE7K2Q." }) }, "Email passes"),
      Button({ size: "lg", variant: "ghost", onClick: () => {
        declared.value = false;
        seats.value = Object.fromEntries(PASSENGERS.map(x => [x.id, x.seat]));
        go("find");
      } }, "Start again")));
}

const VIEWS = { find: Find, trip: Trip, seats: Seats, bags: Bags, review: Review, done: Done };

function App() {
  hotkey("[", () => { collapsed.value = !collapsed.peek(); });
  return h("div", { class: "ci-app", "data-collapsed": collapsed },
    Rail(),
    h("main", { class: "ci-main" },
      h("header", { class: "ci-top" },
        Steps(),
        h("div", { class: "ci-top-right" },
          h("span", { class: "ci-flight-chip" }, h("b", FLIGHT.number), `${FLIGHT.from.code} → ${FLIGHT.to.code}`),
          Tooltip({ label: "Language" }, Button({ variant: "ghost", size: "sm", aria: { label: "Language: English" }, onClick: () => toast("한국어 is coming soon", { icon: "message" }) }, "EN")))),
      h("div", { class: "ci-stage" }, () => VIEWS[step.value]()),
      h("footer", { class: "ci-foot" }, "Celadon Air is a fictional airline. Flights, bookings and people here are invented for a Lucid UI demo.")));
}

mount(App, "#app");
