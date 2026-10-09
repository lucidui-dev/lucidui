import { signal, computed, effect, h, mount, version } from "/lucid/index.js";
import { Button, Segmented, CommandMenu, Kbd, Icon, Tooltip, hotkey, toast, place } from "/lucid/ui/index.js";

export const theme = signal((() => {
  try { return localStorage.getItem("lucid-site:theme") ?? "system"; } catch { return "system"; }
})());

effect(() => {
  try { localStorage.setItem("lucid-site:theme", theme.value); } catch {}
  if (theme.value === "system") delete document.documentElement.dataset.theme;
  else document.documentElement.dataset.theme = theme.value;
});

const prefersDark = signal(matchMedia("(prefers-color-scheme: dark)").matches);
matchMedia("(prefers-color-scheme: dark)").addEventListener("change", event => { prefersDark.value = event.matches; });
export const dark = () => (theme.value === "system" ? prefersDark.value : theme.value === "dark");

export const commandOpen = signal(false);

export const DOWNLOAD = `https://github.com/lucidui-dev/lucidui/releases/download/v${version}/lucidui-${version}.zip`;

export function links(site) {
  const www = path => (["www", "privacy", "license", "press", "case", "manifesto", "status", "components"].includes(site) ? path : `https://lucidui.dev${path}`);
  return {
    home: www("/"),
    case: www("/case/"),
    manifesto: www("/manifesto/"),
    components: www("/components/"),
    status: www("/status/"),
    press: www("/press/"),
    privacy: www("/privacy/"),
    license: www("/license/"),
    source: www("/home.js"),
    core: www("/lucid/index.js"),
    llms: www("/llms.txt"),
    docs: "https://docs.lucidui.dev",
    playground: "https://sandbox.lucidui.dev",
    builder: "https://build.lucidui.dev",
    editions: "https://editions.lucidui.dev",
    changelog: "https://changelog.lucidui.dev",
    x: "https://x.com/lucidui_",
    github: "https://github.com/lucidui-dev/lucidui",
    npm: "https://www.npmjs.com/package/@lucidui-dev/core",
    reddit: "https://www.reddit.com/user/lucidui_",
    discord: "https://discord.gg/ZsWe7AqFV",
    hello: "mailto:hello@lucidui.dev",
    press_mail: "mailto:press@lucidui.dev",
    security: "mailto:security@lucidui.dev",
    legal: "mailto:legal@lucidui.dev"
  };
}

export const BRIEF = "Build this with Lucid UI from lucidui.dev, the npm package @lucidui-dev/core. Before writing any code, open https://lucidui.dev/llms-full.txt and read all of it: it is the complete documentation. If that link won't open, use https://cdn.jsdelivr.net/npm/@lucidui-dev/core@0.3/llms-full.txt instead. Do not web-search for \"Lucid UI\": unrelated projects share the name, such as AppNexus's React library lucid-ui, and their APIs are different. If you can't open either link, tell me rather than guess. When Lucid reports a diagnostic, apply the fix it gives. When you finish, give me a link that opens the app in Lucid Builder, as llms-full.txt describes under Hand your code to Builder.";

