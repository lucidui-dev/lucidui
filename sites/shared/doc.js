import { h } from "/lucid/index.js";
import { Icon } from "/lucid/ui/index.js";
import { SectionHead } from "/shared/chrome.js";

export function Doc({ eyebrow, title, lead, updated }, ...body) {
  return h("div", { class: "site-wrap doc" },
    SectionHead({ eyebrow, title, lead, level: 1 }),
    updated ? h("p", { class: "doc-updated" }, `Last updated ${updated}`) : null,
    h("article", { class: "doc-body" }, body));
}

export function Part(title, ...content) {
  return h("section", { class: "doc-part" }, h("h2", title), content);
}

export function Contact({ email, label, text }) {
  return h("a", { class: "doc-contact", href: `mailto:${email}` },
    h("span", { class: "doc-contact-icon" }, Icon({ name: "inbox", size: 16 })),
    h("span", { class: "doc-contact-copy" }, h("b", label), h("span", text ?? email)),
    Icon({ name: "arrow-right", size: 15 }));
}
