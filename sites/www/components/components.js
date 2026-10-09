import { h, signal, computed, effect, onCleanup } from "/lucid/index.js";
import * as Core from "/lucid/index.js";
import * as UI from "/lucid/ui/index.js";
import * as Viz from "/lucid/viz/index.js";
import { Button, Icon, Input, Tooltip, EmptyState, toast } from "/lucid/ui/index.js";
import { mountPage } from "/shared/chrome.js";
import { highlight } from "/shared/code.js";
import { SETS, COMPONENTS, sourceOf, appSource } from "/shared/catalog.js";

const SCOPE = { ...Core, ...UI, ...Viz };
const NAMES = Object.keys(SCOPE).filter(name => /^[A-Za-z_$][\w$]*$/.test(name));
const VALUES = NAMES.map(name => SCOPE[name]);
const MODULES = { core: Object.keys(Core), ui: Object.keys(UI), viz: Object.keys(Viz) };
const number = i => String(i + 1).padStart(2, "0");
const query = signal("");
const activeSet = signal(SETS[0].id);
const COUNTS = { components: COMPONENTS.length, sets: SETS.length, icons: UI.iconNames.length };

const words = entry => `${entry.name} ${entry.summary} ${(entry.uses ?? []).join(" ")} ${SETS.find(s => s.id === entry.set).title}`.toLowerCase();
const matches = computed(() => {
  const q = query.value.trim().toLowerCase();
  if (!q) return COMPONENTS;
  const terms = q.split(/\s+/);
  return COMPONENTS.filter(entry => { const text = words(entry); return terms.every(t => text.includes(t)); });
});
const bySet = computed(() => SETS.map(set => ({ set, items: matches.value.filter(entry => entry.set === set.id) })).filter(group => group.items.length));

function live(entry) {
  try {
    const run = new Function(...NAMES, `"use strict";\nreturn (() => {\n${entry.setup ?? ""}\nreturn (${entry.code});\n})();`);
    return run(...VALUES);
  } catch (error) {
    return h("p", { class: "cx-error" }, Icon({ name: "alert-circle", size: 14 }), `${entry.name} couldn't render: ${error.message}`);
  }
}

async function shareLink(entry) {
  const json = JSON.stringify({ v: 1, name: entry.name, files: [{ name: "app.js", text: appSource(entry, MODULES) }] });
  const stream = new Blob([json]).stream().pipeThrough(new CompressionStream("deflate-raw"));
  const bytes = new Uint8Array(await new Response(stream).arrayBuffer());
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return `https://build.lucidui.dev/#share=${btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "")}`;
}

function openInBuilder(entry) {
  const tab = window.open("", "_blank");
  shareLink(entry).then(url => {
    if (tab) { tab.opener = null; tab.location.href = url; } else location.href = url;
  }, () => { tab?.close(); toast("Couldn't open Builder", { tone: "danger", description: "Copy the code and paste it into Builder instead." }); });
}

function copy(entry) {
  navigator.clipboard?.writeText(sourceOf(entry)).then(
    () => toast(`${entry.name} copied`, { tone: "success", description: "Paste it inside any Lucid UI component." }),
    () => toast("Copy failed", { tone: "danger", description: "Open the code and select it instead." }));
}

const pending = new Set();
let idle = 0;
const idleNext = () => {
  clearTimeout(idle);
  idle = setTimeout(() => {
    const next = pending.values().next().value;
    if (!next) return;
    next();
    idleNext();
  }, 120);
};

function lazy(node, onShow) {
  let done = false;
  const show = () => { if (done) return; done = true; pending.delete(show); io.disconnect(); onShow(); };
  const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) show(); }, { rootMargin: "500px 0px" });
  pending.add(show);
  queueMicrotask(() => { io.observe(node); setTimeout(idleNext, 1200); });
  onCleanup(() => { io.disconnect(); pending.delete(show); });
}

