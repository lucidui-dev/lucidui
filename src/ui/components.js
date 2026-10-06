import { signal, computed, effect, untrack, isSignal, read, getOwner, onCleanup } from "../reactive.js";
import { h, For } from "../dom.js";
import { Icon } from "./icons.js";
import { follow, place } from "./floating.js";

let uid = 0;
const nextId = prefix => `lucid-${prefix}-${++uid}`;

const isPlainObject = value =>
  value !== null && typeof value === "object" && Object.getPrototypeOf(value) === Object.prototype;

const parts = args => (isPlainObject(args[0]) ? [args[0], args.slice(1)] : [{}, args]);

const space = value => (value == null ? undefined : typeof value === "number" ? `var(--lucid-space-${value})` : value);

const later = fn => {
  if (getOwner()) onCleanup(fn);
};

const write = (target, value) => {
  if (isSignal(target) && Object.getOwnPropertyDescriptor(Object.getPrototypeOf(target), "value")?.set) target.value = value;
};

export const isMac = typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent);

export function Stack(...args) {
  const [{ gap, align, justify, as = "div", class: cls, style, ...rest }, children] = parts(args);
  return h(as, { class: ["lucid-stack", cls], style: { "--gap": space(gap), alignItems: align, justifyContent: justify, ...style }, ...rest }, children);
}

export function Row(...args) {
  const [{ gap, align, justify, wrap, as = "div", class: cls, style, ...rest }, children] = parts(args);
  return h(as, { class: ["lucid-row", cls], "data-wrap": wrap, style: { "--gap": space(gap), "--align": align, justifyContent: justify, ...style }, ...rest }, children);
}

export function Grid(...args) {
  const [{ gap, min, columns, as = "div", class: cls, style, ...rest }, children] = parts(args);
  const cols = typeof columns === "number" ? `repeat(${columns}, minmax(0, 1fr))` : columns;
  return h(as, { class: ["lucid-grid", cls], style: { "--gap": space(gap), "--min": typeof min === "number" ? `${min}px` : min, "--cols": cols, ...style }, ...rest }, children);
}

export const Spacer = () => h("div", { class: "lucid-spacer" });

export const Divider = ({ vertical } = {}) => h("hr", { class: "lucid-divider", "data-vertical": vertical, "aria-hidden": "true" });

const headingSizes = { 1: "xl", 2: "lg", 3: "md", 4: "sm", 5: "xs", 6: "xs" };

export function Heading(...args) {
  const [{ level = 2, size, class: cls, ...rest }, children] = parts(args);
  return h(`h${level}`, { class: ["lucid-heading", cls], "data-size": size ?? headingSizes[level], ...rest }, children);
}

export function Text(...args) {
  const [{ as = "p", tone, size, weight, mono, truncate, class: cls, ...rest }, children] = parts(args);
  return h(as, { class: ["lucid-text", cls], "data-tone": tone, "data-size": size, "data-weight": weight, "data-mono": mono, "data-truncate": truncate, ...rest }, children);
}

const keyLabels = { mod: isMac ? "⌘" : "Ctrl", shift: "⇧", alt: isMac ? "⌥" : "Alt", enter: "↵", escape: "esc", up: "↑", down: "↓", left: "←", right: "→" };

export function Kbd(...keys) {
  const list = keys.flat().filter(Boolean);
  const one = key => h("kbd", { class: "lucid-kbd" }, keyLabels[String(key).toLowerCase()] ?? key);
  return list.length === 1 ? one(list[0]) : h("span", { class: "lucid-kbds" }, list.map(one));
}

