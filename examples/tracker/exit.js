import { signal, h, onCleanup } from "/lucid/index.js";
import { Icon } from "/lucid/ui/index.js";

const PICKER = "https://lucidui.dev/#sandbox";
const here = () => location.pathname.split("/").filter(Boolean)[0] ?? "tracker";
const WAIT = 4000;

export function ExitCard({ compact = false } = {}) {
  const state = signal("idle");
  let timer = 0;

  const reset = () => {
    clearTimeout(timer);
    state.value = "idle";
  };

  const press = () => {
    if (state.peek() === "idle") {
      state.value = "confirm";
      clearTimeout(timer);
      timer = setTimeout(reset, WAIT);
      return;
    }
    if (state.peek() === "confirm") {
      clearTimeout(timer);
      state.value = "leaving";
      setTimeout(() => { location.href = `${PICKER}=${here()}`; }, matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 380);
    }
  };

  onCleanup(() => clearTimeout(timer));

  return h("div", { class: "tk-exit", "data-state": state, "data-compact": compact },
    h("div", { class: "tk-exit-copy" },
      h("b", "You're in the sandbox"),
      h("span", { class: "tk-exit-sub" },
        h("span", { class: "tk-exit-sub-idle" }, "A Lucid UI demo. Resets on refresh."),
        h("span", { class: "tk-exit-sub-confirm" }, "Press again to pick another demo."))),
    h("button", {
      type: "button",
      class: "tk-exit-btn",
      aria: { label: () => (state.value === "idle" ? "Leave the sandbox" : "Confirm: leave the sandbox") },
      title: () => (typeof compact === "function" ? compact() : compact) ? (state.value === "idle" ? "Leave the sandbox" : "Press again to leave") : null,
      onClick: press,
      onBlur: () => { if (state.peek() === "confirm") reset(); },
      onKeydown: event => { if (event.key === "Escape" && state.peek() === "confirm") { event.stopPropagation(); reset(); } }
    },
    h("span", { class: "tk-exit-fill", "aria-hidden": "true" }),
    h("span", { class: "tk-exit-idle" }, "Leave the sandbox", Icon({ name: "arrow-right", size: 14 })),
    h("span", { class: "tk-exit-confirm" },
      h("svg", { class: "tk-exit-ring", width: 16, height: 16, viewBox: "0 0 16 16", "aria-hidden": "true" },
        h("circle", { cx: 8, cy: 8, r: 6.5, fill: "none", "stroke-width": 2, class: "tk-exit-ring-track" }),
        h("circle", { cx: 8, cy: 8, r: 6.5, fill: "none", "stroke-width": 2, class: "tk-exit-ring-fill" })),
      h("span", { class: "tk-exit-ask" }, () => (state.value === "leaving" ? "Leaving" : "Sure?")),
      h("span", { class: "tk-exit-go" }, () => (state.value === "leaving" ? "Bye" : "Leave")))));
}

export function ExitDock() {
  const key = `lucid-sandbox:dock:${here()}`;
  let initial = true;
  try { const saved = localStorage.getItem(key); initial = saved ? saved === "open" : !matchMedia("(max-width: 640px)").matches; } catch {}
  const open = signal(initial);
  const toggle = () => {
    open.value = !open.peek();
    try { localStorage.setItem(key, open.peek() ? "open" : "closed"); } catch {}
  };
  return h("div", { class: "tk-dock", "data-open": open },
    h("button", {
      type: "button",
      class: "tk-dock-toggle",
      aria: { expanded: () => String(open.value), label: () => (open.value ? "Hide the sandbox card" : "Show the sandbox card") },
      onClick: toggle
    },
    h("span", { class: "tk-dock-pill" }, h("span", { class: "tk-dock-dot" }), "Sandbox"),
    Icon({ name: "chevron-down", size: 14 })),
    h("div", { class: "tk-dock-card", inert: () => !open.value }, ExitCard()));
}
