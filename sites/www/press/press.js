import { signal, computed, h, version } from "/lucid/index.js";
import { Button, Segmented, Input, Icon, Tooltip, toast } from "/lucid/ui/index.js";
import { StatTile, Waffle } from "/lucid/viz/index.js";
import { mountPage, SectionHead, jump } from "/shared/chrome.js";

const MARKS = "/media/logo";
const KIT = "/media/press/lucidui-press-kit.zip";

const LOGOS = [
  { file: "avatar-wordmark.svg", name: "Primary lockup", text: "The mark and wordmark together. Use this one first.", stage: "obsidian", wide: true },
  { file: "avatar.svg", name: "Mark", text: "For avatars, app icons and anywhere space is tight.", stage: "obsidian" },
  { file: "avatar-wordmark-white.svg", name: "Lockup, white", text: "One colour, for obsidian and dark photography.", stage: "obsidian" },
  { file: "avatar-wordmark-black.svg", name: "Lockup, black", text: "One colour, for light backgrounds and print.", stage: "paper" },
  { file: "avatar-outline.svg", name: "Mark, outline", text: "A quiet watermark for large obsidian surfaces.", stage: "obsidian" },
  { file: "../lucid-mark.svg", name: "Favicon", text: "The small rounded mark used in browsers and the nav.", stage: "paper", small: true }
];

const COLOURS = [
  { name: "Obsidian", hex: "#111111", role: "Primary. The ground the mark sits on.", ink: "#fff" },
  { name: "Graphite", hex: "#1C1C1B", role: "Raised surfaces and depth above obsidian.", ink: "#fff" },
  { name: "Champagne", hex: "#E8D6A8", role: "The mark itself, and small highlights.", ink: "#111111" },
  { name: "Deep champagne", hex: "#8A6D1F", role: "Champagne for text on paper.", ink: "#fff" },
  { name: "Navy ink", hex: "#0A2540", role: "Headings and numbers in the interface.", ink: "#fff" },
  { name: "Slate", hex: "#425466", role: "Body copy in the interface.", ink: "#fff" },
  { name: "Paper", hex: "#F3F3F1", role: "Quiet backgrounds and print stock.", ink: "#0a2540" }
];

const BOILERPLATE = {
  short: "Lucid UI is a small, dependency-free UI runtime for the web, built for people and the AI agents that now write much of their code.",
  medium: "Lucid UI is a free, open-source UI runtime for the web. It pairs fine-grained signals with finished, accessible components and a signature set of charts drawn with dots, all in a few kilobytes with no build step. Its entire API fits on one page, so AI coding agents can learn it in a single read, and every mistake comes back with a stable code and a fix.",
  long: "Lucid UI is a free, open-source UI runtime for the web, released under the MIT license. Instead of a framework you compile, it is a handful of readable JavaScript modules: fine-grained signals that update exactly what changed, a set of components designed together and wired for keyboards and screen readers, and charts built entirely from dots, a calm and countable alternative to bars and pies. The core is 5.8 KB gzipped and has no dependencies. Lucid UI was designed for a world where AI agents write much of the interface: its complete API reference is about 1,100 tokens, small enough for an agent to read whole, and its diagnostics explain every mistake with a code and a fix. Lucid UI's own websites are built with it, unminified, so anyone can read every line."
};

const NAMES = [
  ["Lucid UI", true, "Two words, capital L, capital U and I."],
  ["LucidUI", false, "Joined up."],
  ["Lucid-UI", false, "Hyphenated."],
  ["lucid ui", false, "All lower case, except in code and URLs."],
  ["Lucid", true, "Fine on second mention, once the full name is established."]
];

const copy = (text, label) => {
  navigator.clipboard?.writeText(text).then(
    () => toast(`${label} copied`, { tone: "success", description: text.length > 64 ? `${text.slice(0, 64)}…` : text }),
    () => toast("Copy failed", { tone: "danger" })
  );
};

async function exportPng(src, size, name) {
  try {
    const image = new Image();
    image.src = src;
    await image.decode();
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    canvas.getContext("2d").drawImage(image, 0, 0, size, size);
    const blob = await new Promise(resolve => canvas.toBlob(resolve, "image/png"));
    const url = URL.createObjectURL(blob);
    const link = h("a", { href: url, download: `${name}-${size}.png` });
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
    toast("PNG ready", { tone: "success", description: `${name}-${size}.png` });
  } catch {
    toast("Couldn't make the PNG", { tone: "danger", description: "Download the SVG instead; it scales to any size." });
  }
}

const rgb = hex => [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16));

