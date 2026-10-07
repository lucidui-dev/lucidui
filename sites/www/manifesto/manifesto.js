import { signal, h, onCleanup } from "/lucid/index.js";
import { Button, Icon } from "/lucid/ui/index.js";
import { mountPage, jump, copyBrief } from "/shared/chrome.js";

const BELIEFS = [
  {
    title: "Small is a feature.",
    text: "The whole runtime is 5.8 KB, and a test fails the build if it grows. Not because bytes are expensive, but because every line you can't read is a line you can't trust."
  },
  {
    title: "Read the source.",
    text: "No compiler stands between you and the browser. What you write is what ships, unminified, so anyone can open it and learn from it. This page included."
  },
  {
    title: "Taste is not optional.",
    text: "Defaults decide what most software looks like. So ours are finished: spacing, type, depth and motion, in light and dark, from one list of tokens. Start beautiful, then make it yours."
  },
  {
    title: "Agents are users too.",
    text: "Much of tomorrow's interface code will be written by AI. A library should be small enough for an agent to read whole, about 1,140 tokens, and plain enough that it never has to guess."
  },
  {
    title: "Errors should teach.",
    text: "Every mistake comes back with a stable code and the fix, as data. Not a stack trace and a shrug. People read it, agents act on it, and the next attempt is right."
  },
  {
    title: "Never the browser's grey box.",
    text: "No native alerts, no unstyled pickers, no menus that look like 1998. If it appears on screen, someone designed it, even when an agent wrote the code."
  },
  {
    title: "Accessible from the first line.",
    text: "Keyboards, focus, screen readers and reduced motion live inside the components. The easy way to write Lucid is the accessible way, so nobody has to remember."
  },
  {
    title: "Calm data.",
    text: "Charts should be counted, not decoded. Honest scales, fewer flourishes, and a table behind every chart, so the numbers are there for everyone."
  },
  {
    title: "Free, and staying free.",
    text: "MIT licensed. No account, no telemetry, no paid tier for the runtime. It belongs to everyone who builds with it."
  }
];

const active = signal(-1);
const still = matchMedia("(prefers-reduced-motion: reduce)").matches;
const number = i => String(i + 1).padStart(2, "0");

function watch(nodes) {
  const io = new IntersectionObserver(entries => {
    for (const entry of entries) {
      if (entry.isIntersecting) {
        entry.target.toggleAttribute("data-in", true);
        const i = Number(entry.target.dataset.index);
        if (!Number.isNaN(i)) active.value = i;
      }
    }
  }, { rootMargin: "-38% 0px -38% 0px" });
  queueMicrotask(() => nodes.forEach(node => io.observe(node)));
  onCleanup(() => io.disconnect());
}

function Hero() {
  return h("section", { class: "mf-hero" },
    h("div", { class: "mf-wrap" },
      h("p", { class: "mf-kicker" }, h("i"), "The Lucid UI manifesto"),
      h("h1", { class: "mf-title" },
        h("span", { class: "mf-line" }, "Interfaces"),
        h("span", { class: "mf-line" }, "should be"),
        h("span", { class: "mf-line mf-gold" }, "lucid.")),
      h("p", { class: "mf-lede" }, "Clear to read, clear to change, clear to anyone or anything that builds with them. Nine things we believe, and build to."),
      h("button", { type: "button", class: "mf-down", aria: { label: "Read the first belief" }, onClick: jump("belief-1") },
        h("span", "Read it"), Icon({ name: "arrow-down", size: 15 }))),
    h("div", { class: "mf-field", "aria-hidden": "true" }, Array.from({ length: 9 }, (_, i) => h("i", { style: { "--i": i } }))));
}

function Beliefs() {
  const items = BELIEFS.map((b, i) => h("article", { class: "mf-belief", id: `belief-${i + 1}`, "data-index": i, "data-in": still ? "" : undefined },
    h("div", { class: "mf-num", "aria-hidden": "true" },
      h("b", number(i)),
      h("span", { class: "mf-count" }, BELIEFS.map((_, k) => h("i", { "data-on": k <= i, "data-now": k === i })))),
    h("div", { class: "mf-copy" },
      h("h2", h("span", { class: "sr-only" }, `${i + 1}. `), b.title),
      h("p", b.text))));
  watch(items);
  return h("section", { class: "mf-beliefs", aria: { label: "Nine beliefs" } }, h("div", { class: "mf-wrap" }, items));
}

function Rail() {
  return h("nav", { class: "mf-rail", aria: { label: "Beliefs" }, "data-show": () => active.value >= 0 },
    BELIEFS.map((b, i) => h("a", {
      href: `#belief-${i + 1}`,
      class: "mf-rail-dot",
      "aria-current": () => (active.value === i ? "true" : undefined),
      "data-past": () => i < active.value,
      aria: { label: `${number(i)} ${b.title}` },
      title: b.title
    })));
}

function Origin() {
  return h("section", { class: "mf-origin" },
    h("div", { class: "mf-wrap mf-origin-grid" },
      h("div",
        h("p", { class: "mf-kicker" }, h("i"), "Why it exists"),
        h("h2", { class: "mf-origin-title" }, "Built by a designer.", h("br"), h("span", { class: "mf-gold" }, "Given to everyone."))),
      h("div", { class: "mf-origin-copy" },
        h("p", "I come from UI design, not framework engineering. Working in interfaces, I kept seeing good design lose its polish on the way to production: one default, one missing state, one grey browser dialog at a time."),
        h("p", "Lucid UI is my contribution back to the community that taught me. The design decisions I care about, built into something small, free and readable, so the next person starts from finished instead of from scratch."),
        h("p", { class: "mf-origin-ask" }, "If that resonates, build something with it, tell me what's missing, or send a pull request. It gets better with every person who uses it."))));
}

function Close(L) {
  return h("section", { class: "mf-close" },
    h("div", { class: "mf-wrap" },
      h("p", { class: "mf-kicker" }, h("i"), "Hold us to it"),
      h("h2", { class: "mf-close-title" }, "This is the bar. Every release gets measured against it."),
      h("div", { class: "mf-sign" },
        h("span", { class: "mf-sign-name" }, "Ezra"),
        h("span", { class: "mf-sign-role" }, "Maintainer, Lucid UI · October 2026")),
      h("div", { class: "mf-actions" },
        Button({ variant: "primary", size: "lg", href: L.playground, iconRight: "arrow-right" }, "See it in the sandbox"),
        Button({ size: "lg", href: L.docs, icon: "hash" }, "Read the docs"),
        Button({ size: "lg", href: L.github, icon: "external" }, "Contribute on GitHub"),
        Button({ size: "lg", variant: "ghost", icon: "copy", onClick: copyBrief }, "Copy the agent brief"))));
}

mountPage({
  site: "manifesto",
  main: L => [h("div", { class: "mf" }, Hero(), Beliefs(), Origin(), Close(L), Rail())],
  commands: BELIEFS.map((b, i) => ({ group: "Beliefs", label: `${number(i)} ${b.title}`, icon: "hexagon", run: jump(`belief-${i + 1}`) }))
});