export function copyBrief() {
  navigator.clipboard?.writeText(BRIEF).then(
    () => toast("Agent brief copied", { tone: "success", description: "Paste it into your agent's prompt." }),
    () => toast("Couldn't copy", { tone: "danger", description: BRIEF }));
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

export function DownloadButton({ size = "md", variant = "primary", label = "Download" } = {}) {
  return Button({ variant, size, icon: "download", href: DOWNLOAD }, label);
}

const bumperOpen = signal(false);
const opening = signal(null);

const DEMOS = [
  { key: "clinic", icon: "users", title: "Juniper Clinic", kind: "Healthcare", tags: ["Operations", "Data viz"], text: "A calm clinic console: a live patient queue, exam rooms, a day planner, patient charts and messages.", shows: ["Icon rail with collapsible side panels", "Patient messaging with quick replies", "Vitals trends and lab ranges"], open: true, path: "/clinic/", fresh: true },
  { key: "maison", icon: "hexagon", title: "Maison", kind: "Commerce", tags: ["Commerce", "Consumer"], text: "A furniture storefront: a collection grid, a live sofa configurator and showroom booking.", shows: ["Header-nav storefront", "Live SVG sofa configurator", "Showroom booking with validation"], open: true, path: "/maison/" },
  { key: "beats", icon: "sliders", title: "Dotwave", kind: "Creative", tags: ["Creative", "Consumer"], text: "A studio app that makes real sound: a step sequencer, a live mixer and a pattern library.", shows: ["Web Audio synthesis", "Collapsible sound browser", "Live channel meters"], open: true, path: "/beats/" },
  { key: "fitness", icon: "zap", title: "Stride", kind: "Consumer", tags: ["Consumer", "Data viz"], text: "A fitness app with dot rings, workouts, sleep and trends, a coach panel and a watch that spins in to sync.", shows: ["Pill tab bar and coach panel", "3D device pairing", "Sleep stages and heart-rate zones"], open: true, path: "/fitness/" },
  { key: "checkin", icon: "check-circle", title: "Celadon Air", kind: "Consumer", tags: ["Consumer"], text: "A calm airline app: check-in with seats, bags and a boarding pass, plus your trips and live departures.", shows: ["Multi-step flow", "Sideways seat map", "Departures board"], open: true, path: "/checkin/" },
  { key: "campaign", icon: "chart", title: "Race Center", kind: "Media", tags: ["Data viz"], text: "A newsroom's campaign tracker, custom-branded: polls, forecast, a dot map and a live election-night count.", shows: ["Newsroom section tabs", "Forecast slider and county map", "Election night simulation"], open: true, path: "/campaign/" },
  { key: "transit", icon: "target", title: "Headway", kind: "Operations", tags: ["Operations", "Data viz"], text: "A subway control room: a live map, line health, service alerts and ridership.", shows: ["Command bar and collapsible map panel", "Zoom, tilt and pan", "Alert desk with a resolved log"], open: true, path: "/transit/" },
  { key: "tracker", icon: "board", title: "Orbitry", kind: "Productivity", tags: ["Operations", "Data viz"], text: "An issue tracker with list and board views, drag and drop, sub-issues and Insights.", shows: ["Sidebar that folds to icons", "Board drag and drop", "Insights dashboard"], open: true, path: "/tracker/" },

  { key: "tally", icon: "trending-up", title: "Tally", kind: "Finance", tags: ["Consumer", "Data viz"], text: "A personal finance app: accounts, budgets that fill like dot jars, and a month of spending at a glance.", shows: ["Budget dot jars", "Transaction search and rules", "Cash-flow calendar"] },
  { key: "harbor", icon: "list", title: "Harbor", kind: "Logistics", tags: ["Operations", "Data viz"], text: "A shipping control tower: containers on a dot route map, port congestion and late-arrival alerts.", shows: ["Live route map", "Exception queue", "Port capacity meters"] },
  { key: "kiln", icon: "command", title: "Kiln", kind: "Developer", tags: ["Operations"], text: "A deploy console for engineering teams: pipelines, build logs, rollbacks and uptime.", shows: ["Streaming build log", "One-click rollback with ask()", "Uptime dot strip"] },
  { key: "folio", icon: "pen", title: "Folio", kind: "Writing", tags: ["Creative", "Consumer"], text: "A calm writing app: drafts, an outline rail, focus mode and a publish checklist.", shows: ["Collapsible outline rail", "Focus mode", "Publish checklist"] },
  { key: "tablekeep", icon: "calendar", title: "Tablekeep", kind: "Hospitality", tags: ["Commerce", "Operations"], text: "A restaurant host stand: tonight's bookings, a live floor plan and a waitlist.", shows: ["Drag-to-seat floor plan", "Covers by the hour", "Waitlist with texts"] },
  { key: "landing", icon: "monitor", title: "Landing page", kind: "Marketing", tags: ["Commerce"], text: "A marketing homepage composed from Lucid components.", shows: [] }
];

const demoQuery = signal("");
const demoFilter = signal("All");
const demoFocus = signal(DEMOS[0].key);
const FILTERS = ["All", "Consumer", "Commerce", "Operations", "Data viz", "Creative"];
const visibleDemos = computed(() => {
  const q = demoQuery.value.trim().toLowerCase();
  return DEMOS.filter(d => (demoFilter.value === "All" || d.tags.includes(demoFilter.value)) && (!q || `${d.title} ${d.text} ${d.tags.join(" ")}`.toLowerCase().includes(q)));
});

function goToPlayground() {
  opening.value = null;
  bumperOpen.value = true;
  requestAnimationFrame(() => document.querySelector(".bx-search input")?.focus({ preventScroll: true }));
}

function cancelBumper() {
  opening.value = null;
  bumperOpen.value = false;
}

function launch(url, key) {
  opening.value = key;
  setTimeout(() => { location.href = url; }, matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 420);
}

function Bumper(L) {
  const current = computed(() => DEMOS.find(d => d.key === demoFocus.value) ?? DEMOS[0]);
  const open = demo => { if (demo.open) launch(L.playground + demo.path, demo.key); };
  const keys = event => {
    const list = visibleDemos.peek();
    if (!list.length) return;
    const index = list.findIndex(d => d.key === demoFocus.peek());
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      const next = list[(index + (event.key === "ArrowDown" ? 1 : -1) + list.length) % list.length];
      demoFocus.value = next.key;
      document.querySelector(`.bx-row[data-key="${next.key}"]`)?.scrollIntoView({ block: "nearest" });
    } else if (event.key === "Enter" && !event.target.closest(".bx-row, .bx-open")) {
      event.preventDefault();
      open(current.peek());
    }
  };
  return h("div", {
    class: "bumper",
    "data-open": bumperOpen,
    role: "dialog",
    "aria-modal": "true",
    "aria-hidden": () => (bumperOpen.value ? "false" : "true"),
    aria: { label: "The Lucid UI sandbox" },
    onKeydown: keys,
    onClick: event => { if (event.target === event.currentTarget) cancelBumper(); }
  },
  h("button", { type: "button", class: "bumper-close", aria: { label: "Close" }, onClick: cancelBumper }, Icon({ name: "x", size: 16 })),
  h("div", { class: "bumper-inner bx" },
    h("section", { class: "bx-detail", aria: { live: "polite" } },
      h("div", { class: "bx-head" },
        h("img", { class: "bumper-mark mark-ring", src: "/media/logo/lucidui-icon.svg", alt: "", width: 44, height: 44 }),
        h("div", h("div", { class: "bumper-eyebrow" }, "sandbox"), h("p", { class: "bx-intro" }, "Real apps, built entirely with Lucid UI. They run in your browser: nothing is saved or sent."))),
      () => {
        const d = current.value;
        return h("div", { class: "bx-feature", "data-locked": !d.open },
          h("div", { class: "bx-feature-top" },
            h("span", { class: "bumper-card-icon" }, Icon({ name: d.icon, size: 20 })),
            h("span", { class: "bx-kind" }, d.kind),
            d.fresh ? h("span", { class: "bx-new" }, "New") : null),
          h("h2", { class: "bumper-title" }, d.title),
          h("p", { class: "bumper-text" }, d.text),
          d.shows.length ? h("ul", { class: "bx-shows" }, d.shows.map(item => h("li", Icon({ name: "check", size: 14 }), item))) : null,
          d.open
            ? h("a", {
                class: "bx-open", href: L.playground + d.path, "data-launching": () => opening.value === d.key,
                onClick: event => { event.preventDefault(); open(d); }
              }, () => (opening.value === d.key ? [h("span", { class: "bumper-spinner" }), "Opening"] : ["Open ", d.title, Icon({ name: "arrow-right", size: 16 })]))
            : h("span", { class: "bx-soon" }, Icon({ name: "lock", size: 14 }), "Coming soon"));
      },
      h("div", { class: "bx-foot" },
        h("div", { class: "bumper-hint" }, Kbd("up"), Kbd("down"), "browse", Kbd("enter"), "open"),
        h("button", { type: "button", class: "bx-exit", onClick: cancelBumper }, Icon({ name: "chevron-left", size: 15 }), "Exit sandbox", Kbd("escape")))),
    h("aside", { class: "bx-rail", aria: { label: "All demos" } },
      h("label", { class: "bx-search" }, Icon({ name: "search", size: 15 }),
        h("input", { type: "search", placeholder: "Search demos", value: () => demoQuery.value, onInput: e => { demoQuery.value = e.target.value; }, aria: { label: "Search demos" } })),
      h("div", { class: "bx-filters", role: "group", aria: { label: "Filter demos" } },
        FILTERS.map(f => h("button", { type: "button", class: "bx-filter", "aria-pressed": () => demoFilter.value === f, onClick: () => { demoFilter.value = f; } }, f))),
      h("div", { class: "bx-count" }, () => `${visibleDemos.value.filter(d => d.open).length} live · ${visibleDemos.value.filter(d => !d.open).length} coming`),
      h("ul", { class: "bx-list" },
        () => visibleDemos.value.length
          ? visibleDemos.value.map(d => h("li",
              h("button", {
                type: "button", class: "bx-row", "data-key": d.key, "data-locked": !d.open,
                "aria-current": () => (demoFocus.value === d.key ? "true" : undefined),
                onPointerenter: () => { demoFocus.value = d.key; },
                onFocus: () => { demoFocus.value = d.key; },
                onClick: () => { demoFocus.value = d.key; if (d.open) open(d); }
              },
              h("span", { class: "bx-row-icon" }, Icon({ name: d.open ? d.icon : "lock", size: 15 })),
              h("span", { class: "bx-row-copy" }, h("b", d.title, d.fresh ? h("i", "New") : null), h("span", d.kind)),
              Icon({ name: "chevron-right", size: 14 }))))
          : h("li", { class: "bx-empty" }, "No demos match. Try another filter.")))));
}