export function Button(...args) {
  const [{ variant = "secondary", size = "md", icon, iconRight, kbd, loading, type = "button", class: cls, ...rest }, children] = parts(args);
  const iconSize = size === "xs" || size === "sm" ? 14 : 16;
  const link = rest.href != null;
  return h(link ? "a" : "button", {
    type: link ? undefined : type,
    class: ["lucid-btn", cls],
    "data-variant": variant,
    "data-size": size,
    "data-icon-only": icon && children.length === 0,
    "data-loading": loading,
    ...rest
  },
  typeof icon === "string" ? Icon({ name: icon, size: iconSize }) : icon,
  children,
  typeof iconRight === "string" ? Icon({ name: iconRight, size: iconSize }) : iconRight,
  kbd ? Kbd(kbd) : null);
}

export function Input(...args) {
  const [{ icon, size, variant, kbd, class: cls, style, ref, ...props }] = parts(args);
  let input;
  const wrapper = h("div", {
    class: ["lucid-input", cls],
    "data-size": size,
    "data-variant": variant,
    style,
    onPointerdown: event => {
      if (event.target !== input) {
        event.preventDefault();
        input.focus();
      }
    }
  },
  typeof icon === "string" ? Icon({ name: icon, size: 15 }) : icon,
  h("input", { type: "text", ...props, ref: el => { input = el; ref?.(el); } }),
  kbd ? Kbd(kbd) : null);
  return wrapper;
}

export function Textarea(...args) {
  const [{ variant, class: cls, rows = 3, ...props }] = parts(args);
  return h("textarea", { class: ["lucid-textarea", cls], "data-variant": variant, rows, ...props });
}

export function Field(...args) {
  const [{ label, hint, error, field, class: cls }, children] = parts(args);
  const id = nextId("field");
  const control = children.flat().find(child => child instanceof Element);
  const target = control?.matches("input, textarea, button") ? control : control?.querySelector("input, textarea, button");
  if (target && !target.id) target.id = id;
  const problem = field ? field.error : error;
  const errorId = `${id}-error`;
  const hintId = `${id}-hint`;
  if (field && target) field.element = target;
  if (target && problem) {
    effect(() => {
      const message = read(problem);
      target.setAttribute("aria-invalid", message ? "true" : "false");
      const described = [message ? errorId : null, hint ? hintId : null].filter(Boolean).join(" ");
      if (described) target.setAttribute("aria-describedby", described);
      else target.removeAttribute("aria-describedby");
    });
  } else if (target && hint) target.setAttribute("aria-describedby", hintId);
  return h("div", {
    class: ["lucid-field", cls],
    "data-invalid": problem ? () => Boolean(read(problem)) : undefined,
    onFocusout: field ? event => { if (!event.currentTarget.contains(event.relatedTarget)) field.touch(); } : undefined
  },
  label ? h("label", { class: "lucid-field-label", for: target?.id ?? id }, label) : null,
  children,
  hint ? h("div", { class: "lucid-field-hint", id: hintId }, hint) : null,
  problem ? () => (read(problem) ? h("div", { class: "lucid-field-error", id: errorId }, Icon({ name: "alert-circle", size: 13 }), read(problem)) : null) : null);
}

export function Checkbox(...args) {
  const [{ label, class: cls, aria, ...props }, children] = parts(args);
  return h("label", { class: ["lucid-check", cls] },
    h("input", { type: "checkbox", aria, ...props }),
    h("span", { class: "lucid-check-box", "aria-hidden": "true" }, Icon({ name: "check", size: 12, stroke: 3 })),
    label ?? null,
    children);
}

export function Switch(...args) {
  const [{ label, class: cls, aria, ...props }, children] = parts(args);
  return h("label", { class: ["lucid-check", cls] },
    h("input", { type: "checkbox", role: "switch", aria, ...props }),
    h("span", { class: "lucid-switch-track", "aria-hidden": "true" }),
    label ?? null,
    children);
}

