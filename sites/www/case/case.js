import { signal, computed, h } from "/lucid/index.js";
import { Button, Segmented, Icon, Tooltip, attachPopover } from "/lucid/ui/index.js";
import { mountPage, SectionHead, jump } from "/shared/chrome.js";
import { CodeWindow } from "/shared/code.js";

const STACK = [
  { key: "build", label: "Build tooling", detail: "Bundler, compiler, config", examples: "Vite, webpack, Babel" },
  { key: "render", label: "Rendering", detail: "Components and updates", examples: "React, Vue, Svelte" },
  { key: "style", label: "Styling", detail: "A system for visual decisions", examples: "Tailwind CSS, CSS modules" },
  { key: "parts", label: "Components", detail: "Menus, dialogs, selects, forms", examples: "shadcn/ui, Radix, MUI" },
  { key: "charts", label: "Charts", detail: "Data visualisation", examples: "Recharts, Chart.js" },
  { key: "state", label: "State", detail: "Shared, reactive data", examples: "Redux, Zustand" },
  { key: "agents", label: "AI guidance", detail: "Context agents can actually hold", examples: "Usually nothing" }
];

const LUCID_LAYER = [
  ["zap", "Signals", "State and updates, built in"],
  ["layers", "Components", "Finished, accessible, themed"],
  ["sparkles", "Design language", "Tokens for light and dark"],
  ["chart", "Charts", "With tooltips and tables"],
  ["alert-circle", "Diagnostics", "Every mistake, with its fix"],
  ["hash", "One-page API", "About 1,140 tokens, whole"]
];

const STEPS = [
  { key: "idea", label: "Idea", title: "From idea to something clickable, in one file.", text: "Add a stylesheet and a script tag, and write a component. There's no project to scaffold and no build to configure, so the first working screen arrives in minutes, not after setup.", proof: "No install, no bundler, no config files." },
  { key: "design", label: "Design", title: "The design system comes in the box.", text: "Space, type, colour, radius, depth and motion are tokens, in light and dark, from one list. Teams start from a finished look instead of a blank theme, and change it by overriding a few values.", proof: "Every --lucid-* token can be overridden." },
  { key: "build", label: "Build", title: "Real screens out of a few dozen parts.", text: "Layout, forms with validation, menus, selects, date pickers, dialogs, command menus, toasts, virtual lists and charts are designed together, so screens look consistent without anyone policing it.", proof: "30+ components and 8 chart types, one design language." },
  { key: "agents", label: "With agents", title: "AI writes it right the first time, more often.", text: "Agents read the entire API before they write a line, and when they slip, Lucid answers with a stable code and the fix, as data. Generate, run, read, repair, done.", proof: "About 1,140 tokens for the whole reference." },
  { key: "ship", label: "Ship", title: "Ship the files you wrote.", text: "What runs in the browser is what's in your editor: plain ES modules and CSS. Upload them to any host, from shared hosting to a CDN. Nothing to compile, nothing to eject.", proof: "This website ships exactly like that." },
  { key: "maintain", label: "Maintain", title: "Small enough to understand forever.", text: "The core is 5.8 KB with no dependencies, so there's no tree of packages to audit, upgrade or replace. A new teammate can read the whole runtime in an afternoon.", proof: "0 dependencies. A size budget enforced by tests." }
];

const COLUMNS = ["Lucid UI", "React", "Tailwind CSS", "shadcn/ui", "Svelte", "Plain CSS"];

