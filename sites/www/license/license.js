import { signal, h, tags } from "/lucid/index.js";
import { Button } from "/lucid/ui/index.js";
import { mountPage, DownloadButton } from "/shared/chrome.js";
import { Doc, Part, Contact } from "/shared/doc.js";

const { p, ul, li, b } = tags;

const text = signal("");
fetch("/LICENSE.txt").then(response => (response.ok ? response.text() : "")).then(value => { text.value = value.trim(); }).catch(() => {});

mountPage({
  site: "license",
  main: L => Doc({
    eyebrow: "license",
    title: "Free and open source. For good.",
    lead: "Lucid UI is released under the MIT license. Use it in personal and commercial work, change it, and ship it, with no fee and no permission needed.",
    updated: "2 October 2026"
  },
  Part("In plain words",
    ul(
      li(b("You can "), "use, copy, modify, merge, publish, distribute, sublicense and sell Lucid UI, in open or closed projects."),
      li(b("You must "), "keep the copyright notice and the license text with copies of the source."),
      li(b("There is no warranty. "), "Lucid UI is provided as is."))),
  Part("The license",
    () => (text.value
      ? h("pre", { class: "doc-license" }, text.value)
      : h("p", "The full text ships with the package as LICENSE, and is also at ", h("a", { href: "/LICENSE.txt" }, "/LICENSE.txt"), ".")),
    h("div", { class: "doc-actions" },
      Button({ size: "sm", href: "/LICENSE.txt", icon: "hash" }, "Plain text"),
      DownloadButton({ size: "sm", variant: "ghost", label: "Download Lucid UI" }))),
  Part("The name and the mark",
    p("The MIT license covers the code. It does not cover the Lucid UI name or logo. You're welcome to say your project is built with Lucid UI; please don't use the name or mark in a way that suggests your project is ours or endorsed by us.")),
  Part("Security",
    p("Found a vulnerability? Please report it privately before sharing it publicly, so it can be fixed first."),
    Contact({ email: "security@lucidui.dev", label: "Report a security issue" })),
  Part("Questions",
    p("Licensing, trademark and anything legal."),
    Contact({ email: "legal@lucidui.dev", label: "Legal" })))
});
