import { signal, h, onCleanup } from "/lucid/index.js";
import { Button, Icon, toast } from "/lucid/ui/index.js";
import { mountPage } from "/shared/chrome.js";
import { releaseFor, releaseDate, releaseText, CODE } from "/press/releases.js";

const slug = location.pathname.split("/").filter(Boolean)[1];
const release = releaseFor(slug);
const still = matchMedia("(prefers-reduced-motion: reduce)").matches;

const withCode = text => {
  const out = [];
  let last = 0;
  for (const match of text.matchAll(CODE)) {
    out.push(text.slice(last, match.index), h("code", match[0]));
    last = match.index + match[0].length;
  }
  out.push(text.slice(last));
  return out;
};

const copyText = r => {
  navigator.clipboard?.writeText(releaseText(r)).then(
    () => toast("Release copied", { tone: "success", description: "Plain text, ready to paste into an email." }),
    () => toast("Copy failed", { tone: "danger", description: "Open the plain text version and copy it from there." })
  );
};

function Actions(r) {
  return [
    Button({ variant: "primary", size: "lg", href: `/media/press/${r.pdf}`, download: "", icon: "download" }, "Download PDF"),
    Button({ variant: "secondary", size: "lg", icon: "copy", onClick: () => copyText(r) }, "Copy text"),
    Button({ variant: "ghost", size: "lg", href: `/press/${r.slug}.txt`, target: "_blank", rel: "noopener", icon: "external" }, "Plain text")
  ];
}

function WeighIn(w) {
  const shown = signal(still ? 1 : 0);
  if (!still) {
    let frame = 0;
    const start = performance.now() + 250;
    const tick = now => {
      const t = Math.min(1, Math.max(0, (now - start) / 1600));
      shown.value = 1 - Math.pow(1 - t, 3);
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    onCleanup(() => cancelAnimationFrame(frame));
  }
  const max = Math.max(...w.rows.map(row => row.kb));
  return h("figure", { class: "pr-weigh", "data-still": String(still) },
    h("figcaption", { class: "pr-weigh-head" },
      h("span", { class: "pr-weigh-eyebrow" }, h("span", { class: "section-eyebrow-dot" }), "the weigh-in"),
      h("b", w.title)),
    w.rows.map((row, r) => {
      const whole = Math.floor(row.kb);
      const part = row.kb - whole;
      const dots = Array.from({ length: Math.ceil(row.kb) }, (_, i) => h("i", { style: { "--i": i + r * 6, opacity: i === whole ? 0.3 + part * 0.7 : null } }));
      return h("div", { class: "pr-weigh-row", "data-lucid": String(Boolean(row.lucid)), role: "img", aria: { label: `${row.label}: ${row.kb} KB shipped, ${row.packages} ${row.packages === 1 ? "package" : "packages"}` } },
        h("div", { class: "pr-weigh-label" },
          h("span", row.label),
          h("b", () => `${(row.kb * shown.value).toFixed(1)} KB`)),
        h("div", { class: "pr-weigh-dots", style: { "--fill": `${(row.kb / max) * 100}%` }, "aria-hidden": "true" }, dots),
        h("div", { class: "pr-weigh-foot", "aria-hidden": "true" }, `${row.packages} ${row.packages === 1 ? "package" : "packages"}`));
    }),
    h("p", { class: "pr-weigh-note" }, w.note));
}

function Hero(r) {
  return h("section", { class: "site-wrap pr-hero-wrap" },
    h("div", { class: "pr-hero" },
      h("div", { class: "pr-hero-copy" },
        h("a", { class: "pr-back", href: "/press/" }, Icon({ name: "chevron-left", size: 15 }), "Press"),
        h("div", { class: "pr-meta" },
          h("span", { class: "pr-kicker" }, h("i"), r.kicker),
          h("time", { datetime: r.date }, releaseDate(r.date))),
        h("h1", { class: "pr-title" }, r.headline),
        h("p", { class: "pr-sub" }, r.sub),
        h("div", { class: "pr-actions" }, Actions(r))),
      h("div", { class: "pr-hero-art" }, WeighIn(r.weighIn))));
}

function Body(r) {
  return h("section", { class: "site-wrap pr-grid" },
    h("article", { class: "pr-body" },
      h("p", { class: "pr-immediate" }, r.immediate),
      h("p", { class: "pr-lead" }, h("strong", `${r.place}, ${releaseDate(r.date)}.`), " ", r.lead),
      r.body.map(p => h("p", withCode(p))),
      h("figure", { class: "pr-quote" },
        h("blockquote", h("p", r.quote)),
        h("figcaption", r.quoteBy)),
      h("h2", r.availabilityTitle),
      h("p", withCode(r.availability)),
      h("div", { class: "pr-about" },
        h("h2", r.aboutTitle),
        h("p", r.about),
        h("h2", r.contactTitle),
        h("p", h("a", { href: "mailto:press@lucidui.dev" }, "press@lucidui.dev"), " · ", h("a", { href: "/press/" }, "lucidui.dev/press"))),
      h("p", { class: "pr-end" }, "###")),
    h("aside", { class: "pr-side" },
      h("div", { class: "pr-facts" },
        h("h2", r.factsTitle),
        h("dl", r.facts.map(([a, b]) => h("div", h("dt", a), h("dd", b))))),
      h("div", { class: "pr-side-actions" }, Actions(r))));
}

function Missing() {
  return h("section", { class: "site-wrap pr-missing" },
    h("h1", "This release isn't here."),
    h("p", "It may have moved. Every release is listed on the press page."),
    Button({ variant: "primary", size: "lg", href: "/press/" }, "Go to the press page"));
}

mountPage({
  site: "press",
  main: () => (release ? [Hero(release), Body(release)] : [Missing()]),
  commands: release ? [
    { group: "On this page", label: "Download the PDF", icon: "download", run: () => { location.href = `/media/press/${release.pdf}`; } },
    { group: "On this page", label: "Copy the release as text", icon: "copy", run: () => copyText(release) },
    { group: "On this page", label: "Open the plain text version", icon: "external", run: () => { open(`/press/${release.slug}.txt`, "_blank", "noopener"); } }
  ] : []
});
