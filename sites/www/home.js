import { signal, computed, h, onDiagnostic, version } from "/lucid/index.js";
import {
  Button, Segmented, Switch, Checkbox, Select, DatePicker, Input, Field, Text, Avatar, AvatarStack,
  Icon, Tooltip, toast, form, required, email
} from "/lucid/ui/index.js";
import { StatTile, DotSparkline, DotColumns, Waffle, DotDumbbell, DotCalendar, ChartCard } from "/lucid/viz/index.js";
import { mountPage, commandOpen, SectionHead, jump, DownloadButton, copyBrief } from "/shared/chrome.js";
import { CodeWindow } from "/shared/code.js";
import { DotField } from "/shared/field.js";

const FACTS = { core: "5.8 KB", tokens: "1,140", deps: "0" };

let LINKS;

const random = seed => () => {
  seed = (seed * 16807) % 2147483647;
  return (seed - 1) / 2147483646;
};

function HeroStage() {
  const range = signal("week");
  const team = signal("web");
  const notify = signal(true);
  const digest = signal(false);
  const ranges = {
    day: { label: "today", series: [3, 5, 4, 6, 8, 7, 9, 8, 11, 10, 12, 14], spread: [2, 5, 9, 6, 3, 1] },
    week: { label: "this week", series: [18, 22, 19, 25, 24, 28, 26, 31, 29, 35, 33, 38], spread: [4, 9, 14, 11, 6, 3] },
    month: { label: "this month", series: [62, 70, 68, 81, 77, 88, 92, 90, 101, 108, 104, 121], spread: [11, 26, 38, 30, 17, 9] }
  };
  const factor = computed(() => ({ web: 1, platform: 1.35, mobile: 0.7 })[team.value]);
  const current = computed(() => ranges[range.value]);
  const shipped = computed(() => current.value.series.map(v => Math.round(v * factor.value)));
  const spread = computed(() => current.value.spread.map(v => Math.max(0, Math.round(v * factor.value))));
  const people = ["Mara Okonkwo", "Theo Varga", "Priya Anand", "Jonas Ferreira", "Ines Halvorsen"];

  return h("div", { class: "stage", role: "group", aria: { label: "Live Lucid UI components" } },
    h("div", { class: "stage-grid" },
      h("div", { class: "stage-card stage-stat" },
        StatTile({
          label: () => `Issues shipped ${current.value.label}`,
          value: () => shipped.value.at(-1),
          delta: () => ((shipped.value.at(-1) - shipped.value.at(-2)) / shipped.value.at(-2)) * 100,
          deltaLabel: "vs last period"
        }),
        h("div", { class: "stage-spark" }, DotSparkline({ data: shipped, height: 76, label: "Issues shipped trend" })),
        h("div", { class: "stage-people" },
          AvatarStack({ size: 24 }, people.map(name => Avatar({ name, size: 24 }))),
          h("span", "5 people shipping"))),
      h("div", { class: "stage-card stage-chart" },
        h("div", { class: "stage-card-head" },
          h("div", h("div", { class: "stage-title" }, "Cycle time"), h("div", { class: "stage-sub" }, "Days from start to done")),
          Segmented({
            value: range,
            size: "sm",
            aria: { label: "Period" },
            options: [{ value: "day", label: "Day" }, { value: "week", label: "Week" }, { value: "month", label: "Month" }]
          })),
        DotColumns({
          data: () => ["<1d", "1–2d", "2–4d", "4–7d", "1–2w", "2w+"].map((label, i) => ({ label, value: spread.value[i] })),
          height: 172,
          unit: "issues",
          label: "Cycle time distribution"
        })),
      h("div", { class: "stage-card stage-controls" },
        h("div", { class: "stage-title" }, "Release"),
        Select({
          value: team,
          size: "sm",
          aria: { label: "Team" },
          options: [
            { value: "web", label: "Web App", icon: () => h("span", { class: "stage-team", style: { "--h": 160 } }, "W") },
            { value: "platform", label: "Platform", icon: () => h("span", { class: "stage-team", style: { "--h": 250 } }, "P") },
            { value: "mobile", label: "Mobile", icon: () => h("span", { class: "stage-team", style: { "--h": 20 } }, "M") }
          ]
        }),
        h("div", { class: "stage-toggles" },
          Switch({ bind: notify, label: "Notify on deploy" }),
          Switch({ bind: digest, label: "Weekly digest" })),
        Button({
          variant: "primary",
          icon: "zap",
          onClick: () => toast(`Release ${version} shipped`, {
            tone: "success",
            description: notify.peek() ? "The team has been notified." : "Notifications are off.",
            action: { label: "Undo", onClick: () => toast("Release rolled back", { icon: "corner-down-left" }) }
          })
        }, "Ship release"))),
    h("p", { class: "stage-caption" },
      Icon({ name: "sparkles", size: 14 }),
      "Live components, not a screenshot. Change the period, switch teams, ship a release."));
}

