import { signal, read } from "../reactive.js";
import { h } from "../dom.js";
import { Icon } from "./icons.js";
import { Button, attachPopover } from "./components.js";

const DAY = 86400000;

export const startOfDay = time => {
  const date = new Date(time);
  date.setHours(0, 0, 0, 0);
  return date.getTime();
};

export const addDays = (time, days) => {
  const date = new Date(time);
  date.setDate(date.getDate() + days);
  return startOfDay(date);
};

const sameDay = (a, b) => a != null && b != null && startOfDay(a) === startOfDay(b);

const short = new Intl.DateTimeFormat("en", { month: "short", day: "numeric" });
const withYear = new Intl.DateTimeFormat("en", { month: "short", day: "numeric", year: "numeric" });
const weekday = new Intl.DateTimeFormat("en", { weekday: "short", month: "short", day: "numeric" });
const monthTitle = new Intl.DateTimeFormat("en", { month: "long", year: "numeric" });
const full = new Intl.DateTimeFormat("en", { weekday: "long", month: "long", day: "numeric", year: "numeric" });

export function formatDate(time, { relative = true } = {}) {
  if (time == null) return "";
  const diff = Math.round((startOfDay(time) - startOfDay(Date.now())) / DAY);
  if (relative && diff === 0) return "Today";
  if (relative && diff === 1) return "Tomorrow";
  if (relative && diff === -1) return "Yesterday";
  return new Date(time).getFullYear() === new Date().getFullYear() ? short.format(time) : withYear.format(time);
}

export function datePresets() {
  const today = startOfDay(Date.now());
  const monday = (new Date(today).getDay() + 6) % 7;
  const end = new Date(today);
  end.setMonth(end.getMonth() + 1, 0);
  return [
    { label: "Today", value: today },
    { label: "Tomorrow", value: addDays(today, 1) },
    { label: "Next week", value: addDays(today, 7 - monday) },
    { label: "In two weeks", value: addDays(today, 14) },
    { label: "End of month", value: startOfDay(end) }
  ];
}

const WEEKDAYS = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];

export function DatePicker({
  value, placeholder = "Set date", presets = datePresets, min, max, size = "sm", variant = "secondary",
  icon = "calendar", clearable = true, aria, onChange, class: cls
} = {}) {
  const today = () => startOfDay(Date.now());
  const start = startOfDay(value.peek() ?? Date.now());
  const view = signal({ y: new Date(start).getFullYear(), m: new Date(start).getMonth() });
  const focused = signal(start);
  let direction = 0;

  const blocked = time => (min != null && time < startOfDay(read(min))) || (max != null && time > startOfDay(read(max)));

  const trigger = Button({ variant, size, icon, class: ["lucid-date-trigger", cls], aria },
    () => (value.value == null
      ? h("span", { class: "lucid-select-placeholder" }, placeholder)
      : h("span", formatDate(value.value))));

  let panel;
  const choose = time => {
    value.value = time;
    onChange?.(time);
    panel.hidePopover();
  };

  const show = time => {
    const date = new Date(time);
    const current = view.peek();
    const next = { y: date.getFullYear(), m: date.getMonth() };
    if (next.y !== current.y || next.m !== current.m) {
      direction = next.y * 12 + next.m > current.y * 12 + current.m ? 1 : -1;
      view.value = next;
    }
    focused.value = time;
  };

  const shiftMonth = step => {
    const current = view.peek();
    const target = new Date(current.y, current.m + step, 1);
    const days = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate();
    show(new Date(target.getFullYear(), target.getMonth(), Math.min(new Date(focused.peek()).getDate(), days)).getTime());
  };

  const focusDay = () => panel.querySelector(".lucid-cal-day[tabindex='0']")?.focus({ preventScroll: true });

  const onKeydown = event => {
    const time = focused.peek();
    const dow = (new Date(time).getDay() + 6) % 7;
    const moves = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7, Home: -dow, End: 6 - dow };
    if (event.key in moves) show(addDays(time, moves[event.key]));
    else if (event.key === "PageUp") shiftMonth(event.shiftKey ? -12 : -1);
    else if (event.key === "PageDown") shiftMonth(event.shiftKey ? 12 : 1);
    else return;
    event.preventDefault();
    focusDay();
  };

  const grid = () => {
    const { y, m } = view.value;
    const offset = (new Date(y, m, 1).getDay() + 6) % 7;
    const rows = [];
    for (let week = 0; week < 6; week++) {
      const cells = [];
      for (let day = 0; day < 7; day++) {
        const date = new Date(y, m, 1 - offset + week * 7 + day);
        const time = date.getTime();
        cells.push(h("button", {
          type: "button",
          class: "lucid-cal-day",
          role: "gridcell",
          tabindex: () => (focused.value === time ? 0 : -1),
          "data-outside": date.getMonth() !== m,
          "data-today": sameDay(time, today()),
          "aria-pressed": () => sameDay(value.value, time),
          disabled: blocked(time),
          aria: { label: full.format(date) },
          onFocus: () => { if (focused.peek() !== time) focused.value = time; },
          onClick: () => choose(time)
        }, String(date.getDate())));
      }
      rows.push(h("div", { class: "lucid-cal-row", role: "row" }, cells));
    }
    const dir = direction;
    direction = 0;
    return h("div", { class: "lucid-cal-grid", role: "grid", "data-dir": dir, aria: { label: monthTitle.format(new Date(y, m, 1)) }, onKeydown }, rows);
  };

  panel = h("div", { class: "lucid-pop lucid-date", popover: "auto" },
    h("div", { class: "lucid-date-presets" },
      presets().map(preset => h("button", {
        type: "button",
        class: "lucid-item",
        "aria-pressed": () => sameDay(value.value, preset.value),
        onClick: () => choose(preset.value)
      },
      h("span", { class: "lucid-item-label" }, preset.label),
      h("span", { class: "lucid-item-hint" }, weekday.format(preset.value).split(",")[0]))),
      clearable ? () => (value.value == null ? null : [
        h("div", { class: "lucid-menu-sep" }),
        h("button", { type: "button", class: "lucid-item", onClick: () => choose(null) },
          Icon({ name: "x", size: 14 }), h("span", { class: "lucid-item-label" }, "Remove date"))
      ]) : null),
    h("div", { class: "lucid-cal" },
      h("div", { class: "lucid-cal-head" },
        h("div", { class: "lucid-cal-title", aria: { live: "polite" } }, () => monthTitle.format(new Date(view.value.y, view.value.m, 1))),
        Button({ variant: "ghost", size: "xs", icon: "chevron-left", aria: { label: "Previous month" }, onClick: () => shiftMonth(-1) }),
        Button({ variant: "ghost", size: "xs", icon: "chevron-right", aria: { label: "Next month" }, onClick: () => shiftMonth(1) })),
      h("div", { class: "lucid-cal-weekdays", "aria-hidden": "true" }, WEEKDAYS.map(name => h("span", name))),
      grid));

  attachPopover(trigger, panel, {
    onOpen: () => {
      direction = 0;
      show(startOfDay(value.peek() ?? Date.now()));
      focusDay();
    }
  });
  return [trigger, panel];
}