export function Segmented({ value, options, size, iconOnly, aria, onChange, class: cls } = {}) {
  const thumb = h("span", { class: "lucid-seg-thumb", "aria-hidden": "true" });
  const buttons = [];
  const choose = option => {
    value.value = option.value;
    onChange?.(option.value);
  };
  const items = options.map(option => {
    const button = h("button", {
      type: "button",
      role: "radio",
      tabindex: () => (value.value === option.value ? 0 : -1),
      "aria-checked": () => value.value === option.value,
      aria: iconOnly ? { label: option.label } : undefined,
      onClick: () => choose(option)
    },
    option.icon ? Icon({ name: option.icon, size: size === "sm" ? 13 : 15 }) : null,
    iconOnly ? null : option.label);
    buttons.push(button);
    return iconOnly ? Tooltip({ label: option.label }, button) : button;
  });
  const root = h("div", {
    class: ["lucid-seg", cls],
    role: "radiogroup",
    "data-size": size,
    "data-icon-only": iconOnly,
    "data-ready": "false",
    aria,
    onKeydown: event => {
      const step = event.key === "ArrowRight" || event.key === "ArrowDown" ? 1 : event.key === "ArrowLeft" || event.key === "ArrowUp" ? -1 : 0;
      if (!step) return;
      event.preventDefault();
      const index = options.findIndex(option => option.value === value.peek());
      const next = options[(index + step + options.length) % options.length];
      choose(next);
      buttons[options.indexOf(next)].focus();
    }
  }, thumb, items);

  const move = () => {
    const button = buttons[options.findIndex(option => option.value === value.peek())];
    if (!button || !button.offsetWidth) return;
    const box = root.getBoundingClientRect();
    const rect = button.getBoundingClientRect();
    const scale = Math.abs(box.width - root.offsetWidth) > 1 ? box.width / root.offsetWidth : 1;
    thumb.style.width = `${rect.width / scale}px`;
    thumb.style.transform = `translateX(${(rect.left - box.left) / scale - root.clientLeft}px)`;
    if (root.dataset.ready === "false") requestAnimationFrame(() => { root.dataset.ready = "true"; });
  };
  effect(() => {
    value.value;
    requestAnimationFrame(move);
  });
  if (typeof ResizeObserver !== "undefined") {
    const observer = new ResizeObserver(move);
    observer.observe(root);
    later(() => observer.disconnect());
  }
  return root;
}

let tipClosedAt = 0;

export function Tooltip({ label, kbd, placement = "top" } = {}, trigger) {
  const tip = h("div", { class: "lucid-tip", popover: "manual", role: "tooltip" }, label, kbd ? Kbd(kbd) : null);
  let timer = 0;
  const isOpen = () => tip.matches(":popover-open");
  const open = () => {
    if (!trigger.isConnected || !tip.isConnected || isOpen() || trigger.getAttribute("aria-expanded") === "true") return;
    tip.showPopover();
    place(trigger, tip, { placement: `${placement}-center`, offset: 8 });
  };
  const show = () => {
    clearTimeout(timer);
    timer = setTimeout(open, Date.now() - tipClosedAt < 500 ? 0 : 500);
  };
  const hide = () => {
    clearTimeout(timer);
    if (!isOpen()) return;
    tip.hidePopover();
    tipClosedAt = Date.now();
  };
  trigger.addEventListener("pointerenter", event => { if (event.pointerType === "mouse") show(); });
  trigger.addEventListener("pointerleave", hide);
  trigger.addEventListener("pointerdown", hide);
  trigger.addEventListener("focus", () => { if (trigger.matches(":focus-visible")) show(); });
  trigger.addEventListener("blur", hide);
  trigger.addEventListener("keydown", event => { if (event.key === "Escape") hide(); });
  later(() => { clearTimeout(timer); if (isOpen()) tip.hidePopover(); });
  return [trigger, tip];
}

function focusables(panel, selector) {
  return [...panel.querySelectorAll(selector)].filter(el => el.getAttribute("aria-disabled") !== "true");
}