const AGENTS = [
  "Claude Code", "Cursor", "GitHub Copilot", "OpenAI Codex", "ChatGPT", "Windsurf", "Cline", "Roo Code", "Aider",
  "Continue", "Zed", "Gemini CLI", "Replit Agent", "Bolt", "Lovable", "v0", "Amazon Q Developer", "Junie",
  "Devin", "Amp", "Kilo Code", "Warp", "Augment Code", "OpenHands", "Tabnine", "Qwen Code", "DeepSeek"
];

function AgentTicker() {
  const run = hidden => h("ul", { class: "ticker-run", "aria-hidden": hidden ? "true" : undefined },
    AGENTS.map(name => h("li", h("span", { class: "ticker-dot" }), name)));
  return h("div", { class: "ticker" },
    h("p", { class: "ticker-label" }, `Works with ${AGENTS.length} coding agents, and any that can read a web page`),
    h("div", { class: "ticker-track", role: "region", aria: { label: "Coding agents that work with Lucid UI" } },
      h("div", { class: "ticker-belt" }, run(false), run(true))));
}

function Hero() {
  return h("section", { class: "hero" },
    DotField(),
    h("div", { class: "site-wrap hero-inner" },
      h("a", { class: "hero-chip", href: LINKS.playground },
        h("span", { class: "hero-chip-dot" }),
        "New",
        h("span", { class: "hero-chip-sep" }),
        "Eight live demos in the sandbox",
        Icon({ name: "arrow-right", size: 13 })),
      h("h1", { class: "hero-title" }, h("span", { class: "hero-line" }, "Interfaces with taste,"), " ", h("span", { class: "hero-line" }, "in a few kilobytes.")),
      h("p", { class: "hero-sub" },
        "The UI runtime your AI agent can learn in a single read. The entire API is ", FACTS.tokens, " tokens, and every mistake comes back with a code and a fix, so agents repair their own work instead of guessing."),
      h("div", { class: "hero-ctas" },
        DownloadButton({ size: "lg", label: "Download Lucid UI" }),
        Button({ variant: "secondary", size: "lg", href: LINKS.playground, iconRight: "arrow-right" }, "Open the sandbox")),
      h("button", { class: "hero-agent", type: "button", onClick: copyBrief },
        Icon({ name: "sparkles", size: 14 }),
        h("span", { class: "hero-agent-ask" }, "Building with an agent? Tell it:"),
        h("code", "Read lucidui.dev/llms-full.txt first"),
        Icon({ name: "copy", size: 13 })),
      h("ul", { class: "hero-facts", aria: { label: "At a glance" } },
        h("li", h("b", FACTS.core), " core, gzipped"),
        h("li", h("b", `${FACTS.tokens}-token`), " API"),
        h("li", h("b", FACTS.deps), " dependencies"),
        h("li", h("b", "No"), " build step")),
      AgentTicker()),
    h("div", { class: "site-wrap" }, HeroStage()));
}

const COUNTER = `
import { signal, computed, mount } from "@lucidui-dev/core";
import { Button, Text } from "@lucidui-dev/core/ui";

function Counter() {
  const count = signal(0);
  const double = computed(() => count.value * 2);
  return [
    Button(
      { variant: "primary", onClick: () => count.value++ },
      "Clicked ", count, " times"
    ),
    Text("Twice that is ", double)
  ];
}

mount(Counter, "#app");
`;

function Counter() {
  const count = signal(0);
  const double = computed(() => count.value * 2);
  return [
    Button(
      { variant: "primary", onClick: () => count.value++ },
      "Clicked ", count, " times"
    ),
    Text("Twice that is ", double)
  ];
}