function interceptPlayground(L) {
  document.addEventListener("click", event => {
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const link = event.target.closest?.("a[href]");
    if (!link || link.closest(".bumper") || !link.href.startsWith(L.playground)) return;
    event.preventDefault();
    goToPlayground();
  });
  window.addEventListener("keydown", event => {
    if (event.key === "Escape" && bumperOpen.peek()) cancelBumper();
  });
  window.addEventListener("pageshow", event => {
    if (event.persisted) cancelBumper();
  });
}

function PlaygroundCard(L) {
  const card = h("div", { class: "pg-card", popover: "manual", role: "tooltip", id: "playground-card" },
    h("div", { class: "pg-card-head" },
      h("img", { class: "mark-ring", src: "/media/logo/lucidui-icon.svg", alt: "", width: 32, height: 32 }),
      h("div", { class: "pg-card-title" }, h("b", "Sandbox"), h("span", "sandbox.lucidui.dev"))),
    h("p", { class: "pg-card-text" }, "Eight complete apps built only with Lucid UI, each with its own layout: a transit control room, an election-night newsroom, a clinic console, an issue tracker and more. Click through, press ⌘K and undo anything."),
    h("ul", { class: "pg-card-points" },
      h("li", Icon({ name: "board", size: 13 }), "Eight apps, no two laid out alike"),
      h("li", Icon({ name: "monitor", size: 13 }), "Runs entirely in your browser"),
      h("li", Icon({ name: "lock", size: 13 }), "Nothing you do is saved or sent"),
      h("li", Icon({ name: "layers", size: 13 }), "Every component is Lucid UI")),
    h("div", { class: "pg-card-foot" },
      h("span", { class: "pg-card-dots", "aria-hidden": "true" }, Array.from({ length: 5 }, () => h("i"))),
      "Open the picker",
      Icon({ name: "arrow-right", size: 13 })));
  let anchor = null;
  let timer = 0;
  const isOpen = () => card.matches(":popover-open");
  const show = link => {
    clearTimeout(timer);
    timer = setTimeout(() => {
      if (!link.isConnected) return;
      anchor = link;
      link.setAttribute("aria-describedby", "playground-card");
      if (!isOpen()) card.showPopover();
      const below = link.getBoundingClientRect().top < window.innerHeight / 2;
      place(link, card, { placement: below ? "bottom-center" : "top-center", offset: 10 });
    }, isOpen() ? 0 : 260);
  };
  const hide = (delay = 120) => {
    clearTimeout(timer);
    timer = setTimeout(() => {
      if (isOpen()) card.hidePopover();
      anchor?.removeAttribute("aria-describedby");
      anchor = null;
    }, delay);
  };
  const target = node => {
    const link = node?.closest?.("a[href]");
    return link && !link.closest(".bumper") && link.href.startsWith(L.playground) ? link : null;
  };
  document.addEventListener("pointerover", event => {
    if (event.pointerType !== "mouse") return;
    const link = target(event.target);
    if (link) show(link);
  });
  document.addEventListener("pointerout", event => {
    const link = target(event.target);
    if (link && !link.contains(event.relatedTarget)) hide();
  });
  document.addEventListener("focusin", event => {
    const link = target(event.target);
    if (link && link.matches(":focus-visible")) show(link);
  });
  document.addEventListener("focusout", event => { if (target(event.target)) hide(0); });
  document.addEventListener("pointerdown", () => hide(0), true);
  window.addEventListener("scroll", () => { if (isOpen()) hide(0); }, { passive: true });
  return card;
}