function navigate(panel, selector, event) {
  const items = focusables(panel, selector);
  if (!items.length) return;
  const index = items.indexOf(document.activeElement);
  let next = null;
  if (event.key === "ArrowDown") next = items[(index + 1) % items.length];
  else if (event.key === "ArrowUp") next = items[(index - 1 + items.length) % items.length];
  else if (event.key === "Home") next = items[0];
  else if (event.key === "End") next = items[items.length - 1];
  if (!next) return;
  event.preventDefault();
  next.focus();
  next.scrollIntoView({ block: "nearest" });
}

export function attachPopover(trigger, panel, { placement = "bottom-start", matchWidth = false, onOpen } = {}) {
  trigger.popoverTargetElement = panel;
  trigger.setAttribute("aria-expanded", "false");
  follow(trigger, panel, { placement, matchWidth });
  panel.addEventListener("beforetoggle", event => {
    trigger.setAttribute("aria-expanded", String(event.newState === "open"));
  });
  panel.addEventListener("toggle", event => {
    if (event.newState === "open") onOpen?.();
  });
  return panel;
}

export function Menu({ trigger, items, placement = "bottom-start", width } = {}) {
  const panel = h("div", { class: "lucid-pop lucid-menu", popover: "auto", role: "menu", style: { minWidth: width } });
  const select = item => {
    panel.hidePopover();
    item.onSelect?.();
  };
  const render = () => read(items).map(item => {
    if (item.separator) return h("div", { class: "lucid-menu-sep", role: "separator" });
    if (item.group) return h("div", { class: "lucid-menu-group" }, item.group);
    return h("button", {
      type: "button",
      class: "lucid-item",
      role: item.checked !== undefined ? "menuitemcheckbox" : "menuitem",
      tabindex: -1,
      "aria-checked": item.checked !== undefined ? () => Boolean(read(item.checked)) : undefined,
      "aria-disabled": item.disabled ? "true" : undefined,
      "data-danger": item.danger,
      onPointermove: event => { if (document.activeElement !== event.currentTarget) event.currentTarget.focus({ preventScroll: true }); },
      onClick: () => { if (!item.disabled) select(item); }
    },
    typeof item.icon === "string" ? Icon({ name: item.icon, size: 15 }) : item.icon ?? null,
    h("span", { class: "lucid-item-label" }, item.label),
    item.hint ? h("span", { class: "lucid-item-hint" }, item.hint) : null,
    item.kbd ? Kbd(item.kbd) : null,
    item.checked !== undefined ? () => (read(item.checked) ? Icon({ name: "check", size: 14, class: "lucid-item-check" }) : null) : null);
  });
  panel.append(h("div", { style: { display: "contents" } }, render));
  panel.addEventListener("keydown", event => navigate(panel, ".lucid-item", event));
  trigger.setAttribute("aria-haspopup", "menu");
  attachPopover(trigger, panel, {
    placement,
    onOpen: () => focusables(panel, ".lucid-item")[0]?.focus({ preventScroll: true })
  });
  return [trigger, panel];
}

function score(text, query) {
  if (!query) return 1;
  const haystack = text.toLowerCase();
  const index = haystack.indexOf(query);
  if (index === 0) return 4;
  if (index > 0) return /[\s\-_/]/.test(haystack[index - 1]) ? 3 : 2;
  let at = 0;
  let first = -1;
  for (const char of query) {
    at = haystack.indexOf(char, at);
    if (at < 0) return 0;
    if (first < 0) first = at;
    at++;
  }
  return at - first <= query.length * 2 ? 1 : 0;
}