function Signals() {
  const point = (icon, title, text) => h("li", { class: "point" },
    h("span", { class: "point-icon" }, Icon({ name: icon, size: 16 })),
    h("div", h("div", { class: "point-title" }, title), h("p", { class: "point-text" }, text)));
  return h("section", { class: "section", id: "signals" },
    h("div", { class: "site-wrap split" },
      h("div", { class: "split-copy" },
        SectionHead({
          eyebrow: "signals",
          title: "Write it once. It keeps itself up to date.",
          lead: "State lives in signals. When one changes, Lucid updates exactly the text, attribute or row that reads it, and nothing else."
        }),
        h("ul", { class: "points" },
          point("zap", "Components run once", "No re-renders to reason about and no rules about where hooks can go."),
          point("target", "Only what changed is touched", "Fine-grained updates straight to the DOM, with no virtual DOM in between."),
          point("layers", "Plain functions all the way down", "A component is a function that returns elements. That is the whole model."))),
      CodeWindow({ file: "counter.js", code: COUNTER, class: "split-code" },
        h("div", { class: "preview-label" }, h("span", { class: "preview-live" }), "Running on this page"),
        h("div", { class: "preview-stage" }, Counter()))));
}

function Mistake() {
  const result = signal(null);
  const trigger = () => {
    const found = [];
    const off = onDiagnostic(d => found.push(d));
    Button({ icon: "x" });
    off();
    const { element, ...rest } = found[0];
    result.value = rest;
  };
  return h("div", { class: "mistake" },
    () => (result.value
      ? h("pre", { class: "mistake-out", aria: { live: "polite" } }, h("code",
          "{\n",
          ...Object.entries(result.value).map(([key, value], i, all) => [
            "  ", h("span", { class: "tok-prop" }, key), ": ",
            h("span", { class: "tok-str" }, JSON.stringify(value)),
            i < all.length - 1 ? ",\n" : "\n"
          ]),
          "}"))
      : h("div", { class: "mistake-empty" }, "Build a button with no label and see what Lucid reports.")),
    h("div", { class: "mistake-actions" },
      Button({ size: "sm", icon: "alert-circle", onClick: trigger }, "Make a mistake"),
      () => (result.value ? Button({ size: "sm", variant: "ghost", onClick: () => { result.value = null; } }, "Reset") : null)));
}

function Agents() {
  const card = (cls, eyebrow, title, text, body) => h("article", { class: ["agent-card", cls] },
    h("div", { class: "card-eyebrow" }, eyebrow),
    h("h3", { class: "card-title" }, title),
    h("p", { class: "card-text" }, text),
    body);
  const llms = `
# Lucid UI

> A small, dependency-free UI runtime for the web.

Read https://docs.lucidui.dev/docs/API.md in full before writing Lucid UI code.
It is the complete API and is kept short so it fits in context.
`;
  return h("section", { class: "section section-tint", id: "agents" },
    h("div", { class: "site-wrap" },
      SectionHead({
        eyebrow: "made for agents",
        title: "Built for the AI writing your interface.",
        lead: "Agents were trained on frameworks that are too big to hold in their heads. Lucid is small enough to read whole, and it explains its own mistakes.",
        align: "center"
      }),
      h("div", { class: "agent-grid" },
        card("agent-api", "context", "The whole API fits in the prompt.", "The complete reference is one page. An agent reads all of it before it writes a line, so it never has to half-remember.",
          h("div", { class: "agent-figure" },
            h("div", { class: "agent-number" }, FACTS.tokens, h("small", "tokens")),
            h("div", { class: "agent-number-label" }, "for the entire API reference"),
            CodeWindow({ file: "llms.txt", code: llms, lang: "text", icon: "sparkles", class: "code-compact" }))),
        card("agent-diag", "diagnostics", "Mistakes explain themselves.", "Every problem has a stable code, a plain message and the fix, delivered as data. Generate, run, read, repair.",
          Mistake()),
        card("agent-a11y", "defaults", "Correct by default.", "The easy way to write Lucid is also the accessible way. Checks run as you build, not in an audit later.",
          h("ul", { class: "checks" },
            ["Buttons without a name", "Images without alt text", "Clicks on elements keyboards can't reach", "Focus, keyboard and ARIA in every component", "Reduced motion respected everywhere"]
              .map(text => h("li", Icon({ name: "check-circle", size: 15 }), text)))))));
}

