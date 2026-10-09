import { h, signal, computed, effect, onCleanup } from "/lucid/index.js";
import { Button, Icon, Select, Tooltip, toast } from "/lucid/ui/index.js";
import { mountPage, copyBrief } from "/shared/chrome.js";
import { CodeWindow } from "/shared/code.js";
import { parse, inline, slugify, plain } from "/markdown.js";

const PAGES = [
  { group: "Start", slug: "", title: "Introduction", icon: "home", text: "Start in a minute, then find your way around." },
  { group: "Start", slug: "agents", file: "AGENTS.md", title: "Build with an agent", icon: "sparkles", text: "Connect Claude Code, Cursor or any MCP agent to Builder, or use the brief." },
  { group: "Core", slug: "api", file: "API.md", title: "API reference", icon: "hash", text: "Signals, elements, control flow and mounting. The whole core on one page." },
  { group: "Core", slug: "diagnostics", file: "DIAGNOSTICS.md", title: "Diagnostics", icon: "alert-circle", text: "Every warning and error Lucid reports, with the fix for each." },
  { group: "Interface", slug: "components", file: "UI.md", title: "Components", icon: "layers", text: "Layout, pages, inputs, forms, overlays, identity, undo and long lists.", live: "https://lucidui.dev/components/" },
  { group: "Interface", slug: "charts", file: "VIZ.md", title: "Charts", icon: "chart", text: "Dot columns, dumbbells, waffles, unit rows, calendars and stat tiles.", live: "https://lucidui.dev/components/#set-charts" },
  { group: "Guides", slug: "recipes", file: "RECIPES.md", title: "Recipes", icon: "board", text: "Complete settings, dashboard and list pages built only from components." },
  { group: "Guides", slug: "deploy", file: "DEPLOY.md", title: "Put it online", icon: "external", text: "Publish from Builder, or upload to cPanel, Netlify, Vercel or GitHub Pages." },
  { group: "Guides", slug: "wordpress", file: "WORDPRESS.md", title: "WordPress", icon: "download", text: "The plugin, apps as theme files, props, WordPress content and fixes." },
  { group: "About", slug: "vision", file: "VISION.md", title: "Vision", icon: "target", text: "What Lucid UI is for, its principles, and where it's going." }
];
const LINKS = [
  { label: "Live components", href: "https://lucidui.dev/components/", icon: "external" },
  { label: "llms-full.txt", href: "/llms-full.txt", icon: "sparkles" },
  { label: "Changelog", href: "https://changelog.lucidui.dev", icon: "clock" },
  { label: "GitHub", href: "https://github.com/lucidui-dev/lucidui", icon: "external" }
];
const GROUPS = [...new Set(PAGES.map(p => p.group))];
const BY_FILE = Object.fromEntries(PAGES.filter(p => p.file).map(p => [p.file, p.slug]));
const LANG = { js: ["JavaScript", "hash", "js"], html: ["HTML", "monitor", "html"], json: ["JSON", "hash", "text"], php: ["PHP", "hash", "text"], sh: ["Terminal", "command", "text"], text: ["Text", "type", "text"] };
const REPO = "https://github.com/lucidui-dev/lucidui/blob/main/docs/";

const slugOf = () => location.pathname.replace(/^\/|\/$/g, "").split("/")[0] ?? "";
const route = signal(slugOf());
const page = computed(() => PAGES.find(p => p.slug === route.value) ?? null);
const cache = new Map();
const texts = signal({});
const toc = signal([]);
const activeHeading = signal("");

const load = file => {
  if (!cache.has(file)) cache.set(file, fetch(`/docs/${file}`).then(r => { if (!r.ok) throw new Error(r.status); return r.text(); }).then(text => { texts.value = { ...texts.peek(), [file]: text }; return text; }));
  return cache.get(file);
};