export function Select({
  value, options, placeholder = "Select", multiple = false, searchable = false,
  size = "sm", variant = "secondary", placement = "bottom-start", width, display,
  aria, onChange, class: cls, icon, searchPlaceholder = "Search",
  onCreate, createLabel = text => `Create “${text}”`
} = {}) {
  const query = signal("");
  const all = computed(() => read(options) ?? []);
  const selected = optionValue => (multiple ? (value.value ?? []).includes(optionValue) : value.value === optionValue);
  const current = computed(() => {
    const list = all.value;
    return multiple ? list.filter(option => (value.value ?? []).includes(option.value)) : list.find(option => option.value === value.value);
  });
  const filtered = computed(() => {
    const q = query.value.trim().toLowerCase();
    if (!q) return all.value;
    return all.value
      .map(option => ({ option, rank: score(`${option.label} ${option.keywords ?? ""}`, q) }))
      .filter(entry => entry.rank > 0)
      .sort((a, b) => b.rank - a.rank)
      .map(entry => entry.option);
  });
  const renderIcon = option => (typeof option.icon === "function" ? option.icon() : typeof option.icon === "string" ? Icon({ name: option.icon, size: 15 }) : option.icon ?? null);

  const label = () => {
    if (display) return display(current.value);
    const chosen = current.value;
    if (multiple) {
      if (!chosen.length) return h("span", { class: "lucid-select-value lucid-select-placeholder" }, placeholder);
      return h("span", { class: "lucid-select-value" }, chosen.length === 1 ? chosen[0].label : `${chosen.length} selected`);
    }
    if (!chosen) return h("span", { class: "lucid-select-value lucid-select-placeholder" }, placeholder);
    return [renderIcon(chosen), h("span", { class: "lucid-select-value" }, chosen.label)];
  };

  const trigger = Button({ variant, size, class: ["lucid-select-trigger", cls], aria, "aria-haspopup": "listbox" },
    typeof icon === "string" ? Icon({ name: icon, size: 14 }) : icon ?? null,
    label,
    Icon({ name: "chevron-down", size: 13, class: "lucid-chevron" }));

  let search;
  const pick = option => {
    if (multiple) {
      const list = value.peek() ?? [];
      value.value = list.includes(option.value) ? list.filter(v => v !== option.value) : [...list, option.value];
    } else {
      value.value = option.value;
      panel.hidePopover();
    }
    onChange?.(value.peek());
  };

  const create = text => {
    const created = onCreate(text);
    if (created == null) return;
    query.value = "";
    pick({ value: created });
  };

  const list = h("div", { role: "listbox", "aria-multiselectable": multiple || undefined },
    For({ each: filtered, key: option => option.value }, option => h("button", {
      type: "button",
      class: "lucid-item",
      role: "option",
      tabindex: -1,
      "aria-selected": () => selected(option.value),
      onPointermove: event => { if (document.activeElement !== event.currentTarget) event.currentTarget.focus({ preventScroll: true }); },
      onClick: () => pick(option)
    },
    renderIcon(option),
    h("span", { class: "lucid-item-label" }, option.label),
    option.hint ? h("span", { class: "lucid-item-hint" }, option.hint) : null,
    () => (selected(option.value) ? Icon({ name: "check", size: 14, class: "lucid-item-check" }) : null))),
    onCreate ? () => {
      const text = query.value.trim();
      if (!text || all.value.some(option => option.label.toLowerCase() === text.toLowerCase())) return null;
      return h("button", {
        type: "button",
        class: "lucid-item",
        role: "option",
        tabindex: -1,
        "aria-selected": "false",
        onPointermove: event => { if (document.activeElement !== event.currentTarget) event.currentTarget.focus({ preventScroll: true }); },
        onClick: () => create(text)
      }, Icon({ name: "plus", size: 15 }), h("span", { class: "lucid-item-label" }, createLabel(text)));
    } : null,
    () => (filtered.value.length || (onCreate && query.value.trim()) ? null : h("div", { class: "lucid-menu-empty" }, "No matches")));

  const panel = h("div", { class: "lucid-pop lucid-select", popover: "auto", style: { minWidth: width } },
    searchable ? h("div", { class: "lucid-menu-search" }, Input({
      icon: "search",
      bind: query,
      placeholder: searchPlaceholder,
      aria: { label: searchPlaceholder },
      ref: el => { search = el; },
      onKeydown: event => {
        if (event.key === "ArrowDown") {
          event.preventDefault();
          focusables(panel, ".lucid-item")[0]?.focus();
        } else if (event.key === "Enter") {
          const first = filtered.peek()[0];
          if (first) pick(first);
          else if (onCreate && query.peek().trim()) create(query.peek().trim());
        }
      }
    })) : null,
    list);

  panel.addEventListener("keydown", event => {
    if (event.target === search) return;
    navigate(panel, ".lucid-item", event);
  });

  attachPopover(trigger, panel, {
    placement,
    onOpen: () => {
      query.value = "";
      if (search) search.focus({ preventScroll: true });
      else (panel.querySelector(".lucid-item[aria-selected='true']") ?? focusables(panel, ".lucid-item")[0])?.focus({ preventScroll: true });
    }
  });
  return [trigger, panel];
}

