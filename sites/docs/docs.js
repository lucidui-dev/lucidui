import { h } from "/lucid/index.js";
import { Button, Icon } from "/lucid/ui/index.js";
import { mountPage, SectionHead, DownloadButton, copyBrief } from "/shared/chrome.js";
import { CodeWindow } from "/shared/code.js";

const GUIDES = [
  { href: "/docs/API.md", icon: "hash", title: "API reference", text: "The whole core on one page: signals, elements, control flow and mounting." },
  { href: "/docs/UI.md", icon: "layers", title: "Components", text: "Buttons, inputs, selects, date picker, menus, dialogs, forms, undo and long lists." },
  { href: "/docs/AGENTS.md", icon: "link", title: "Build with an agent", text: "Connect Claude Code, Cursor or any MCP agent to Builder, or use the brief. Setup, pairing and troubleshooting." },
  { href: "/docs/RECIPES.md", icon: "layers", title: "Recipes", text: "Complete settings, dashboard and list pages built only from Lucid components." },
  { href: "/docs/WORDPRESS.md", icon: "download", title: "WordPress", text: "Install the plugin, write apps as theme files, pass props, read WordPress content and troubleshoot." },
  { href: "/docs/VIZ.md", icon: "chart", title: "Charts", text: "Dot columns, dumbbells, waffles, unit rows, calendars and stat tiles." },
  { href: "/docs/DIAGNOSTICS.md", icon: "alert-circle", title: "Diagnostics", text: "Every warning and error code Lucid reports, with the fix for each." },
  { href: "/llms.txt", icon: "sparkles", title: "llms.txt", text: "The entry point for AI agents, pointing at everything above." },
  { href: "/docs/VISION.md", icon: "target", title: "Vision", text: "What Lucid UI is for, its principles, and where it is going next." }
];

const GUIDES_OPEN = true;

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
];

const faqData = () => {
  const data = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQ.map(([name, text]) => ({ "@type": "Question", name, acceptedAnswer: { "@type": "Answer", text } }))
  };
  document.head.append(h("script", { type: "application/ld+json" }, JSON.stringify(data)));
};

function QuickStart() {
  const step = (n, title, text, ...body) => h("li", { class: "qs-step" },
    h("div", { class: "qs-head" }, h("span", { class: "qs-n" }, n), h("div", h("h3", { class: "qs-title" }, title), h("p", { class: "qs-text" }, text))),
    body);
  return h("section", { class: "qs", id: "start" },
    h("h2", { class: "docs-h2" }, "Start in 60 seconds"),
    h("ol", { class: "qs-steps" },
      step("1", "Save this as index.html and open it", "No install and no build step. This is a complete Lucid UI app.",
        CodeWindow({ file: "index.html", code: STARTER, lang: "html", icon: "monitor", class: "code-compact" })),
      step("2", "Build a real screen from components", "Replace the code inside the script tag with this. Pages, sections and rows come styled, so you write no CSS.",
        CodeWindow({ file: "app.js", code: ADD, lang: "js", class: "code-compact" })),
      step("3", "Or hand it to your AI agent", "Copy the brief, paste it before your request, then ask for what you need: \u201cmake a settings page\u201d.",
        h("div", { class: "qs-brief" },
          Button({ variant: "primary", icon: "copy", onClick: copyBrief }, "Copy the agent brief"),
          Button({ href: "/docs/AGENTS.md", icon: "link" }, "Connect your agent to Builder"),
          Button({ variant: "ghost", href: "/llms-full.txt", icon: "sparkles" }, "Open llms-full.txt")))));
}

function Faq() {
  return h("section", { class: "faq", id: "faq" },
    h("h2", { class: "docs-h2" }, "Questions"),
    h("div", { class: "faq-list" },
      FAQ.map(([question, answer]) => h("details", { class: "faq-item" },
        h("summary", h("span", question), Icon({ name: "plus", size: 14 })),
        h("p", answer)))));
}


mountPage({
  site: "docs",
  main: L => h("div", { class: "site-wrap docs-home" },
    SectionHead({
      eyebrow: "docs",
      title: GUIDES_OPEN ? "Read the whole thing in an afternoon." : "The docs are being written.",
      lead: GUIDES_OPEN
        ? "Start in a minute below, or read the references the library ships with. They are short enough to read end to end."
        : "Every guide is getting a careful pass before it goes public. In the meantime, the sandbox shows Lucid UI doing real work.",
      level: 1
    }),
    GUIDES_OPEN
      ? h("div", { class: "guide-grid" },
          GUIDES.map(guide => h("a", { class: "guide", href: guide.href },
            h("span", { class: "principle-icon" }, Icon({ name: guide.icon, size: 18 })),
            h("span", { class: "guide-title" }, guide.title, Icon({ name: "arrow-right", size: 14 })),
            h("span", { class: "guide-text" }, guide.text))))
      : h("div", { class: "guide-grid guide-grid-closed", "aria-label": "Guides coming soon" },
          GUIDES.map(guide => h("div", { class: "guide guide-closed" },
            h("span", { class: "principle-icon" }, Icon({ name: guide.icon, size: 18 })),
            h("span", { class: "guide-title" }, guide.title, Icon({ name: "lock", size: 13 })),
            h("span", { class: "guide-text" }, "Coming soon")))),
    h("div", { class: "docs-cta" },
      DownloadButton({ label: "Download Lucid UI" }),
      Button({ href: L.playground, iconRight: "arrow-right" }, "Try the sandbox")),
    QuickStart(),
    Faq())
});

faqData();