const ROWS = [
  ["Build step required", ["no", "No"], ["partial", "Usually, for JSX"], ["yes", "Yes"], ["yes", "Yes"], ["yes", "Yes, a compiler"], ["no", "No"]],
  ["Runtime dependencies", ["good", "None"], ["partial", "react, react-dom"], ["good", "None at runtime"], ["partial", "React, Radix, more"], ["good", "Small runtime"], ["good", "None"]],
  ["Renders the interface", ["good", "Yes"], ["good", "Yes"], ["none", "No, styling only"], ["partial", "Through React"], ["good", "Yes"], ["none", "No"]],
  ["A finished visual design", ["good", "Built in"], ["none", "Bring your own"], ["partial", "Utilities, you design"], ["good", "Yes, copied in"], ["none", "Bring your own"], ["none", "You write it"]],
  ["Accessible components", ["good", "Built in, checked"], ["none", "Up to you"], ["none", "Up to you"], ["good", "Yes, via Radix"], ["none", "Up to you"], ["none", "Up to you"]],
  ["Charts", ["good", "Built in"], ["none", "Add a library"], ["none", "Add a library"], ["partial", "Via Recharts"], ["none", "Add a library"], ["none", "Add a library"]],
  ["Update model", ["good", "Fine-grained signals"], ["partial", "Re-renders, virtual DOM"], ["none", "Not applicable"], ["partial", "As React"], ["good", "Compiled, fine-grained"], ["none", "Not applicable"]],
  ["Whole API in an agent's context", ["good", "About 1,140 tokens"], ["partial", "Core, yes; ecosystem, no"], ["partial", "Large class vocabulary"], ["partial", "Per component"], ["partial", "Compact, plus compiler rules"], ["none", "Vast"]],
  ["Mistakes explained with a fix", ["good", "Coded diagnostics"], ["partial", "Dev warnings"], ["partial", "Build errors"], ["partial", "As React"], ["partial", "Compiler warnings"], ["none", "Silent"]],
  ["Ecosystem and community", ["partial", "Brand new"], ["good", "Enormous"], ["good", "Huge"], ["good", "Large"], ["good", "Strong"], ["good", "Universal"]]
];

const RIVALS = {
  react: {
    name: "React",
    good: "The most widely used way to build interfaces, with an ecosystem for almost anything and a huge hiring pool. React Native takes the same ideas to phones.",
    differ: "React re-runs components to find what changed and leaves design, components and charts to other libraries, all held together by a build. Lucid updates only what a signal touches and ships the rest of the layer with it.",
    pick: "Pick React for large existing codebases, native mobile, or when you depend on its ecosystem.",
    lucid: "Pick Lucid for new interfaces where you want the whole layer, readable source and no build."
  },
  tailwind: {
    name: "Tailwind CSS",
    good: "A fast, consistent way to style anything with utility classes, without naming things or fighting the cascade. Loved for good reason.",
    differ: "Tailwind is styling only: you still need something to render, manage state and build components, and markup fills up with classes. Lucid components carry their styling, so you write intent instead.",
    pick: "Pick Tailwind to style an app built on another framework, or to design every pixel yourself.",
    lucid: "Pick Lucid when you'd rather start from a finished design language and write Button({ variant: \"primary\" })."
  },
  shadcn: {
    name: "shadcn/ui",
    good: "Beautiful, accessible components that you copy into your own codebase and own completely, built on Radix and Tailwind.",
    differ: "It sits on top of React, Radix and Tailwind, so you adopt all three plus a build. Lucid gives you comparable components with no stack underneath them and one small API above them.",
    pick: "Pick shadcn/ui if you're already on React and Tailwind and want to own component source.",
    lucid: "Pick Lucid when you want the same polish without the three-library foundation."
  },
  svelte: {
    name: "Svelte",
    good: "A compiler that turns components into lean, fine-grained updates. Pleasant to write and fast in the browser.",
    differ: "Svelte needs its compiler and its own file format, and leaves design, components and charts to you. Lucid gets fine-grained updates from plain JavaScript you can run without compiling.",
    pick: "Pick Svelte if you like its syntax and want a mature framework with a growing ecosystem.",
    lucid: "Pick Lucid for plain modules, a finished design system, and an API an agent can hold whole."
  },
  css: {
    name: "Plain HTML and CSS",
    good: "The web platform itself: no dependencies, no lock-in, fully understood by browsers forever. Modern CSS is extraordinary.",
    differ: "You write and maintain every component, state change, accessibility detail and chart by hand. Lucid stays just as close to the platform, but does that work for you.",
    pick: "Pick plain HTML and CSS for mostly static pages with little interaction.",
    lucid: "Pick Lucid the moment the interface needs state, forms, menus or data."
  }
};