function Hero(L) {
  const tilt = signal({ x: 0, y: 0 });
  const onMove = event => {
    const rect = event.currentTarget.getBoundingClientRect();
    tilt.value = { x: (event.clientX - rect.left) / rect.width - 0.5, y: (event.clientY - rect.top) / rect.height - 0.5 };
  };
  return h("section", { class: "site-wrap press-hero-wrap" },
    h("div", { class: "press-hero", onPointermove: onMove, onPointerleave: () => { tilt.value = { x: 0, y: 0 }; } },
      h("div", { class: "press-hero-copy" },
        h("div", { class: "press-hero-eyebrow" }, h("span", { class: "section-eyebrow-dot" }), "press kit"),
        h("h1", { class: "press-hero-title" }, "Lucid UI, for the record."),
        h("p", { class: "press-hero-lead" }, "Logos, colours, type, facts and words, ready to use. Everything here is free to use when you write about Lucid UI."),
        h("div", { class: "press-hero-actions" },
          Button({ variant: "primary", size: "lg", href: KIT, download: "", icon: "download" }, "Download the press kit"),
          Button({ variant: "ghost", size: "lg", href: L.press_mail, icon: "inbox" }, "press@lucidui.dev")),
        h("div", { class: "press-hero-meta" }, "SVG logos · colour values · descriptions · ", h("span", "one zip"))),
      h("div", { class: "press-hero-art", "aria-hidden": "true" },
        h("div", {
          class: "press-hero-card",
          style: { transform: () => `perspective(900px) rotateY(${tilt.value.x * 14}deg) rotateX(${-tilt.value.y * 14}deg)` }
        },
        h("img", { src: `${MARKS}/avatar.svg`, alt: "", width: 320, height: 320 }),
        h("span", { class: "press-hero-shine", style: { "--x": () => `${(tilt.value.x + 0.5) * 100}%`, "--y": () => `${(tilt.value.y + 0.5) * 100}%` } })))));
}

function Facts() {
  const tile = (label, value, unit) => h("div", { class: "press-fact" }, StatTile({ label, value, unit, format: v => v }));
  return h("section", { class: "press-section", id: "facts" },
    h("div", { class: "site-wrap" },
      SectionHead({ eyebrow: "at a glance", title: "The short version." }),
      h("div", { class: "press-facts" },
        tile("First release", "Oct", "2026"),
        tile("Core, gzipped", "5.8", "KB"),
        tile("Dependencies", "0"),
        tile("Whole API reference", "1,140", "tokens"),
        tile("License", "MIT"),
        tile("Current version", version))));
}

function LogoCard(logo) {
  const size = signal(2160);
  const src = `${MARKS}/${logo.file}`;
  const base = logo.file.replace("../", "").replace(".svg", "");
  return h("article", { class: ["logo-card", logo.wide ? "logo-wide" : null], "data-stage": logo.stage },
    h("div", { class: "logo-stage" },
      h("img", { src, alt: `Lucid UI ${logo.name.toLowerCase()}`, class: logo.small ? "logo-small" : null, loading: "lazy" })),
    h("div", { class: "logo-info" },
      h("div", { class: "logo-head" },
        h("h3", { class: "logo-name" }, logo.name),
        h("span", { class: "logo-file" }, `${base}.svg`)),
      h("p", { class: "logo-text" }, logo.text),
      h("div", { class: "logo-actions" },
        Button({ size: "sm", href: src, download: `lucidui-${base}.svg`, icon: "download" }, "SVG"),
        Button({ size: "sm", variant: "ghost", icon: "image", onClick: () => exportPng(src, size.peek(), `lucidui-${base}`) }, "PNG"),
        Segmented({
          value: size,
          size: "sm",
          aria: { label: `${logo.name} PNG size` },
          options: [{ value: 1080, label: "1K" }, { value: 2160, label: "2K" }, { value: 4320, label: "4K" }]
        }))));
}

function Logos() {
  return h("section", { class: "press-section", id: "logos" },
    h("div", { class: "site-wrap" },
      h("div", { class: "press-head-row" },
        SectionHead({ eyebrow: "logos", title: "The mark and the name.", lead: "Download any logo as SVG, or as a PNG at the size you need, made right here in your browser." }),
        Button({ href: KIT, download: "", icon: "download" }, "All logos (.zip)")),
      h("div", { class: "logo-grid" },
        LOGOS.map(LogoCard),
        h("article", { class: "kit-card" },
          h("div",
            h("h3", "Everything in one zip."),
            h("p", "Every logo as SVG, the favicon and the colour values, ready to drop into a story or a slide."),
            h("div", { class: "kit-files" }, "6 SVG files · colours.txt")),
          Button({ variant: "primary", size: "lg", href: KIT, download: "", icon: "download" }, "Download the press kit")))));
}