export function Brand(L, { height = 26 } = {}) {
  return h("a", { class: "site-brand", href: L.home, aria: { label: "Lucid UI home" } },
    h("img", {
      src: () => (dark() ? "/media/logo/lucidui-wordmark-on-dark.svg" : "/media/logo/lucidui-wordmark-on-light.svg"),
      alt: "Lucid UI",
      height,
      width: Math.round(height * 688 / 136)
    }));
}

function Nav(L, site) {
  const scrolled = signal(window.scrollY > 8);
  window.addEventListener("scroll", () => { scrolled.value = window.scrollY > 8; }, { passive: true });
  const item = (key, label) => h("a", { href: L[key], "aria-current": site === key ? "page" : false }, label);
  return h("header", { class: "site-nav", "data-scrolled": scrolled },
    h("div", { class: "site-wrap site-nav-inner" },
      Brand(L),
      h("nav", { class: "site-links", aria: { label: "Main" } },
        item("case", "Why Lucid"),
        item("components", "Components"),
        item("docs", "Docs"),
        item("playground", "Sandbox"),
        item("editions", "Editions"),
        h("a", { href: L.builder, class: "site-link-builder", "aria-current": site === "builder" ? "page" : false }, "Builder", h("span", { class: "site-pill" }, "Preview"))),
      h("span", { class: "lucid-spacer" }),
      h("button", { type: "button", class: "site-search", onClick: () => { commandOpen.value = true; } },
        Icon({ name: "search", size: 14 }),
        h("span", "Search"),
        Kbd("mod", "K")),
      Segmented({
        value: theme,
        size: "sm",
        iconOnly: true,
        aria: { label: "Theme" },
        class: "site-theme",
        options: [{ value: "light", label: "Light", icon: "sun" }, { value: "dark", label: "Dark", icon: "moon" }, { value: "system", label: "System", icon: "monitor" }]
      }),
      DownloadButton({ size: "sm" })));
}