function Components() {
  const assignee = signal("priya");
  const due = signal(null);
  const notify = signal(true);
  const plan = signal("pro");
  const agree = signal(true);
  const signup = form({ email: { value: "", rules: [required("Enter your email"), email()] } });
  const join = signup.submit(values => {
    toast("You're on the list", { tone: "success", description: values.email });
    signup.reset();
  });
  const tile = (cls, label, ...body) => h("div", { class: ["tile", cls] },
    h("div", { class: "tile-label" }, label),
    h("div", { class: "tile-body" }, body));
  const people = [
    ["mara", "Mara Okonkwo", "Engineering lead"], ["theo", "Theo Varga", "Backend"], ["priya", "Priya Anand", "Design"],
    ["jonas", "Jonas Ferreira", "Frontend"], ["ines", "Ines Halvorsen", "iOS"], ["kenji", "Kenji Moreau", "Infrastructure"]
  ].map(([value, label, hint]) => ({ value, label, hint, keywords: hint, icon: () => Avatar({ name: label, size: 18 }) }));

  return h("section", { class: "section", id: "components" },
    h("div", { class: "site-wrap" },
      SectionHead({
        eyebrow: "components",
        title: "Components that feel finished.",
        lead: "Buttons, menus, selects, dates, dialogs, forms and toasts, designed together and wired for keyboards and screen readers. Every one below is live."
      }),
      h("div", { class: "bento" },
        tile("span-3", "Button",
          h("div", { class: "tile-row" },
            Button({ variant: "primary" }, "Primary"),
            Button({}, "Secondary"),
            Button({ variant: "ghost" }, "Ghost")),
          h("div", { class: "tile-row" },
            Button({ variant: "accent", icon: "plus", kbd: "C" }, "New issue"),
            Button({ variant: "danger", icon: "trash" }, "Delete"),
            Tooltip({ label: "Copy link" }, Button({ icon: "link", aria: { label: "Copy link" } })))),
        tile("span-3", "Select",
          Select({ value: assignee, options: people, searchable: true, size: "md", width: "260px", searchPlaceholder: "Assign to…", aria: { label: "Assignee" } }),
          h("div", { class: "tile-note" }, "Searchable, with keyboard navigation.")),
        tile("span-2", "Date picker",
          DatePicker({ value: due, size: "md", placeholder: "Set due date", aria: { label: "Due date" } }),
          h("div", { class: "tile-note" }, "Try the arrow keys and Page Down.")),
        tile("span-2", "Command menu",
          Button({ icon: "command", kbd: ["mod", "K"], onClick: () => { commandOpen.value = true; } }, "Open"),
          h("div", { class: "tile-note" }, "Fuzzy search with groups and shortcuts.")),
        tile("span-2", "Toast",
          Button({
            icon: "check-circle",
            onClick: () => toast("Issue moved to Done", { tone: "success", description: "WEB-214 · Export issues to CSV", action: { label: "Undo", onClick: () => toast("Undone", { icon: "corner-down-left" }) } })
          }, "Show a toast"),
          h("div", { class: "tile-note" }, "With an Undo action, instead of a confirm prompt.")),
        tile("span-3", "Form validation",
          h("form", { class: "tile-form", onSubmit: join, novalidate: true },
            Field({ field: signup.fields.email },
              Input({ type: "email", bind: signup.fields.email.value, placeholder: "you@company.com", icon: "inbox", aria: { label: "Email" } })),
            Button({ type: "submit", variant: "primary" }, "Join")),
          h("div", { class: "tile-note" }, "Errors appear when you leave the field or submit.")),
        tile("span-3", "Toggles",
          h("div", { class: "tile-stack" },
            Segmented({ value: plan, aria: { label: "Plan" }, options: [{ value: "free", label: "Free" }, { value: "pro", label: "Pro" }, { value: "team", label: "Team" }] }),
            Switch({ bind: notify, label: "Email me when something ships" }),
            Checkbox({ bind: agree, label: "Remember this device" }))))));
}