function Usage() {
  const rule = (ok, label, cls) => h("figure", { class: ["rule", ok ? "rule-do" : "rule-dont"] },
    h("div", { class: "rule-stage" }, h("img", { src: `${MARKS}/avatar-wordmark.svg`, alt: "", class: cls })),
    h("figcaption", h("span", { class: "rule-badge" }, Icon({ name: ok ? "check" : "x", size: 12, stroke: 3 })), label));
  return h("section", { class: "press-section press-tint", id: "usage" },
    h("div", { class: "site-wrap" },
      SectionHead({ eyebrow: "usage", title: "Give it room. Leave it as it is.", lead: "Keep clear space around the logo equal to the height of the L, and never show the mark smaller than 16 pixels or the lockup narrower than 96." }),
      h("div", { class: "usage-grid" },
        h("figure", { class: "clearspace" },
          h("div", { class: "clearspace-box" },
            h("span", { class: "clearspace-zone" }),
            h("img", { src: `${MARKS}/avatar.svg`, alt: "The mark with clear space marked around it" }),
            ["top", "right", "bottom", "left"].map(side => h("span", { class: `clearspace-x clearspace-${side}` }, "x"))),
          h("figcaption", "Clear space equals x, the height of the L.")),
        h("div", { class: "rules" },
          rule(true, "Use the logo as supplied"),
          rule(false, "Don't change its colours", "r-hue"),
          rule(false, "Don't stretch or squash it", "r-stretch"),
          rule(false, "Don't add filters or effects", "r-glow"),
          rule(false, "Don't rotate it", "r-rotate"),
          rule(false, "Don't crop it", "r-crop")))));
}

function Colours() {
  return h("section", { class: "press-section", id: "colour" },
    h("div", { class: "site-wrap" },
      SectionHead({ eyebrow: "colour", title: "Obsidian and champagne.", lead: "Obsidian carries the brand, champagne marks it, and navy and slate do the reading. Click any colour to copy its hex value." }),
      h("div", { class: "swatches" },
        COLOURS.map(colour => {
          const [r, g, b] = rgb(colour.hex);
          return h("button", {
            type: "button",
            class: "swatch",
            style: { "--c": colour.hex, "--ink": colour.ink },
            onClick: () => copy(colour.hex, colour.name),
            aria: { label: `Copy ${colour.name}, ${colour.hex}` }
          },
          h("span", { class: "swatch-chip" },
            h("span", { class: "swatch-hex" }, colour.hex),
            h("span", { class: "swatch-copy" }, Icon({ name: "copy", size: 13 }), "Copy")),
          h("span", { class: "swatch-info" },
            h("b", colour.name),
            h("span", { class: "swatch-role" }, colour.role),
            h("span", { class: "swatch-values" }, `RGB ${r} ${g} ${b}`)));
        })),
      h("div", { class: "proportion" },
        h("div", { class: "proportion-copy" },
          h("h3", "In proportion"),
          h("p", "A Lucid UI layout is mostly obsidian or paper, with champagne used sparingly. Each dot is one percent of a typical page.")),
        Waffle({
          columns: 20,
          rows: 5,
          label: "Brand colour proportions",
          segments: [
            { label: "Obsidian", value: 46, color: "#111111" },
            { label: "Paper", value: 30, color: "#D9D6CF" },
            { label: "Navy and slate", value: 14, color: "#425466" },
            { label: "Champagne", value: 10, color: "#E8D6A8" }
          ]
        }))));
}