function Specimen(entry) {
  const shown = signal(false);
  const codeOpen = signal(false);
  const fit = entry.tall ? "fill" : entry.wide ? "wide" : "center";
  const stage = h("div", { class: "cx-stage", "data-fit": fit, "data-tall": entry.tall, "data-desk": entry.desk },
    h("div", { class: "cx-stage-inner" }, () => (shown.value ? live(entry) : h("div", { class: "cx-wait", "aria-hidden": "true" }))),
    entry.desk ? h("p", { class: "cx-desk-note" }, Icon({ name: "monitor", size: 13 }), "A desktop layout. Scroll sideways to see all of it.") : null);
  lazy(stage, () => { shown.value = true; });
  const codeId = `${entry.id}-code`;
  return h("article", { class: "cx-card", id: entry.id, "data-wide": entry.wide, "data-code": () => String(codeOpen.value) },
    stage,
    h("div", { class: "cx-meta" },
      h("div", { class: "cx-titles" },
        h("h3", { class: "cx-name" }, h("a", { href: `#${entry.id}` }, entry.name)),
        h("p", { class: "cx-summary" }, entry.summary)),
      h("div", { class: "cx-actions" },
        Button({ size: "sm", variant: "ghost", icon: "hash", class: "cx-code-btn", "aria-expanded": () => String(codeOpen.value), "aria-controls": codeId, onClick: () => { codeOpen.value = !codeOpen.peek(); } }, () => (codeOpen.value ? "Hide code" : "Code")),
        Tooltip({ label: "Copy code" }, Button({ size: "sm", variant: "ghost", icon: "copy", aria: { label: `Copy ${entry.name} code` }, onClick: () => copy(entry) })),
        Tooltip({ label: "Open in Builder" }, Button({ size: "sm", icon: "external", aria: { label: `Open ${entry.name} in Builder` }, onClick: () => openInBuilder(entry) }, h("span", { class: "cx-hide-sm" }, "Builder"))))),
    h("div", { class: "cx-code", id: codeId, inert: () => !codeOpen.value },
      h("div", { class: "cx-code-clip" },
        h("pre", { class: "cx-pre", tabindex: 0, aria: { label: `${entry.name} code` } }, h("code", highlight(sourceOf(entry)))))));
}

function SetSection({ set, items }) {
  const index = SETS.indexOf(set);
  const section = h("section", { class: "cx-set", id: `set-${set.id}`, "data-set": set.id, aria: { labelledby: `set-${set.id}-title` } },
    h("header", { class: "cx-set-head" },
      h("span", { class: "cx-set-num" }, number(index)),
      h("div", { class: "cx-set-copy" },
        h("h2", { class: "cx-set-title", id: `set-${set.id}-title` }, set.title, h("span", { class: "cx-set-count" }, String(items.length))),
        h("p", { class: "cx-set-note" }, set.note))),
    h("div", { class: "cx-grid" }, items.map(Specimen)));
  const io = new IntersectionObserver(entries => { for (const e of entries) if (e.isIntersecting) activeSet.value = set.id; }, { rootMargin: "-30% 0px -60% 0px" });
  queueMicrotask(() => io.observe(section));
  onCleanup(() => io.disconnect());
  return section;
}

const goTo = id => event => {
  event?.preventDefault();
  document.getElementById(`set-${id}`)?.scrollIntoView({ behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "start" });
  history.replaceState(null, "", `#set-${id}`);
};

function Hero() {
  const stat = (value, label) => h("div", { class: "cx-stat" }, h("b", String(value)), h("span", label));
  return h("section", { class: "cx-hero" },
    h("div", { class: "site-wrap cx-hero-grid" },
      h("div", { class: "cx-hero-copy" },
        h("p", { class: "cx-kicker" }, h("i"), "Components"),
        h("h1", { class: "cx-title" }, "The whole kit,", h("br"), h("span", { class: "cx-gold" }, "running live.")),
        h("p", { class: "cx-lede" }, "Every component, chart and pattern in Lucid UI, on one page. Use them right here, read the code that draws them, and open any one in Builder to make it yours."),
        h("div", { class: "cx-hero-actions" },
          Button({ variant: "primary", size: "lg", iconRight: "arrow-down", onClick: goTo(SETS[0].id) }, "Browse the kit"),
          Button({ size: "lg", icon: "external", href: "https://build.lucidui.dev" }, "Open Builder"))),
      h("div", { class: "cx-stats", aria: { label: "What's inside" } },
        stat(COUNTS.components, "live examples"),
        stat(COUNTS.sets, "sets"),
        stat(COUNTS.icons, "icons"),
        stat(0, "dependencies"),
        h("div", { class: "cx-stats-field", "aria-hidden": "true" }, Array.from({ length: 48 }, (_, i) => h("i", { style: { "--i": i } }))))));
}