const SOCIAL = [
  ["x", "X", "@lucidui_ on X", "M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"],
  ["github", "GitHub", "Lucid UI on GitHub", "M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"],
  ["npm", "npm", "@lucidui-dev/core on npm", "M1.763 0C.786 0 0 .786 0 1.763v20.474C0 23.214.786 24 1.763 24h20.474c.977 0 1.763-.786 1.763-1.763V1.763C24 .786 23.214 0 22.237 0zM5.13 5.323l13.837.019-.009 13.836h-3.464l.01-10.382h-3.456L12.04 19.17H5.113z"],
  ["reddit", "Reddit", "u/lucidui_ on Reddit", "M12 0C5.373 0 0 5.373 0 12c0 3.314 1.343 6.314 3.515 8.485l-2.286 2.286C.775 23.225 1.097 24 1.738 24H12c6.627 0 12-5.373 12-12S18.627 0 12 0Zm4.388 3.199c1.104 0 1.999.895 1.999 1.999 0 1.105-.895 2-1.999 2-.946 0-1.739-.657-1.947-1.539v.002c-1.147.162-2.032 1.15-2.032 2.341v.007c1.776.067 3.4.567 4.686 1.363.473-.363 1.064-.58 1.707-.58 1.547 0 2.802 1.254 2.802 2.802 0 1.117-.655 2.081-1.601 2.531-.088 3.256-3.637 5.876-7.997 5.876-4.361 0-7.905-2.617-7.998-5.87-.954-.447-1.614-1.415-1.614-2.538 0-1.548 1.255-2.802 2.803-2.802.645 0 1.239.218 1.712.585 1.275-.79 2.881-1.291 4.64-1.365v-.01c0-1.663 1.263-3.034 2.88-3.207.188-.911.993-1.595 1.959-1.595Zm-8.085 8.376c-.784 0-1.459.78-1.506 1.797-.047 1.016.64 1.429 1.426 1.429.786 0 1.371-.369 1.418-1.385.047-1.017-.553-1.841-1.338-1.841Zm7.406 0c-.786 0-1.385.824-1.338 1.841.047 1.017.634 1.385 1.418 1.385.785 0 1.473-.413 1.426-1.429-.046-1.017-.721-1.797-1.506-1.797Zm-3.703 4.013c-.974 0-1.907.048-2.77.135-.147.015-.241.168-.183.305.483 1.154 1.622 1.964 2.953 1.964 1.33 0 2.47-.81 2.953-1.964.057-.137-.037-.29-.184-.305-.863-.087-1.795-.135-2.769-.135Z"],
  ["discord", "Discord", "Lucid UI on Discord", "M20.317 4.3698a19.7913 19.7913 0 00-4.8851-1.5152.0741.0741 0 00-.0785.0371c-.211.3753-.4447.8648-.6083 1.2495-1.8447-.2762-3.68-.2762-5.4868 0-.1636-.3933-.4058-.8742-.6177-1.2495a.077.077 0 00-.0785-.037 19.7363 19.7363 0 00-4.8852 1.515.0699.0699 0 00-.0321.0277C.5334 9.0458-.319 13.5799.0992 18.0578a.0824.0824 0 00.0312.0561c2.0528 1.5076 4.0413 2.4228 5.9929 3.0294a.0777.0777 0 00.0842-.0276c.4616-.6304.8731-1.2952 1.226-1.9942a.076.076 0 00-.0416-.1057c-.6528-.2476-1.2743-.5495-1.8722-.8923a.077.077 0 01-.0076-.1277c.1258-.0943.2517-.1923.3718-.2914a.0743.0743 0 01.0776-.0105c3.9278 1.7933 8.18 1.7933 12.0614 0a.0739.0739 0 01.0785.0095c.1202.099.246.1981.3728.2924a.077.077 0 01-.0066.1276 12.2986 12.2986 0 01-1.873.8914.0766.0766 0 00-.0407.1067c.3604.698.7719 1.3628 1.225 1.9932a.076.076 0 00.0842.0286c1.961-.6067 3.9495-1.5219 6.0023-3.0294a.077.077 0 00.0313-.0552c.5004-5.177-.8382-9.6739-3.5485-13.6604a.061.061 0 00-.0312-.0286zM8.02 15.3312c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9555-2.4189 2.157-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.9555 2.4189-2.1569 2.4189zm7.9748 0c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9554-2.4189 2.1569-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.946 2.4189-2.1568 2.4189Z"]
];