const REACT_CODE = `
import { useState } from "react";

export function Counter() {
  const [count, setCount] = useState(0);
  return (
    <button
      className="rounded-lg bg-neutral-900 px-4 py-2 text-white
        hover:bg-neutral-800 focus-visible:outline-2"
      onClick={() => setCount(count + 1)}
    >
      Clicked {count} times
    </button>
  );
}
`;

const LUCID_CODE = `
import { signal, mount } from "@lucidui-dev/core";
import { Button } from "@lucidui-dev/core/ui";

function Counter() {
  const count = signal(0);
  return Button(
    { variant: "primary", onClick: () => count.value++ },
    "Clicked ", count, " times"
  );
}

mount(Counter, "#app");
`;

function Hero(L) {
  return h("section", { class: "site-wrap case-hero" },
    h("div", { class: "section-eyebrow" }, h("span", { class: "section-eyebrow-dot" }), "the case for lucid"),
    h("h1", { class: "case-title" }, "Most UI stacks are seven tools ", h("span", { class: "case-title-soft" }, "pretending to be one.")),
    h("p", { class: "case-lead" }, "A framework to render, a CSS system to style, a component kit, a chart library, a state library, a build to hold them together, and nothing at all for the AI agent writing the code. Lucid UI is one small layer that does the work of all seven."),
    h("div", { class: "case-ctas" },
      Button({ variant: "primary", size: "lg", href: L.playground, iconRight: "arrow-right" }, "See it in the sandbox"),
      Button({ variant: "secondary", size: "lg", onClick: jump("compare"), icon: "table" }, "Jump to the comparison")),
    h("dl", { class: "case-numbers" },
      [["5.8 KB", "core, gzipped"], ["0", "dependencies"], ["0", "build steps"], ["1,140", "tokens for the whole API"]]
        .map(([value, label]) => h("div", h("dt", value), h("dd", label)))));
}

function Stack() {
  const mode = signal("typical");
  const lucid = computed(() => mode.value === "lucid");
  return h("section", { class: "case-section", id: "stack" },
    h("div", { class: "site-wrap stack-wrap" },
      h("div", { class: "stack-copy" },
        SectionHead({
          eyebrow: "the stack",
          title: "Seven layers, or one.",
          lead: "Every layer in a typical stack is a separate project with its own docs, upgrades and opinions. Flip the switch to see what Lucid replaces."
        }),
        Segmented({
          value: mode,
          aria: { label: "Stack" },
          options: [{ value: "typical", label: "A typical stack" }, { value: "lucid", label: "With Lucid UI" }]
        }),
        h("p", { class: "stack-note" }, () => (lucid.value
          ? "One layer, one API, one design language, and the browser does the rest."
          : "Seven projects to learn, wire together, upgrade and keep consistent."))),
      h("div", { class: "stack-visual", "data-mode": mode },
        h("div", { class: "stack-stage" },
        h("div", { class: "stack-layers", "aria-hidden": () => (lucid.value ? "true" : "false") },
          STACK.map((layer, i) => h("div", { class: "stack-layer", style: { "--i": i, "--r": STACK.length - 1 - i, "--d": i - (STACK.length - 1) / 2 } },
            h("span", { class: "stack-layer-name" }, layer.label),
            h("span", { class: "stack-layer-detail" }, layer.detail),
            h("span", { class: "stack-layer-tools" }, layer.examples)))),
        h("div", { class: "stack-lucid", "aria-hidden": () => (lucid.value ? "false" : "true") },
          h("div", { class: "stack-lucid-head" },
            h("img", { src: "/media/logo/lucidui-icon.svg", alt: "", width: 34, height: 34 }),
            h("div", h("b", "Lucid UI"), h("span", "one layer · no build"))),
          h("ul", LUCID_LAYER.map(([icon, title, text]) => h("li",
            Icon({ name: icon, size: 15 }),
            h("span", h("b", title), h("span", text))))))),
        h("div", { class: "stack-browser" }, Icon({ name: "monitor", size: 14 }), "The browser"))));
}