function link(href) {
  const m = /^(?:https:\/\/docs\.lucidui\.dev\/docs\/|\.\/)?([A-Z]+\.md)(#.*)?$/.exec(href);
  if (m && BY_FILE[m[1]] !== undefined) return `/${BY_FILE[m[1]]}${BY_FILE[m[1]] ? "/" : ""}${m[2] ?? ""}`;
  return href;
}

function go(slug, hash = "") {
  const path = slug ? `/${slug}/` : "/";
  if (location.pathname !== path || hash) history.pushState(null, "", path + hash);
  route.value = slug;
  requestAnimationFrame(() => {
    const target = hash && document.getElementById(hash.slice(1));
    if (target) target.scrollIntoView({ block: "start" });
    else window.scrollTo({ top: 0 });
  });
}

document.addEventListener("click", event => {
  if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
  const a = event.target.closest?.("a[href]");
  if (!a || a.target === "_blank") return;
  const url = new URL(a.href, location.href);
  if (url.origin !== location.origin) return;
  const slug = url.pathname.replace(/^\/|\/$/g, "");
  if (!PAGES.some(p => p.slug === slug)) return;
  event.preventDefault();
  if (slug === route.peek() && url.hash) { document.getElementById(url.hash.slice(1))?.scrollIntoView({ behavior: "smooth", block: "start" }); history.replaceState(null, "", url.pathname + url.hash); return; }
  go(slug, url.hash);
});
window.addEventListener("popstate", () => { route.value = slugOf(); });

effect(() => {
  const p = page.value;
  document.title = p && p.slug ? `${p.title} · Lucid UI docs` : "Docs · Lucid UI";
});

const CDN = "https://cdn.jsdelivr.net/npm/@lucidui-dev/core@0.3/bundle";

const STARTER = `
<!doctype html>
<link rel="stylesheet" href="${CDN}/lucid.css">
<body class="lucid-app">
  <div id="app"></div>
  <script type="module">
    import { signal, mount, Button } from "${CDN}/lucid.js";

    const count = signal(0);
    mount(() => Button({ onClick: () => count.value++ }, "Clicked ", count, " times"), "#app");
  </script>
</body>
`;

const ADD = `
import { signal, mount, Page, Section, SettingRow, Switch, Select, toast } from "${CDN}/lucid.js";

const theme = signal("system");
const digest = signal(true);

mount(() => Page({ title: "Settings" },
  Section({ title: "Preferences" },
    SettingRow({ label: "Theme" }, Select({ value: theme, options: [
      { value: "system", label: "System" }, { value: "light", label: "Light" }, { value: "dark", label: "Dark" }
    ] })),
    SettingRow({ label: "Weekly digest" }, Switch({ bind: digest, aria: { label: "Weekly digest" }, onChange: () => toast("Saved") })))), "#app");
`;

const FAQ = [
  ["Is Lucid UI free?", "Yes. It is open source under the MIT license, for personal and commercial work, with no account or key."],
  ["Is this the same as AppNexus's lucid-ui?", "No. That is an older React component library that happens to share the name. This Lucid UI is published as @lucidui-dev/core, has no React or JSX, and shares no code or API with it."],
  ["Do I need React, a bundler or a build step?", "No. Lucid UI is plain JavaScript modules. Link one stylesheet and import one file from a CDN, or install @lucidui-dev/core from npm if you already use a bundler."],
  ["How do I build with an AI agent?", "Copy the agent brief on this page and paste it before your request. It points the agent at llms-full.txt, the complete docs in one file, and tells it not to guess. The diagnostics then tell it how to fix any mistake."],
  ["What is the Builder?", "Builder, at build.lucidui.dev, is a workbench that runs entirely in your browser. Pick a template or paste code, and the preview reruns as you type, with every error and Lucid diagnostic explained in the console. Nothing you write is uploaded."],
  ["Can my AI agent build in the Builder directly?", "Yes. Add the Lucid bridge to your agent once (for Claude Code: claude mcp add --scope user lucid -- npx -y @lucidui-dev/bridge), then ask it to connect to Lucid Builder and open the link it gives you. Your agent renders into the Builder, reads the diagnostics and fixes its own mistakes. It all runs on your computer."],
  ["Which browsers does it support?", "Current versions of Chrome, Edge, Safari and Firefox. Lucid UI uses modern platform features such as popovers, the dialog element and light-dark colours, so very old browsers are not supported."],
  ["Can I use it in WordPress, Shopify or Squarespace?", "Yes. The one-file build works anywhere a script tag does. For WordPress there is a plugin with a [lucid] shortcode; the WordPress guide covers installing it and writing apps."],
  ["Can I change the look?", "Yes. Every colour, space, radius and font is a --lucid-* custom property, and light and dark are built in. A theme is a short list of overrides."],
  ["Is it ready for production?", "Lucid UI is young and its version is below 1.0, so some APIs may still change. Pin an exact version, and read the changelog before upgrading."],
  ["Where do I report a bug or ask for a feature?", "Open an issue on GitHub at github.com/lucidui-dev/lucidui. The changelog lists everything that has shipped."]
];const faqData = () => {
  const data = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQ.map(([name, text]) => ({ "@type": "Question", name, acceptedAnswer: { "@type": "Answer", text } }))
  };
  document.head.append(h("script", { type: "application/ld+json" }, JSON.stringify(data)));
};

