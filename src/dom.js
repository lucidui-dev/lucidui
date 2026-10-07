import { Scope, computed, effect, getOwner, isSignal, read, root, runIn, signal, untrack } from "./reactive.js";
import { fail, report } from "./diagnostics.js";

const SVG_NS = "http://www.w3.org/2000/svg";

const SVG_TAGS = new Set([
  "svg", "g", "path", "circle", "ellipse", "line", "polyline", "polygon", "rect",
  "defs", "use", "symbol", "clipPath", "mask", "pattern", "linearGradient",
  "radialGradient", "stop", "filter", "foreignObject", "text", "tspan", "textPath"
]);

const PROPERTIES = new Set(["value", "checked", "selected", "indeterminate", "muted"]);

const INTERACTIVE = new Set([
  "a", "button", "input", "select", "textarea", "summary", "details", "label",
  "option", "video", "audio"
]);

const UNITLESS = new Set([
  "opacity", "z-index", "flex", "flex-grow", "flex-shrink", "font-weight",
  "line-height", "order", "zoom", "scale", "aspect-ratio", "columns", "column-count"
]);

const isPlainObject = value =>
  value !== null && typeof value === "object" && Object.getPrototypeOf(value) === Object.prototype;

const isReactive = value => isSignal(value) || typeof value === "function";

const isText = value =>
  typeof value === "string" || typeof value === "number" || typeof value === "bigint";

const kebab = name => name.replace(/[A-Z]/g, letter => `-${letter.toLowerCase()}`);

function split(args) {
  return isPlainObject(args[0]) ? [args[0], args.slice(1)] : [{}, args];
}

export function h(tag, ...args) {
  const [props, children] = split(args);
  if (typeof tag === "function") return untrack(() => tag(props, ...children));
  const svg = tag.startsWith("svg:");
  const name = svg ? tag.slice(4) : tag;
  const element = svg || SVG_TAGS.has(name)
    ? document.createElementNS(SVG_NS, name)
    : document.createElement(name);
  applyProps(element, props);
  insert(element, children);
  audit(element, props);
  return element;
}

export const tags = new Proxy({}, {
  get: (_, tag) => (...args) => h(tag, ...args)
});

export function insert(parent, value, before = null) {
  if (value == null || value === false || value === true) return;
  if (Array.isArray(value)) {
    for (const item of value) insert(parent, item, before);
    return;
  }
  if (value instanceof Node) {
    parent.insertBefore(value, before);
    return;
  }
  if (isReactive(value)) {
    parent.insertBefore(region(value), before);
    return;
  }
  if (isPlainObject(value)) {
    report("invalid-child", { value });
    return;
  }
  parent.insertBefore(document.createTextNode(String(value)), before);
}

function markers() {
  const fragment = document.createDocumentFragment();
  const start = document.createComment("");
  const end = document.createComment("");
  fragment.append(start, end);
  return { fragment, start, end };
}

function clearBetween(start, end) {
  while (start.nextSibling && start.nextSibling !== end) start.nextSibling.remove();
}

function region(source) {
  const { fragment, start, end } = markers();
  let text = null;
  effect(() => {
    const value = read(source);
    untrack(() => {
      if (isText(value)) {
        if (text && start.nextSibling === text && text.nextSibling === end) {
          text.data = String(value);
          return;
        }
        clearBetween(start, end);
        text = document.createTextNode(String(value));
        end.parentNode.insertBefore(text, end);
        return;
      }
      text = null;
      clearBetween(start, end);
      insert(end.parentNode, value, end);
    });
  });
  return fragment;
}

function applyProps(element, props) {
  for (const key in props) {
    const value = props[key];
    if (key === "ref") {
      if (typeof value === "function") value(element);
    } else if (key === "bind") {
      continue;
    } else if (key.length > 2 && key.startsWith("on")) {
      listen(element, key.slice(2).toLowerCase(), value);
    } else if (key === "class" || key === "className") {
      applyClass(element, value);
    } else if (key === "style") {
      applyStyle(element, value);
    } else if ((key === "aria" || key === "data") && isPlainObject(value)) {
      for (const name in value) attribute(element, `${key}-${kebab(name)}`, value[name], key === "aria");
    } else {
      attribute(element, key, value, false);
    }
  }
  if (props.bind) applyBind(element, props.bind);
}

function listen(element, type, handler) {
  if (handler == null) return;
  if (typeof handler !== "function") fail("invalid-event-handler", { event: type, element });
  element.addEventListener(type, handler);
}

function attribute(element, name, value, aria) {
  aria ||= name.startsWith("aria-");
  if (isReactive(value)) effect(() => setAttribute(element, name, read(value), aria));
  else setAttribute(element, name, value, aria);
}

function setAttribute(element, name, value, aria) {
  if (PROPERTIES.has(name) && name in element) {
    element[name] = value ?? (name === "value" ? "" : false);
    return;
  }
  if (value == null || (value === false && !aria)) element.removeAttribute(name);
  else element.setAttribute(name, value === true && !aria ? "" : String(value));
}