function Charts() {
  const rand = random(7);
  const weeks = ["Jul 7", "Jul 14", "Jul 21", "Jul 28", "Aug 4", "Aug 11", "Aug 18", "Aug 25", "Sep 1", "Sep 8", "Sep 15", "Sep 22"];
  const created = [14, 11, 17, 13, 19, 15, 12, 18, 27, 16, 13, 15];
  const done = [9, 12, 11, 15, 12, 17, 16, 13, 14, 22, 19, 17];
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const days = Array.from({ length: 36 * 7 }, (_, i) => {
    const date = today.getTime() - (36 * 7 - 1 - i) * 86400000;
    const weekday = new Date(date).getDay();
    const base = weekday === 0 || weekday === 6 ? 1 : 6;
    return { date, value: Math.max(0, Math.round(base * rand() * 1.8 + (rand() < 0.08 ? 9 : 0) - 1)) };
  });
  const status = [
    { label: "In progress", value: 9, color: "var(--lucid-series-4)" },
    { label: "In review", value: 5, color: "var(--lucid-series-3)" },
    { label: "Todo", value: 14, color: "var(--lucid-ink-3)" },
    { label: "Backlog", value: 22, color: "var(--lucid-ink-3)", hollow: true }
  ];
  const cycle = [["Under 1d", 4], ["1–2d", 9], ["2–4d", 17], ["4–7d", 12], ["1–2w", 6], ["2w+", 3]].map(([label, value]) => ({ label, value }));

  return h("section", { class: "section section-tint", id: "charts" },
    h("div", { class: "site-wrap" },
      SectionHead({
        eyebrow: "charts",
        title: "Charts that stay calm.",
        lead: "Drawn with one countable mark instead of bars and pies. Every chart has a tooltip, a legend and a table view, and every palette is checked for colour blindness in light and dark.",
        align: "center"
      }),
      h("div", { class: "chart-grid" },
        h("div", { class: "span-4" }, ChartCard({
          title: "Created vs completed",
          subtitle: "Issues per week. The stem is the gap.",
          table: () => ({ columns: ["Week of", "Created", "Completed"], rows: weeks.map((w, i) => [w, created[i], done[i]]) })
        }, DotDumbbell({
          labels: weeks,
          series: [
            { name: "Created", color: "var(--lucid-series-2)", values: created },
            { name: "Completed", color: "var(--lucid-series-1)", values: done }
          ],
          height: 220,
          label: "Issues created and completed per week"
        }))),
        h("div", { class: "span-2" }, ChartCard({
          title: "Open work",
          subtitle: "One dot per 2% of open issues.",
          table: () => ({ columns: ["Status", "Issues"], rows: status.map(s => [s.label, s.value]) })
        }, Waffle({ segments: status, columns: 10, rows: 5, label: "Open issues by status" }))),
        h("div", { class: "span-2" }, ChartCard({
          title: "Cycle time",
          subtitle: "Start to done.",
          table: () => ({ columns: ["Cycle time", "Issues"], rows: cycle.map(c => [c.label, c.value]) })
        }, DotColumns({ data: cycle, height: 190, unit: "issues", label: "Cycle time distribution" }))),
        h("div", { class: "span-4" }, ChartCard({
          title: "Activity",
          subtitle: "Size and shade both carry the value.",
          table: () => ({ columns: ["Day", "Events"], rows: days.filter(d => d.value).map(d => [new Date(d.date).toDateString(), d.value]) })
        }, DotCalendar({ days, unit: "events", label: "Daily activity" }))))));
}

function Principles() {
  const item = (icon, title, text) => h("li", { class: "principle" },
    h("span", { class: "principle-icon" }, Icon({ name: icon, size: 18 })),
    h("h3", { class: "principle-title" }, title),
    h("p", { class: "principle-text" }, text));
  return h("section", { class: "section", id: "principles" },
    h("div", { class: "site-wrap" },
      SectionHead({
        eyebrow: "principles",
        title: "Nothing between you and the browser.",
        lead: "Lucid outputs ordinary DOM from ordinary JavaScript modules. No compiler, no bundler, no runtime you can't read in an afternoon."
      }),
      h("a", { class: "manifesto-link", href: LINKS.manifesto }, h("span", { class: "manifesto-link-dot" }), "Read the manifesto: nine things Lucid believes", Icon({ name: "arrow-right", size: 14 })),
      h("ul", { class: "principles" },
        item("monitor", "Browser-native", "Plain elements and plain events. What you write is what the browser runs."),
        item("zap", "No build step", "Import the modules in a script tag and start. Tooling is always optional."),
        item("hexagon", "Small by contract", `The core is ${FACTS.core} gzipped, and a test fails the build if it grows past its budget.`),
        item("check-circle", "Accessible by structure", "Keyboard, focus and ARIA live inside the components, not in a checklist."),
        item("sparkles", "Beautiful by default", "A design language with a point of view, in light and dark, from one set of tokens."),
        item("users", "Free, forever", "MIT licensed. No paid tier, no hosted dependency, no lock-in.")),
      h("div", { class: "source-band" },
        h("div", { class: "source-band-copy" },
          h("div", { class: "source-band-url" }, h("span", "view-source:"), "lucidui.dev"),
          h("h3", { class: "source-band-title" }, "This page is Lucid UI. Read every line."),
          h("p", { class: "source-band-text" }, "No bundler, no minifier and no framework underneath. Right-click and view the source, or open the page module directly.")),
        h("div", { class: "source-band-actions" },
          Button({ variant: "primary", size: "lg", href: LINKS.source, icon: "hash" }, "Read home.js"),
          Button({ variant: "secondary", size: "lg", href: "/lucid/index.js", icon: "layers" }, "Read the core")))));
}