export function Dialog(...args) {
  const [{ open, title, description, footer, size, width, variant = "center", actions, class: cls, onClose, closeLabel = "Close", aria }, children] = parts(args);
  const titleId = nextId("dialog");
  const setOpen = next => {
    if (!next) {
      write(open, false);
      onClose?.();
    }
  };
  const widths = { sm: "420px", md: "560px", lg: "720px", xl: "920px" };
  const dialog = h("dialog", {
    class: ["lucid-dialog", cls],
    "data-variant": variant,
    style: { "--w": width ?? widths[size] },
    aria: { labelledby: title ? titleId : undefined, ...aria }
  },
  title || description || actions ? h("div", { class: "lucid-dialog-head" },
    h("div", { style: { flex: 1, minWidth: 0 } },
      title ? h("h2", { class: "lucid-dialog-title", id: titleId }, title) : null,
      description ? h("p", { class: "lucid-dialog-desc" }, description) : null),
    actions ?? null,
    Button({ variant: "ghost", size: "sm", icon: "x", aria: { label: closeLabel }, onClick: () => setOpen(false) })) : null,
  h("div", { class: "lucid-dialog-body" }, children),
  footer ? h("div", { class: "lucid-dialog-foot" }, footer) : null);

  const sync = () => {
    const want = Boolean(read(open));
    if (want && !dialog.open && dialog.isConnected) {
      dialog.showModal();
      dialog.querySelector("[autofocus], .lucid-dialog-body input:not([type='hidden'], [type='checkbox'], [type='radio']), .lucid-dialog-body textarea")?.focus();
    }
    else if (!want && dialog.open) dialog.close();
  };
  effect(() => {
    read(open);
    sync();
  });
  queueMicrotask(sync);
  let downOnBackdrop = false;
  dialog.addEventListener("pointerdown", event => { downOnBackdrop = event.target === dialog; });
  dialog.addEventListener("click", event => { if (downOnBackdrop && event.target === dialog) setOpen(false); });
  dialog.addEventListener("cancel", event => { event.preventDefault(); setOpen(false); });
  dialog.addEventListener("close", () => { if (read(open)) setOpen(false); });
  return dialog;
}