function classNames(value) {
  value = read(value);
  if (!value) return "";
  if (typeof value === "string") return value;
  if (Array.isArray(value)) return value.map(classNames).filter(Boolean).join(" ");
  if (isPlainObject(value)) return Object.keys(value).filter(name => read(value[name])).join(" ");
  return String(value);
}

function applyClass(element, value) {
  const apply = () => {
    const names = classNames(value);
    if (names) element.setAttribute("class", names);
    else element.removeAttribute("class");
  };
  if (typeof value === "string" || value == null) apply();
  else effect(apply);
}

function applyStyle(element, value) {
  if (isPlainObject(value)) {
    for (const key in value) {
      const name = key.startsWith("--") ? key : kebab(key);
      const entry = value[key];
      if (isReactive(entry)) effect(() => setStyle(element, name, read(entry)));
      else setStyle(element, name, entry);
    }
  } else if (isReactive(value)) {
    effect(() => { element.style.cssText = read(value) ?? ""; });
  } else if (value) {
    element.style.cssText = value;
  }
}

function setStyle(element, name, value) {
  if (value == null || value === false) element.style.removeProperty(name);
  else if (typeof value === "number" && !UNITLESS.has(name) && !name.startsWith("--")) element.style.setProperty(name, `${value}px`);
  else element.style.setProperty(name, String(value));
}

function applyBind(element, source) {
  const tag = element.localName;
  const type = element.getAttribute("type");
  const checkable = tag === "input" && (type === "checkbox" || type === "radio");
  const property = checkable ? "checked" : "value";
  const event = checkable || tag === "select" ? "change" : "input";
  effect(() => { element[property] = read(source) ?? (checkable ? false : ""); });
  element.addEventListener(event, () => { source.value = element[property]; });
}

const NATIVE_PICKERS = new Set(["date", "datetime-local", "month", "week", "time", "color"]);

function audit(element, props) {
  const tag = element.localName;
  if (tag === "button" || element.getAttribute("role") === "button") {
    const named =
      element.textContent.trim() ||
      element.hasAttribute("aria-label") ||
      element.hasAttribute("aria-labelledby") ||
      element.hasAttribute("title") ||
      element.querySelector("img[alt]:not([alt='']), [aria-label]");
    if (!named) report("button-without-name", { element });
  }
  if (tag === "img" && !element.hasAttribute("alt")) report("img-without-alt", { element });
  if (tag === "select") report("native-select", { element });
  if (tag === "input" && NATIVE_PICKERS.has(String(read(props.type)))) report("native-picker", { element });
  if (
    typeof props.onClick === "function" &&
    !INTERACTIVE.has(tag) &&
    !element.hasAttribute("role") &&
    !element.hasAttribute("tabindex")
  ) {
    report("click-on-static-element", { element });
  }
}

function build(value) {
  if (typeof value === "function" && !isSignal(value)) return value();
  if (Array.isArray(value)) return value.map(build);
  return value;
}

export function Show(props, ...children) {
  const visible = computed(() => Boolean(read(props.when)));
  return region(() => (visible.value ? untrack(() => build(children)) : untrack(() => build(props.fallback))));
}

export function For(props, render) {
  const key = props.key ?? (item => item);
  const owner = getOwner();
  const { fragment, start, end } = markers();
  let rows = new Map();

  const create = (item, index) => {
    const scope = new Scope(owner);
    const position = signal(index);
    const content = document.createDocumentFragment();
    runIn(scope, () => insert(content, render(item, position)));
    if (!content.firstChild) content.append(document.createComment(""));
    return { item, scope, position, first: content.firstChild, last: content.lastChild };
  };

  const nodesOf = row => {
    const nodes = [];
    for (let node = row.first; node; node = node.nextSibling) {
      nodes.push(node);
      if (node === row.last) break;
    }
    return nodes;
  };

  const remove = row => {
    row.scope.dispose();
    for (const node of nodesOf(row)) node.remove();
  };

  if (owner) owner.cleanups.push(() => { for (const row of rows.values()) row.scope.dispose(); });

  effect(() => {
    const items = read(props.each) ?? [];
    untrack(() => {
      const next = new Map();
      const order = [];
      items.forEach((item, index) => {
        let id = key(item, index);
        if (next.has(id)) {
          report("duplicate-key", { key: id });
          id = Symbol("duplicate");
        }
        let row = rows.get(id);
        if (!row || row.item !== item) row = create(item, index);
        else row.position.value = index;
        next.set(id, row);
        order.push(row);
      });
      for (const [id, row] of rows) if (next.get(id) !== row) remove(row);
      let anchor = end;
      for (let index = order.length - 1; index >= 0; index--) {
        const row = order[index];
        if (row.last.nextSibling !== anchor) {
          for (const node of nodesOf(row)) end.parentNode.insertBefore(node, anchor);
        }
        anchor = row.first;
      }
      rows = next;
    });
  });

  return fragment;
}

export function mount(view, target) {
  const element = typeof target === "string" ? document.querySelector(target) : target;
  if (!element) fail("mount-target-missing", { target });
  return root(dispose => {
    const content = document.createDocumentFragment();
    insert(content, typeof view === "function" && !isSignal(view) ? view() : view);
    element.replaceChildren(content);
    return () => {
      dispose();
      element.replaceChildren();
    };
  });
}