const IMPORT = `
<link rel="stylesheet" href="https://lucidui.dev/lucid/ui/lucid.css">

<script type="module">
  import { signal, mount } from "https://lucidui.dev/lucid/index.js";
  import { Button } from "https://lucidui.dev/lucid/ui/index.js";
</script>
`;

const CDN = "https://cdn.jsdelivr.net/npm/@lucidui-dev/core@0.3/bundle";

const PLATFORMS = [
  {
    key: "wordpress",
    name: "WordPress",
    icon: "layers",
    how: "Plugin and shortcode",
    file: "your-theme/lucid/hello.js",
    lang: "js",
    steps: ["Install the Lucid UI plugin", "Add an app to your theme's lucid folder", "Add [lucid app=\"hello\"] to any page"],
    code: `
import { signal, h } from "@lucidui-dev/core";
import { Button } from "@lucidui-dev/core/ui";

export default function Hello({ name = "there" }) {
  const waves = signal(0);
  return h("div",
    h("p", "Hi " + name),
    Button({ onClick: () => waves.value++ }, () => "Waved " + waves.value + " times"));
}
`
  },
  {
    key: "shopify",
    name: "Shopify",
    icon: "tag",
    how: "Theme sections",
    file: "sections/lucid-size-picker.liquid",
    lang: "html",
    steps: ["Upload lucid.js and lucid.css to your theme's assets", "Add a section with a mount point", "Import the single file and mount"],
    code: `
<div id="size-picker" class="lucid-app"></div>
{{ 'lucid.css' | asset_url | stylesheet_tag }}

<script type="module">
  import { signal, h, mount, Segmented } from "{{ 'lucid.js' | asset_url }}";
  const size = signal("M");
  mount(() => Segmented({ value: size, options: ["S", "M", "L"].map(v => ({ value: v, label: v })) }), "#size-picker");
</script>
`
  },
  {
    key: "squarespace",
    name: "Squarespace",
    icon: "pen",
    how: "Code blocks",
    file: "Code block",
    lang: "html",
    steps: ["Add a Code block to any page", "Paste the snippet", "Publish. It loads Lucid UI from a public CDN"],
    code: `
<div id="newsletter" class="lucid-app"></div>
<link rel="stylesheet" href="${CDN}/lucid.css">

<script type="module">
  import { signal, h, mount, Button } from "${CDN}/lucid.js";
  const joined = signal(false);
  mount(() => Button({ variant: "primary", onClick: () => { joined.value = true; } }, () => (joined.value ? "You're in" : "Join the list")), "#newsletter");
</script>
`
  },
  {
    key: "html",
    name: "Any HTML page",
    icon: "hash",
    how: "One file, one tag",
    file: "index.html",
    lang: "html",
    steps: ["Add a mount point", "Import lucid.js from npm or your own server", "That's it. No build step"],
    code: `
<div id="app" class="lucid-app"></div>
<link rel="stylesheet" href="${CDN}/lucid.css">

<script type="module">
  import { signal, h, mount, Button } from "${CDN}/lucid.js";
  const count = signal(0);
  mount(() => Button({ onClick: () => count.value++ }, () => "Clicked " + count.value), "#app");
</script>
`
  }
];