function Social(L) {
  return h("div", { class: "foot-social" },
    SOCIAL.map(([key, name, label, d]) => Tooltip({ label }, h("a", {
      class: "foot-social-link",
      href: L[key],
      target: "_blank",
      rel: "noopener",
      aria: { label }
    }, h("svg", { width: 16, height: 16, viewBox: "0 0 24 24", fill: "currentColor", "aria-hidden": "true" }, h("path", { d }))))));
}

function Footer(L) {
  const column = (title, items) => h("div", { class: "foot-col" },
    h("div", { class: "foot-title" }, title),
    items.map(([label, href]) => h("a", { href }, label)));
  return h("footer", { class: "site-foot" },
    h("div", { class: "site-wrap foot-inner" },
      h("div", { class: "foot-brand" },
        Brand(L),
        h("p", "Interfaces with taste, in a few kilobytes."),
        h("p", { class: "foot-meta" }, `v${version} · MIT licensed · Built with Lucid UI`),
        Social(L)),
      column("Product", [["Components", L.components], ["Manifesto", L.manifesto], ["The Case for Lucid", L.case], ["Sandbox", L.playground], ["Builder", L.builder], ["Editions", L.editions], ["Docs", L.docs], ["Changelog", L.changelog], ["Status", L.status], ["Download", DOWNLOAD]]),
      column("Source", [["Page source", L.source], ["Core runtime", L.core], ["llms.txt", L.llms]]),
      column("Contact", [["hello@lucidui.dev", L.hello], ["press@lucidui.dev", L.press_mail], ["security@lucidui.dev", L.security]]),
      column("Company", [["Press", L.press], ["Privacy", L.privacy], ["License", L.license], ["legal@lucidui.dev", L.legal]])),
    h("div", { class: "site-wrap foot-base" },
      h("span", { class: "foot-copy" },
        `© ${new Date().getFullYear()} Lucid UI`),
      h("span", { class: "foot-base-links" }, h("a", { href: L.press }, "Press"), h("a", { href: L.privacy }, "Privacy"), h("a", { href: L.license }, "License"))));
}