function renderBlocks(blocks) {
  const seen = new Map();
  const id = text => { const base = slugify(plain(text)) || "section"; const n = seen.get(base) ?? 0; seen.set(base, n + 1); return n ? `${base}-${n}` : base; };
  const headings = [];
  const nodes = blocks.map(block => {
    if (block.type === "heading") {
      const hid = id(block.text);
      if (block.level <= 3) headings.push({ id: hid, text: plain(block.text), level: block.level });
      return h(`h${block.level}`, { id: hid, class: "dx-h" }, inline(block.text, link), h("a", { href: `#${hid}`, class: "dx-anchor", aria: { label: `Link to ${plain(block.text)}` } }, "#"));
    }
    if (block.type === "para") return h("p", inline(block.text, link));
    if (block.type === "list") return h(block.ordered ? "ol" : "ul", { class: "dx-list" }, block.items.map(item => h("li", inline(item, link))));
    if (block.type === "quote") return h("blockquote", { class: "dx-quote" }, inline(block.text, link));
    if (block.type === "rule") return h("hr", { class: "dx-rule" });
    if (block.type === "table") return h("div", { class: "dx-table", tabindex: 0, role: "region", aria: { label: "Table" } },
      h("table", h("thead", h("tr", block.header.map(c => h("th", inline(c, link))))), h("tbody", block.rows.map(r => h("tr", r.map((c, i) => h("td", { "data-label": plain(block.header[i] ?? "") }, inline(c, link))))))));
    const [label, icon, lang] = LANG[block.lang] ?? LANG.text;
    return CodeWindow({ file: label, code: block.text, lang, icon, class: "dx-code" });
  });
  return { nodes, headings };
}

function copyPage(p) {
  load(p.file).then(text => navigator.clipboard?.writeText(text)).then(
    () => toast("Page copied as Markdown", { tone: "success", description: "Paste it into your agent's context." }),
    () => toast("Copy failed", { tone: "danger" }));
}

function DocPage(p) {
  const state = signal({ status: "loading" });
  load(p.file).then(text => { state.value = { status: "ready", text }; }, () => { state.value = { status: "error" }; });
  return h("article", { class: "dx-article" }, () => {
    const s = state.value;
    if (s.status === "loading") return h("div", { class: "dx-loading", aria: { busy: "true" } }, h("i"), h("i"), h("i"));
    if (s.status === "error") return h("div", { class: "dx-missing" }, h("h1", "This page didn't load"), h("p", "Check your connection and try again."), Button({ onClick: () => location.reload() }, "Reload"));
    const blocks = parse(s.text);
    const titleBlock = blocks[0]?.type === "heading" && blocks[0].level === 1 ? blocks.shift() : null;
    const leadBlock = blocks[0]?.type === "para" ? blocks.shift() : null;
    const { nodes, headings } = renderBlocks(blocks);
    queueMicrotask(() => { toc.value = headings.filter(x => x.level === 2 || x.level === 3); scrollToHash(); });
    return [
      Header(p, titleBlock ? inline(titleBlock.text, link) : p.title, leadBlock ? inline(leadBlock.text, link) : p.text),
      p.live ? h("a", { class: "dx-live", href: p.live },
        h("span", { class: "dx-live-ico" }, Icon({ name: "eye", size: 16 })),
        h("span", h("b", "See them running"), h("small", "Every one, live, with its code and an Open in Builder button.")),
        Icon({ name: "arrow-right", size: 15 })) : null,
      h("div", { class: "dx-prose" }, nodes),
      Pager(p)
    ];
  });
}