function Process() {
  const active = signal("idea");
  const step = computed(() => STEPS.find(item => item.key === active.value));
  const index = computed(() => STEPS.findIndex(item => item.key === active.value));
  return h("section", { class: "case-section case-tint", id: "process" },
    h("div", { class: "site-wrap" },
      SectionHead({
        eyebrow: "where it fits",
        title: "From the first idea to year three.",
        lead: "Lucid isn't one more tool in the process. It shortens every step of it. Pick a stage.",
        align: "center"
      }),
      h("div", { class: "process" },
        h("ol", { class: "process-rail", role: "tablist", aria: { label: "Stages" } },
          STEPS.map((item, i) => h("li",
            h("button", {
              type: "button",
              role: "tab",
              class: "process-step",
              "aria-selected": () => active.value === item.key,
              "data-done": () => i < index.value,
              onClick: () => { active.value = item.key; },
              onKeydown: event => {
                const move = event.key === "ArrowRight" ? 1 : event.key === "ArrowLeft" ? -1 : 0;
                if (!move) return;
                event.preventDefault();
                const next = STEPS[(i + move + STEPS.length) % STEPS.length];
                active.value = next.key;
                event.currentTarget.closest("ol").querySelectorAll("button")[STEPS.indexOf(next)].focus();
              }
            },
            h("span", { class: "process-dot" }),
            h("span", { class: "process-label" }, item.label))))),
        () => {
          const current = step.value;
          return h("article", { class: "process-card", role: "tabpanel" },
            h("div", { class: "process-count" }, `${String(index.peek() + 1).padStart(2, "0")} / ${String(STEPS.length).padStart(2, "0")}`),
            h("h3", { class: "process-title" }, current.title),
            h("p", { class: "process-text" }, current.text),
            h("div", { class: "process-proof" }, Icon({ name: "check-circle", size: 15 }), current.proof));
        })));
}

function Code() {
  return h("section", { class: "case-section", id: "code" },
    h("div", { class: "site-wrap" },
      SectionHead({
        eyebrow: "side by side",
        title: "Same button. Less to carry.",
        lead: "A counter in React with Tailwind, and the same counter in Lucid UI. Both are good code. One needs a compiler, a bundler and a class list; the other is the file the browser runs."
      }),
      h("div", { class: "code-pair" },
        h("div", { class: "code-side" },
          h("div", { class: "code-side-head" }, h("b", "React + Tailwind CSS"), h("span", "JSX, compiled and bundled")),
          CodeWindow({ file: "Counter.jsx", code: REACT_CODE }),
          h("ul", { class: "code-facts" },
            h("li", Icon({ name: "layers", size: 14 }), "Needs a JSX compiler and a bundler"),
            h("li", Icon({ name: "sliders", size: 14 }), "Styling is spelled out in classes"),
            h("li", Icon({ name: "zap", size: 14 }), "The component re-runs on every click"))),
        h("div", { class: "code-side code-side-lucid" },
          h("div", { class: "code-side-head" }, h("b", "Lucid UI"), h("span", "Plain JavaScript, runs as written")),
          CodeWindow({ file: "counter.js", code: LUCID_CODE }),
          h("ul", { class: "code-facts" },
            h("li", Icon({ name: "check-circle", size: 14 }), "No compiler, no bundler"),
            h("li", Icon({ name: "check-circle", size: 14 }), "Intent, not classes: variant: \"primary\""),
            h("li", Icon({ name: "check-circle", size: 14 }), "Only the number's text node updates"))))));
}

