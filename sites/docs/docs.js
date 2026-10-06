import { h } from "/lucid/index.js";
import { Button, Icon } from "/lucid/ui/index.js";
import { mountPage, SectionHead, DownloadButton } from "/shared/chrome.js";

const GUIDES = [
  { href: "/docs/API.md", icon: "hash", title: "API reference", text: "The whole core on one page: signals, elements, control flow and mounting." },
  { href: "/docs/UI.md", icon: "layers", title: "Components", text: "Buttons, inputs, selects, date picker, menus, dialogs, forms, undo and long lists." },
  { href: "/docs/VIZ.md", icon: "chart", title: "Charts", text: "Dot columns, dumbbells, waffles, unit rows, calendars and stat tiles." },
  { href: "/docs/DIAGNOSTICS.md", icon: "alert-circle", title: "Diagnostics", text: "Every warning and error code Lucid reports, with the fix for each." },
  { href: "/llms.txt", icon: "sparkles", title: "llms.txt", text: "The entry point for AI agents, pointing at everything above." },
  { href: "/docs/VISION.md", icon: "target", title: "Vision", text: "What Lucid UI is for, its principles, and where it is going next." }
];

const GUIDES_OPEN = false;

mountPage({
  site: "docs",
  main: L => h("div", { class: "site-wrap docs-home" },
    SectionHead({
      eyebrow: "docs",
      title: GUIDES_OPEN ? "Read the whole thing in an afternoon." : "The docs are being written.",
      lead: GUIDES_OPEN
        ? "A full documentation site is on the way. Until then, these are the same references the library ships with, short enough to read end to end."
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
      Button({ href: L.playground, iconRight: "arrow-right" }, "Try the sandbox")))
});