function Header(p, title, lead) {
  return h("header", { class: "dx-head" },
    h("p", { class: "dx-eyebrow" }, h("i"), p.group),
    h("h1", { class: "dx-title" }, title),
    lead ? h("p", { class: "dx-lead" }, lead) : null,
    p.file ? h("div", { class: "dx-tools" },
      Button({ size: "sm", variant: "ghost", icon: "copy", onClick: () => copyPage(p) }, "Copy as Markdown"),
      Button({ size: "sm", variant: "ghost", icon: "type", href: `/docs/${p.file}` }, "View .md"),
      Button({ size: "sm", variant: "ghost", icon: "pen", href: REPO + p.file, target: "_blank", rel: "noopener" }, "Edit on GitHub")) : null);
}

function Pager(p) {
  const i = PAGES.indexOf(p);
  const prev = PAGES[i - 1], next = PAGES[i + 1];
  const card = (q, dir) => h("a", { class: "dx-pager-card", "data-dir": dir, href: q.slug ? `/${q.slug}/` : "/" },
    h("small", dir === "prev" ? "Previous" : "Next"), h("b", q.title));
  return h("nav", { class: "dx-pager", aria: { label: "More docs" } }, prev ? card(prev, "prev") : h("span"), next ? card(next, "next") : h("span"));
}

function scrollToHash() {
  if (!location.hash) return;
  const target = document.getElementById(decodeURIComponent(location.hash.slice(1)));
  if (target) requestAnimationFrame(() => target.scrollIntoView({ block: "start" }));
}

function Home() {
  const p = PAGES[0];
  queueMicrotask(() => { toc.value = [{ id: "start", text: "Start in 60 seconds", level: 2 }, { id: "map", text: "Where to next", level: 2 }, { id: "faq", text: "Questions", level: 2 }]; scrollToHash(); });
  return h("article", { class: "dx-article" },
    Header(p, ["Read the whole thing", h("br"), h("span", { class: "dx-gold" }, "in an afternoon.")], "Lucid UI is small enough to learn end to end. Start with a working page in a minute, then read the references. They're short on purpose, because agents read them too."),
    QuickStart(),
    h("section", { class: "dx-section", id: "map" },
      h("h2", { class: "dx-h" }, "Where to next", h("a", { href: "#map", class: "dx-anchor", aria: { label: "Link to Where to next" } }, "#")),
      h("div", { class: "dx-map" }, PAGES.slice(1).map(q => h("a", { class: "dx-map-card", href: `/${q.slug}/` },
        h("span", { class: "dx-map-ico" }, Icon({ name: q.icon, size: 17 })),
        h("b", q.title),
        h("small", q.text))))),
    Faq(),
    Pager(p));
}

function QuickStart() {
  const step = (n, title, text, ...rest) => h("li", { class: "dx-step" },
    h("span", { class: "dx-step-n" }, n),
    h("div", { class: "dx-step-body" }, h("h3", title), h("p", text), rest));
  return h("section", { class: "dx-section", id: "start" },
    h("h2", { class: "dx-h" }, "Start in 60 seconds", h("a", { href: "#start", class: "dx-anchor", aria: { label: "Link to Start in 60 seconds" } }, "#")),
    h("ol", { class: "dx-steps" },
      step("1", "Save this as index.html and open it", "No install and no build step. This is a complete Lucid UI app.",
        CodeWindow({ file: "index.html", code: STARTER, lang: "html", icon: "monitor", class: "dx-code" })),
      step("2", "Build a real screen from components", "Replace the code inside the script tag with this. Pages, sections and rows come styled, so you write no CSS.",
        CodeWindow({ file: "app.js", code: ADD, lang: "js", class: "dx-code" })),
      step("3", "Or hand it to your AI agent", "Copy the brief and paste it before your request, then ask for what you need, like a settings page.",
        h("div", { class: "dx-step-actions" },
          Button({ variant: "primary", icon: "copy", onClick: copyBrief }, "Copy the agent brief"),
          Button({ href: "/agents/", icon: "sparkles" }, "Connect your agent to Builder")))));
}

function Faq() {
  return h("section", { class: "dx-section", id: "faq" },
    h("h2", { class: "dx-h" }, "Questions", h("a", { href: "#faq", class: "dx-anchor", aria: { label: "Link to Questions" } }, "#")),
    h("div", { class: "dx-faq" },
      FAQ.map(([question, answer]) => h("details", { class: "dx-faq-item" },
        h("summary", h("span", question), Icon({ name: "plus", size: 14 })),
        h("p", answer)))));
}