function Anywhere() {
  const active = signal(PLATFORMS[0].key);
  const current = computed(() => PLATFORMS.find(p => p.key === active.value));
  const tabs = [];
  const keys = event => {
    const index = PLATFORMS.findIndex(p => p.key === active.peek());
    const step = { ArrowDown: 1, ArrowRight: 1, ArrowUp: -1, ArrowLeft: -1 }[event.key];
    const next = event.key === "Home" ? 0 : event.key === "End" ? PLATFORMS.length - 1 : step ? (index + step + PLATFORMS.length) % PLATFORMS.length : -1;
    if (next < 0) return;
    event.preventDefault();
    active.value = PLATFORMS[next].key;
    tabs[next]?.focus();
  };
  return h("section", { class: "section section-tint anywhere", id: "anywhere" },
    h("div", { class: "site-wrap split anywhere-split" },
      h("div",
        SectionHead({
          eyebrow: "works anywhere",
          title: "Drop it into the site you already have.",
          lead: "Lucid UI ships as one file with no build step. If a platform lets you add a script, it runs there, inside a theme you don't have to rebuild."
        }),
        h("div", { class: "anywhere-list", role: "tablist", aria: { label: "Platforms", orientation: "vertical" }, onKeydown: keys },
          PLATFORMS.map((p, i) => h("button", {
            type: "button",
            role: "tab",
            id: `anywhere-tab-${p.key}`,
            class: "anywhere-tab",
            ref: el => { tabs[i] = el; },
            tabindex: () => (active.value === p.key ? 0 : -1),
            aria: { selected: () => active.value === p.key, controls: "anywhere-panel" },
            onClick: () => { active.value = p.key; }
          },
          h("span", { class: "anywhere-icon" }, Icon({ name: p.icon, size: 16 })),
          h("span", { class: "anywhere-name" }, p.name),
          h("span", { class: "anywhere-how" }, p.how),
          Icon({ name: "chevron-right", size: 14 }))))),
      h("div", { class: "anywhere-panel", id: "anywhere-panel", role: "tabpanel", aria: { labelledby: () => `anywhere-tab-${active.value}` } },
        () => {
          const p = current.value;
          return h("div", { class: "anywhere-view" },
            CodeWindow({ file: p.file, code: p.code, lang: p.lang, icon: p.lang === "js" ? "hash" : "monitor", class: "anywhere-code code-compact" }),
            h("ol", { class: "anywhere-steps" }, p.steps.map((text, i) => h("li", h("span", String(i + 1)), text))));
        },
        h("p", { class: "anywhere-note" },
          Icon({ name: "download", size: 12 }),
          h("a", { href: `https://github.com/lucidui-dev/lucidui/releases/download/v${version}/lucid-ui-wordpress-${version}.zip` }, "Get the WordPress plugin"),
          ". WordPress, Shopify and Squarespace are trademarks of their owners; Lucid UI is independent and not affiliated with them."))));
}

function Start() {
  return h("section", { class: "section start", id: "start" },
    h("div", { class: "site-wrap start-inner" },
      SectionHead({
        eyebrow: "get started",
        title: "Start in one line.",
        lead: "Install @lucidui-dev/core from npm, or import the one-file build straight from a CDN. Either way it is the same readable source you see here.",
        align: "center"
      }),
      h("div", { class: "start-ctas" },
        DownloadButton({ size: "lg", label: `Download v${version}` }),
        Button({ variant: "secondary", size: "lg", href: LINKS.docs, iconRight: "arrow-right" }, "Read the docs")),
      CodeWindow({ file: "index.html", code: IMPORT, lang: "html", icon: "monitor", class: "start-code" }),
      h("p", { class: "start-note" }, h("code", null, "npm i @lucidui-dev/core"), " · ", h("a", { href: LINKS.npm }, "npm"), " · ", h("a", { href: LINKS.github }, "GitHub"), " · follow ", h("a", { href: LINKS.x }, "@lucidui_"))));
}

mountPage({
  site: "www",
  main: L => {
    LINKS = L;
    return [Hero(), Signals(), Agents(), Components(), Charts(), Principles(), Anywhere(), Start()];
  },
  commands: [
    { group: "On this page", label: "Signals", icon: "zap", run: jump("signals") },
    { group: "On this page", label: "Made for agents", icon: "sparkles", run: jump("agents") },
    { group: "On this page", label: "Components", icon: "layers", run: jump("components") },
    { group: "On this page", label: "Charts", icon: "chart", run: jump("charts") },
    { group: "On this page", label: "Principles", icon: "target", run: jump("principles") },
    { group: "On this page", label: "Works anywhere", icon: "layers", keywords: "wordpress shopify squarespace embed plugin cdn", run: jump("anywhere") }
  ]
});