export function CommandMenu({ open, items, placeholder = "Type a command or search", empty = "Nothing found" } = {}) {
  const query = signal("");
  const active = signal(0);
  let input;
  let listEl;

  const results = computed(() => {
    const q = query.value.trim().toLowerCase();
    const ranked = (read(items) ?? [])
      .map((item, order) => ({ item, order, rank: score(`${item.label} ${item.keywords ?? ""} ${item.group ?? ""}`, q) }))
      .filter(entry => entry.rank > 0 && (q || !entry.item.searchOnly))
      .sort((a, b) => (q ? b.rank - a.rank || a.order - b.order : a.order - b.order))
      .map(entry => entry.item);
    const groups = new Map();
    for (const item of ranked) {
      const key = item.group ?? "";
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(item);
    }
    return [...groups].flatMap(([, list]) => list);
  });

  const run = item => {
    write(open, false);
    queueMicrotask(() => item?.run?.());
  };

  const move = step => {
    const count = results.peek().length;
    if (!count) return;
    active.value = (active.peek() + step + count) % count;
  };

  const renderList = () => {
    const list = results.value;
    if (!list.length) return h("div", { class: "lucid-menu-empty" }, empty);
    let group = null;
    return list.flatMap((item, index) => {
      const nodes = [];
      if ((item.group ?? "") !== group) {
        group = item.group ?? "";
        if (group) nodes.push(h("div", { class: "lucid-menu-group" }, group));
      }
      nodes.push(h("div", {
        class: "lucid-item",
        role: "option",
        id: `${listId}-${index}`,
        "aria-selected": () => active.value === index,
        "data-active": () => active.value === index,
        onPointermove: () => { if (active.peek() !== index) active.value = index; },
        onClick: () => run(item)
      },
      typeof item.icon === "string" ? Icon({ name: item.icon, size: 16 }) : typeof item.icon === "function" ? item.icon() : item.icon ?? null,
      h("span", { class: "lucid-item-label" }, item.label),
      item.hint ? h("span", { class: "lucid-item-hint" }, item.hint) : null,
      item.kbd ? Kbd(item.kbd) : null));
      return nodes;
    });
  };

  const listId = nextId("command");
  const dialog = Dialog({ open, class: "lucid-command", aria: { label: "Command menu" } },
    h("div", { class: "lucid-command-input" }, Input({
      icon: "search",
      bind: query,
      placeholder,
      role: "combobox",
      aria: { label: placeholder, controls: listId, expanded: "true", activedescendant: () => `${listId}-${active.value}` },
      ref: el => { input = el; },
      onInput: () => { active.value = 0; },
      onKeydown: event => {
        if (event.key === "ArrowDown") { event.preventDefault(); move(1); }
        else if (event.key === "ArrowUp") { event.preventDefault(); move(-1); }
        else if (event.key === "Enter") { event.preventDefault(); run(results.peek()[active.peek()]); }
      }
    })),
    h("div", { class: "lucid-command-list", role: "listbox", id: listId, ref: el => { listEl = el; } }, renderList),
    h("div", { class: "lucid-command-foot" },
      h("span", Kbd("up"), Kbd("down"), "Navigate"),
      h("span", Kbd("enter"), "Run"),
      h("span", Kbd("escape"), "Close")));

  effect(() => {
    active.value;
    results.value;
    queueMicrotask(() => listEl?.querySelector("[data-active]")?.scrollIntoView({ block: "nearest" }));
  });
  effect(() => {
    if (!read(open)) return;
    untrack(() => {
      query.value = "";
      active.value = 0;
    });
    requestAnimationFrame(() => input?.focus());
  });
  return dialog;
}

let toaster = null;

const toastIcons = { success: "check-circle", danger: "alert-circle", info: "info" };

export function toast(title, { description, tone = "info", icon, action, duration = 4200 } = {}) {
  if (!toaster || !toaster.isConnected) {
    toaster = h("section", { class: "lucid-toaster", popover: "manual", aria: { label: "Notifications", live: "polite" } });
    (document.querySelector(".lucid-app") ?? document.body).append(toaster);
  }
  if (toaster.matches(":popover-open")) toaster.hidePopover();
  toaster.showPopover();
  let timer = 0;
  const dismiss = () => {
    clearTimeout(timer);
    if (item.dataset.leaving) return;
    item.dataset.leaving = "";
    setTimeout(() => item.remove(), 200);
  };
  const item = h("div", {
    class: "lucid-toast",
    "data-tone": tone,
    role: "status",
    onPointerenter: () => clearTimeout(timer),
    onPointerleave: () => { timer = setTimeout(dismiss, 1600); }
  },
  Icon({ name: icon ?? toastIcons[tone] ?? "info", size: 16 }),
  h("div", { class: "lucid-toast-body" },
    h("div", { class: "lucid-toast-title" }, title),
    description ? h("div", { class: "lucid-toast-desc" }, description) : null),
  action ? Button({ variant: "secondary", size: "xs", onClick: () => { action.onClick?.(); dismiss(); } }, action.label) : null,
  Button({ variant: "ghost", size: "xs", icon: "x", aria: { label: "Dismiss" }, onClick: dismiss }));
  toaster.append(item);
  while (toaster.children.length > 4) toaster.firstElementChild.remove();
  timer = setTimeout(dismiss, duration);
  return dismiss;
}