function Community() {
  const trigger = h("button", { type: "button", class: "community-trigger", aria: { label: "How Lucid UI is built in the open" } },
    Icon({ name: "users", size: 12 }), "Built in the open", Icon({ name: "chevron-right", size: 12 }));
  const point = (icon, text) => h("li", Icon({ name: icon, size: 14 }), h("span", text));
  const panel = h("div", { class: "lucid-pop community-pop", popover: "auto", role: "dialog", aria: { label: "Community" } },
    h("div", { class: "community-eyebrow" }, h("span", { class: "section-eyebrow-dot" }), "community"),
    h("h3", "Brand new, and built in the open."),
    h("p", "The ecosystem is young, but nothing about Lucid UI is closed. Anyone can use it, fork it and help build it."),
    h("ul",
      point("check-circle", "MIT licensed: use it, change it, ship it, commercially or not."),
      point("external", "Contributions arrive as pull requests on GitHub."),
      point("target", "Every change is held to the size budget, the tests and the one-page API."),
      point("layers", "A governance model and a proposal process for API changes will be published before 1.0.")),
    h("div", { class: "community-foot" },
      Button({ size: "sm", href: "https://github.com/lucidui-dev/lucidui", target: "_blank", rel: "noopener", icon: "external" }, "github.com/lucidui-dev")));
  attachPopover(trigger, panel, { placement: "top-start" });
  return [trigger, panel];
}

function Matrix() {
  const focus = signal(null);
  const mark = kind => ({ good: "check", no: "check", yes: "x", none: "x", partial: "more" })[kind];
  const tone = kind => ({ good: "good", no: "good", yes: "bad", none: "bad", partial: "mid" })[kind];
  return h("section", { class: "case-section case-tint", id: "compare" },
    h("div", { class: "site-wrap" },
      SectionHead({
        eyebrow: "compare",
        title: "An honest comparison.",
        lead: "Good tools, each built for a job. Here's where Lucid UI lands next to the ones teams reach for most, including the row where it loses.",
        align: "center"
      }),
      h("div", { class: "matrix-scroll" },
        h("table", { class: "matrix", "data-focus": focus },
          h("thead", h("tr",
            h("th", { scope: "col" }, h("span", { class: "sr-only" }, "Feature")),
            COLUMNS.map((name, c) => h("th", {
              scope: "col",
              class: c === 0 ? "matrix-lucid" : null,
              onPointerenter: () => { focus.value = String(c); },
              onPointerleave: () => { focus.value = null; }
            }, c === 0 ? h("span", { class: "matrix-brand" }, h("img", { src: "/media/logo/lucidui-icon.svg", alt: "", width: 18, height: 18 }), name) : name)))),
          h("tbody", ROWS.map(([label, ...cells]) => h("tr",
            h("th", { scope: "row" }, label),
            cells.map(([kind, text], c) => h("td", {
              class: c === 0 ? "matrix-lucid" : null,
              "data-col": String(c),
              "data-tone": tone(kind)
            },
            h("span", { class: "matrix-cell" },
              h("span", { class: "matrix-mark", "aria-hidden": "true" }, Icon({ name: mark(kind), size: 12, stroke: 3 })),
              h("span", text)),
            c === 0 && label === "Ecosystem and community" ? Community() : null))))))),
      h("p", { class: "matrix-note" }, "Compared in October 2026 in good faith, from each project's own documentation. Spot something unfair? Tell us at ", h("a", { href: "mailto:hello@lucidui.dev" }, "hello@lucidui.dev"), ".")));
}