function Toolbar() {
  const chips = h("nav", { class: "cx-chips", aria: { label: "Sets" } },
    () => bySet.value.map(({ set, items }) => h("a", { href: `#set-${set.id}`, class: "cx-chip", "data-set": set.id, "aria-current": () => (activeSet.value === set.id ? "true" : undefined), onClick: goTo(set.id) }, set.title, h("span", items.length))));
  effect(() => {
    const id = activeSet.value;
    requestAnimationFrame(() => {
      const chip = chips.querySelector(`[data-set="${id}"]`);
      if (chip && chips.scrollWidth > chips.clientWidth) chips.scrollTo({ left: chip.offsetLeft - 16, behavior: "smooth" });
    });
  });
  return h("div", { class: "cx-bar" },
    h("div", { class: "site-wrap cx-bar-inner" },
      Input({ icon: "search", placeholder: "Search components, charts, patterns", value: query, onInput: e => { query.value = e.target.value; }, aria: { label: "Search components" }, class: "cx-search", type: "search" }),
      chips,
      h("span", { class: "cx-found", aria: { live: "polite" } }, () => (query.value.trim() ? `${matches.value.length} of ${COMPONENTS.length}` : `${COMPONENTS.length} examples`))));
}

function Rail() {
  return h("nav", { class: "cx-rail", aria: { label: "Sets" } },
    h("p", { class: "cx-rail-title" }, "Sets"),
    () => bySet.value.map(({ set, items }) => h("a", { href: `#set-${set.id}`, class: "cx-rail-link", "aria-current": () => (activeSet.value === set.id ? "true" : undefined), onClick: goTo(set.id) },
      h("span", { class: "cx-rail-num" }, number(SETS.indexOf(set))), h("span", { class: "cx-rail-label" }, set.title), h("span", { class: "cx-rail-count" }, String(items.length)))),
    h("div", { class: "cx-rail-note" },
      h("p", "Every example is the real component, not a picture of one."),
      h("a", { href: "https://docs.lucidui.dev" }, "Full API in the docs", Icon({ name: "arrow-right", size: 13 }))));
}

function Catalog() {
  return h("div", { class: "site-wrap cx-body" },
    Rail(),
    h("div", { class: "cx-sets" },
      () => (bySet.value.length
        ? bySet.value.map(SetSection)
        : h("div", { class: "cx-none" }, EmptyState({ icon: "search", title: "Nothing matches", description: "Try a component name like Select, or a word like chart or rail.", action: Button({ size: "sm", onClick: () => { query.value = ""; } }, "Clear search") })))));
}

function Close() {
  return h("section", { class: "cx-close" },
    h("div", { class: "site-wrap cx-close-inner" },
      h("h2", "Know what to ask for."),
      h("p", "When an agent builds with Lucid UI, these are the words it understands. Name a Waffle, a rail or a sheet, and that's what you get."),
      h("div", { class: "cx-hero-actions" },
        Button({ variant: "primary", size: "lg", icon: "zap", href: "https://build.lucidui.dev" }, "Build in Builder"),
        Button({ size: "lg", icon: "hash", href: "https://docs.lucidui.dev" }, "Read the docs"))));
}

mountPage({
  site: "components",
  main: () => {
    queueMicrotask(() => {
      const target = location.hash && document.getElementById(location.hash.slice(1));
      if (target) requestAnimationFrame(() => target.scrollIntoView({ block: "start" }));
    });
    return [h("div", { class: "cx" }, Hero(), Toolbar(), Catalog(), Close())];
  },
  commands: [
    ...SETS.map(set => ({ group: "Component sets", label: set.title, icon: "layers", run: goTo(set.id) })),
    ...COMPONENTS.map(entry => ({ group: "Components", label: entry.name, icon: "hash", keywords: `${entry.summary} ${(entry.uses ?? []).join(" ")}`, searchOnly: true, run: () => { document.getElementById(entry.id)?.scrollIntoView({ block: "start" }); history.replaceState(null, "", `#${entry.id}`); } }))
  ]
});