const hue = text => {
  let hash = 0;
  for (const char of String(text)) hash = (hash * 31 + char.codePointAt(0)) | 0;
  return Math.abs(hash) % 360;
};

export function Avatar({ name, src, size = 24, class: cls, title } = {}) {
  if (!name && !src) return h("span", { class: ["lucid-avatar", cls], "data-empty": true, style: { "--s": `${size}px` }, role: "img", aria: { label: title ?? "Unassigned" } });
  const initials = String(name).split(/\s+/).filter(Boolean).slice(0, 2).map(word => word[0].toUpperCase()).join("");
  return h("span", {
    class: ["lucid-avatar", cls],
    style: { "--s": `${size}px`, "--h": hue(name) },
    role: "img",
    aria: { label: title ?? name }
  }, src ? h("img", { src, alt: "" }) : initials);
}

export function AvatarStack(...args) {
  const [{ size = 24, class: cls }, children] = parts(args);
  return h("span", { class: ["lucid-avatars", cls], style: { "--s": `${size}px` } }, children);
}

export function Badge(...args) {
  const [{ tone, size, color, class: cls, ...rest }, children] = parts(args);
  return h("span", { class: ["lucid-badge", cls], "data-tone": tone, "data-size": size, ...rest },
    color ? h("span", { class: "lucid-dot", style: { "--c": color } }) : null,
    children);
}

export const Dot = ({ color, size } = {}) =>
  h("span", { class: "lucid-dot", style: { "--c": color, width: size, height: size }, "aria-hidden": "true" });

export function Card(...args) {
  const [{ padding = "md", variant, as = "div", class: cls, ...rest }, children] = parts(args);
  return h(as, { class: ["lucid-card", cls], "data-padding": padding, "data-variant": variant, ...rest }, children);
}

export function EmptyState({ icon = "inbox", title, description, action } = {}) {
  return h("div", { class: "lucid-empty" },
    h("div", { class: "lucid-empty-icon" }, typeof icon === "string" ? Icon({ name: icon, size: 20 }) : icon),
    title ? h("div", { class: "lucid-empty-title" }, title) : null,
    description ? h("div", { class: "lucid-empty-desc" }, description) : null,
    action ?? null);
}

const isTyping = target =>
  target instanceof Element && (target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName));

export function hotkey(combo, handler, { inputs = false } = {}) {
  const tokens = combo.toLowerCase().split("+");
  const key = tokens.pop();
  const mods = new Set(tokens);
  const listener = event => {
    if (event.defaultPrevented || event.isComposing) return;
    const mod = isMac ? event.metaKey : event.ctrlKey;
    if (mods.has("mod") !== mod) return;
    if (!mods.has("mod") && (event.metaKey || event.ctrlKey)) return;
    if (mods.has("alt") !== event.altKey) return;
    if (mods.has("shift") && !event.shiftKey) return;
    if (!mods.has("shift") && /^[a-z0-9]$/.test(key) && event.shiftKey) return;
    if (event.key.toLowerCase() !== key) return;
    if (!inputs && isTyping(event.target)) return;
    if (!inputs && !mods.has("mod") && document.querySelector("dialog[open]")) return;
    event.preventDefault();
    handler(event);
  };
  window.addEventListener("keydown", listener);
  const remove = () => window.removeEventListener("keydown", listener);
  later(remove);
  return remove;
}