function Verdicts() {
  const pick = signal("react");
  const rival = computed(() => RIVALS[pick.value]);
  return h("section", { class: "case-section", id: "versus" },
    h("div", { class: "site-wrap" },
      SectionHead({
        eyebrow: "versus",
        title: "When to pick what.",
        lead: "No tool is right for everything. Choose a comparison."
      }),
      Segmented({
        value: pick,
        aria: { label: "Compare with" },
        class: "versus-switch",
        options: Object.entries(RIVALS).map(([value, item]) => ({ value, label: item.name }))
      }),
      () => {
        const item = rival.value;
        return h("div", { class: "versus" },
          h("article", { class: "versus-card" },
            h("div", { class: "versus-kicker" }, `What ${item.name} does well`),
            h("p", { class: "versus-text" }, item.good),
            h("div", { class: "versus-kicker" }, "How Lucid UI differs"),
            h("p", { class: "versus-text" }, item.differ)),
          h("div", { class: "versus-picks" },
            h("div", { class: "versus-pick" }, h("span", { class: "versus-pick-label" }, item.name), h("p", item.pick)),
            h("div", { class: "versus-pick versus-pick-lucid" }, h("span", { class: "versus-pick-label" }, h("img", { src: "/media/logo/lucidui-icon.svg", alt: "", width: 16, height: 16 }), "Lucid UI"), h("p", item.lucid))));
      }));
}

function Honest() {
  const item = (icon, title, text) => h("li", { class: "honest-item" },
    h("span", { class: "principle-icon" }, Icon({ name: icon, size: 17 })),
    h("div", h("h3", title), h("p", text)));
  return h("section", { class: "case-section case-tint", id: "honest" },
    h("div", { class: "site-wrap honest" },
      SectionHead({
        eyebrow: "fair warning",
        title: "When Lucid isn't the answer. Yet.",
        lead: "We'd rather you choose Lucid for the right reasons. Today, look elsewhere if you need one of these."
      }),
      h("ul", { class: "honest-list" },
        item("users", "A vast ecosystem", "If your product leans on hundreds of ready-made integrations, React's ecosystem is unmatched. Lucid's is brand new."),
        item("monitor", "Native mobile apps", "Lucid builds for the browser. For native iOS and Android from one codebase, React Native or a native toolkit is the tool."),
        item("layers", "Server rendering today", "Lucid renders in the browser. Pages that must arrive fully rendered from the server, for heavy SEO, are on our roadmap, not in the box."),
        item("clock", "A long track record", "Lucid UI is at version 0.3. If you need a decade of production history before you commit, check back after 1.0."))));
}

function Close(L) {
  return h("section", { class: "case-section", id: "close" },
    h("div", { class: "site-wrap" },
      h("div", { class: "case-close" },
        h("div", { class: "case-close-copy" },
          h("div", { class: "section-eyebrow" }, h("span", { class: "section-eyebrow-dot" }), "the short version"),
          h("h2", "One layer. Readable to the last line. Built for people and the agents working beside them."),
          h("p", "Try the sandbox, then read the source of this page. It's all the same few kilobytes.")),
        h("div", { class: "case-close-actions" },
          Button({ variant: "primary", size: "lg", href: L.playground, iconRight: "arrow-right" }, "Open the sandbox"),
          Tooltip({ label: "The JavaScript behind this page" }, Button({ variant: "secondary", size: "lg", href: "/case/case.js", icon: "hash" }, "Read this page's source"))))));
}

mountPage({
  site: "case",
  main: L => [Hero(L), Stack(), Process(), Code(), Matrix(), Verdicts(), Honest(), Close(L)],
  commands: [
    { group: "On this page", label: "The stack", icon: "layers", run: jump("stack") },
    { group: "On this page", label: "Where it fits", icon: "target", run: jump("process") },
    { group: "On this page", label: "Side by side", icon: "hash", run: jump("code") },
    { group: "On this page", label: "Comparison table", icon: "table", run: jump("compare") },
    { group: "On this page", label: "When to pick what", icon: "check-circle", run: jump("versus") }
  ]
});