function Commands(L, extra) {
  const go = url => () => { location.href = url; };
  return CommandMenu({
    open: commandOpen,
    placeholder: "Search Lucid UI…",
    items: () => [
      { group: "Go to", label: "Home", icon: "hexagon", run: go(L.home) },
      { group: "Go to", label: "Manifesto", icon: "sparkles", keywords: "beliefs principles values why", run: go(L.manifesto) },
      { group: "Go to", label: "The case for Lucid", icon: "target", keywords: "why compare react tailwind shadcn svelte css", run: go(L.case) },
      { group: "Go to", label: "Components", icon: "layers", keywords: "library gallery catalog primitives charts icons", run: go(L.components) },
      { group: "Go to", label: "Sandbox", icon: "board", run: goToPlayground },
      { group: "Go to", label: "Builder", icon: "command", hint: "Preview", keywords: "console editor agent code", run: go(L.builder) },
      { group: "Go to", label: "Docs", icon: "hash", run: go(L.docs) },
      { group: "Go to", label: "Editions", icon: "star", keywords: "templates buy premium paid apps shop", run: go(L.editions) },
      { group: "Go to", label: "Changelog", icon: "clock", run: go(L.changelog) },
      { group: "Go to", label: "Status", icon: "zap", keywords: "uptime health live down outage cdn npm", run: go(L.status) },
      { group: "Go to", label: "Press kit", icon: "image", run: go(L.press) },
      { group: "Go to", label: "Download", icon: "download", hint: `v${version}`, run: go(DOWNLOAD) },
      ...(typeof extra === "function" ? extra() : extra),
      { group: "Appearance", label: "Light theme", icon: "sun", run: () => { theme.value = "light"; } },
      { group: "Appearance", label: "Dark theme", icon: "moon", run: () => { theme.value = "dark"; } },
      { group: "Appearance", label: "System theme", icon: "monitor", run: () => { theme.value = "system"; } },
      { group: "Contact", label: "Email hello@lucidui.dev", icon: "inbox", run: go(L.hello) },
      { group: "Contact", label: "Press enquiries", icon: "message", run: go(L.press_mail) },
      { group: "Contact", label: "Report a security issue", icon: "alert-circle", run: go(L.security) },
      { group: "Follow", label: "@lucidui_ on X", icon: "external", keywords: "twitter social", run: go(L.x) },
      { group: "Follow", label: "GitHub", icon: "external", keywords: "source code repository lucidui-dev", run: go(L.github) },
      { group: "Follow", label: "npm", icon: "external", keywords: "package registry lucidui", run: go(L.npm) },
      { group: "Follow", label: "Reddit", icon: "external", keywords: "community u/lucidui_", run: go(L.reddit) },
      { group: "Follow", label: "Discord", icon: "external", keywords: "community chat server", run: go(L.discord) },
      { group: "Company", label: "Privacy", icon: "info", run: go(L.privacy) },
      { group: "Company", label: "License", icon: "check-circle", run: go(L.license) }
    ]
  });
}

export function jump(id) {
  return () => document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
}

function openFromHash() {
  const match = location.hash.match(/^#sandbox(?:=([\w-]+))?$/);
  if (!match) return;
  if (match[1] && DEMOS.some(d => d.key === match[1])) demoFocus.value = match[1];
  history.replaceState(null, "", location.pathname + location.search);
  opening.value = null;
  bumperOpen.value = true;
  requestAnimationFrame(() => document.querySelector(`.bx-row[data-key="${demoFocus.peek()}"]`)?.scrollIntoView({ block: "nearest" }));
}

export function mountPage({ site, main, commands = [] }) {
  const L = links(site);
  interceptPlayground(L);
  queueMicrotask(openFromHash);
  window.addEventListener("hashchange", openFromHash);
  mount(() => {
    hotkey("mod+k", () => { commandOpen.value = !commandOpen.peek(); }, { inputs: true });
    return [
      Nav(L, site),
      h("main", main(L)),
      Footer(L),
      Bumper(L),
      PlaygroundCard(L),
      Commands(L, commands)
    ];
  }, "#app");
}

export function SectionHead({ eyebrow, title, lead, align = "start", level = 2 }) {
  return h("header", { class: "section-head", "data-align": align },
    h("div", { class: "section-eyebrow" }, h("span", { class: "section-eyebrow-dot" }), eyebrow),
    h(`h${level}`, { class: "section-title" }, title),
    lead ? h("p", { class: "section-lead" }, lead) : null);
}