function Type() {
  const sample = signal("Interfaces with taste");
  const size = signal("lg");
  const ground = signal("obsidian");
  const sizes = { md: "48px", lg: "84px", xl: "128px" };
  const alphabet = ["ABCDEFGHIJKLM", "NOPQRSTUVWXYZ", "abcdefghijklm", "nopqrstuvwxyz", "0123456789", "&!?.,:;@#()"];
  return h("section", { class: "press-section press-tint", id: "type" },
    h("div", { class: "site-wrap" },
      SectionHead({ eyebrow: "type", title: "Rubik for the name. Geist for everything else.", lead: "The wordmark is set in Rubik Bold: geometric, heavy and softly rounded. Headlines, body copy and code are set in Geist and Geist Mono." }),
      h("div", { class: "logotype" },
        h("div", { class: "logotype-hero" },
          h("div", { class: "logotype-aa" }, "Aa"),
          h("div", { class: "logotype-meta" },
            h("div", { class: "logotype-name" }, "Rubik"),
            h("dl", { class: "logotype-specs" },
              h("dt", "Role"), h("dd", "The wordmark, and nothing else"),
              h("dt", "Weight"), h("dd", "Bold"),
              h("dt", "Style"), h("dd", "Geometric sans, softly rounded corners"),
              h("dt", "License"), h("dd", "SIL Open Font License")))),
        h("div", { class: "logotype-alphabet", "aria-hidden": "true" }, alphabet.map(row => h("div", row))),
        h("div", { class: "tester" },
          h("div", { class: "tester-controls" },
            Input({ bind: sample, placeholder: "Type something", aria: { label: "Sample text" }, icon: "type", maxlength: 60 }),
            Segmented({ value: size, size: "sm", aria: { label: "Size" }, options: [{ value: "md", label: "M" }, { value: "lg", label: "L" }, { value: "xl", label: "XL" }] }),
            Segmented({ value: ground, size: "sm", aria: { label: "Background" }, options: [{ value: "obsidian", label: "Obsidian" }, { value: "paper", label: "Paper" }, { value: "champagne", label: "Champagne" }] })),
          h("div", { class: "tester-stage", "data-ground": ground, style: { "--size": () => sizes[size.value] } }, () => sample.value.trim() || "Lucid UI"))),
      h("div", { class: "type-pair" },
        h("div", { class: "type-card" },
          h("div", { class: "type-card-label" }, "Interface"),
          h("div", { class: "type-card-sample type-geist" }, "Geist"),
          h("p", "Headlines, body copy and every word in the product. Tight at display sizes, open and calm at reading sizes.")),
        h("div", { class: "type-card" },
          h("div", { class: "type-card-label" }, "Code"),
          h("div", { class: "type-card-sample type-mono" }, "Geist Mono"),
          h("p", "Code, issue IDs, file names and keyboard shortcuts. Same skeleton as Geist, so the two sit together.")))));
}

function Words(L) {
  const length = signal("medium");
  const text = computed(() => BOILERPLATE[length.value]);
  return h("section", { class: "press-section", id: "words" },
    h("div", { class: "site-wrap words" },
      h("div", { class: "words-main" },
        SectionHead({ eyebrow: "words", title: "Describe it in a line, or in a paragraph.", lead: "Pick a length and copy it. Edit freely to fit your piece." }),
        h("div", { class: "boiler" },
          h("div", { class: "boiler-bar" },
            Segmented({ value: length, size: "sm", aria: { label: "Length" }, options: [{ value: "short", label: "One line" }, { value: "medium", label: "Short" }, { value: "long", label: "Long" }] }),
            h("span", { class: "boiler-count" }, () => `${text.value.split(/\s+/).length} words`),
            h("span", { class: "lucid-spacer" }),
            Button({ size: "sm", icon: "copy", onClick: () => copy(text.peek(), "Description") }, "Copy")),
          h("p", { class: "boiler-text" }, text))),
      h("aside", { class: "names" },
        h("h3", "Writing the name"),
        h("ul", NAMES.map(([name, ok, note]) => h("li", { "data-ok": String(ok) },
          h("span", { class: "name-badge" }, Icon({ name: ok ? "check" : "x", size: 12, stroke: 3 })),
          h("span", h("b", name), h("span", note))))))));
}

function Contact(L) {
  return h("section", { class: "press-section", id: "contact" },
    h("div", { class: "site-wrap" },
      h("div", { class: "press-contact" },
        h("div",
          h("div", { class: "press-hero-eyebrow" }, h("span", { class: "section-eyebrow-dot" }), "contact"),
          h("h2", { class: "press-contact-title" }, "Writing about Lucid UI?"),
          h("p", { class: "press-contact-text" }, "For interviews, early access, screenshots or a quote, write to the press inbox. For permission to use the name or logo in other ways, write to legal.")),
        h("div", { class: "press-contact-actions" },
          Button({ variant: "primary", size: "lg", href: L.press_mail, icon: "inbox" }, "press@lucidui.dev"),
          Button({ variant: "secondary", size: "lg", href: L.legal, icon: "info" }, "legal@lucidui.dev")))));
}

mountPage({
  site: "press",
  main: L => [Hero(L), Facts(), Logos(), Usage(), Colours(), Type(), Words(L), Contact(L)],
  commands: [
    { group: "On this page", label: "Logos", icon: "image", run: jump("logos") },
    { group: "On this page", label: "Usage", icon: "check-circle", run: jump("usage") },
    { group: "On this page", label: "Colour", icon: "sparkles", run: jump("colour") },
    { group: "On this page", label: "Type", icon: "type", run: jump("type") },
    { group: "On this page", label: "Descriptions", icon: "message", run: jump("words") },
    { group: "On this page", label: "Download the press kit", icon: "download", run: () => { location.href = KIT; } }
  ]
});