function Sidebar() {
  return h("nav", { class: "dx-side", aria: { label: "Docs" } },
    GROUPS.map(group => h("div", { class: "dx-side-group" },
      h("p", { class: "dx-side-title" }, group),
      PAGES.filter(p => p.group === group).map(p => h("a", { class: "dx-side-link", href: p.slug ? `/${p.slug}/` : "/", "aria-current": () => (route.value === p.slug ? "page" : undefined) },
        Icon({ name: p.icon, size: 15 }), h("span", p.title))))),
    h("div", { class: "dx-side-group" },
      h("p", { class: "dx-side-title" }, "Elsewhere"),
      LINKS.map(l => h("a", { class: "dx-side-link dx-side-out", href: l.href, target: l.href.startsWith("/") ? undefined : "_blank", rel: "noopener" }, Icon({ name: l.icon, size: 15 }), h("span", l.label)))));
}

function MobileBar() {
  return h("div", { class: "dx-mbar" },
    Select({ value: route, size: "md", class: "dx-mselect", aria: { label: "Docs page" }, onChange: slug => go(slug),
      options: PAGES.map(p => ({ value: p.slug, label: p.title, icon: p.icon, hint: p.group })) }));
}

function Toc() {
  let io;
  effect(() => {
    const items = toc.value;
    io?.disconnect();
    io = new IntersectionObserver(entries => {
      const visible = entries.filter(e => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
      if (visible[0]) activeHeading.value = visible[0].target.id;
    }, { rootMargin: "-80px 0px -70% 0px" });
    requestAnimationFrame(() => items.forEach(item => { const el = document.getElementById(item.id); if (el) io.observe(el); }));
  });
  onCleanup(() => io?.disconnect());
  return h("aside", { class: "dx-toc", aria: { label: "On this page" } },
    () => (toc.value.length ? [
      h("p", { class: "dx-toc-title" }, "On this page"),
      h("div", { class: "dx-toc-list" }, toc.value.map(item => h("a", { href: `#${item.id}`, class: "dx-toc-link", "data-level": item.level, "aria-current": () => (activeHeading.value === item.id ? "true" : undefined),
        onClick: event => { event.preventDefault(); document.getElementById(item.id)?.scrollIntoView({ behavior: "smooth", block: "start" }); history.replaceState(null, "", `#${item.id}`); } }, item.text))),
      h("button", { type: "button", class: "dx-toc-top", onClick: () => window.scrollTo({ top: 0, behavior: "smooth" }) }, Icon({ name: "arrow-up", size: 13 }), "Back to top")
    ] : null));
}

const searchItems = computed(() => {
  const out = PAGES.map(p => ({ group: "Docs", label: p.title, icon: p.icon, keywords: p.text, run: () => go(p.slug) }));
  for (const p of PAGES) {
    const text = texts.value[p.file];
    if (!text) continue;
    const seen = new Map();
    for (const block of parse(text)) {
      if (block.type !== "heading" || block.level < 2 || block.level > 3) continue;
      const label = plain(block.text);
      const base = slugify(label) || "section";
      const n = seen.get(base) ?? 0;
      seen.set(base, n + 1);
      const hid = n ? `${base}-${n}` : base;
      out.push({ group: `In ${p.title}`, label, icon: "hash", searchOnly: true, keywords: p.title, run: () => go(p.slug, `#${hid}`) });
    }
  }
  return out;
});

mountPage({
  site: "docs",
  commands: () => searchItems.value,
  main: () => {
    setTimeout(() => PAGES.filter(p => p.file).forEach(p => load(p.file).catch(() => {})), 600);
    return h("div", { class: "dx" },
      MobileBar(),
      h("div", { class: "dx-wrap" },
        Sidebar(),
        h("main", { class: "dx-main" }, () => {
          const p = page.value;
          activeHeading.value = "";
          toc.value = [];
          if (!p) return h("div", { class: "dx-missing" }, h("h1", "No page here"), h("p", "That docs page doesn't exist, or it moved."), Button({ href: "/", icon: "home" }, "Docs home"));
          return p.slug ? DocPage(p) : Home();
        }),
        Toc()));
  }
});

faqData();
