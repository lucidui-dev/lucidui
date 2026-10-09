import { h, signal } from "/lucid/index.js";
import { fetchShare, reportShare } from "/workspace.js";
import { standalone, SANDBOX } from "/runtime.js";

const stage = document.getElementById("stage");
const bar = document.getElementById("bar");
const id = stage.dataset.id;
const scheme = matchMedia("(prefers-color-scheme: dark)");
const svg = paths => h("svg", { width: 14, height: 14, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", "stroke-width": 2, "stroke-linecap": "round", "stroke-linejoin": "round", "aria-hidden": "true" }, paths.map(d => h("path", { d })));
const REMIX = ["M16 3h5v5", "M4 20 21 3", "M21 16v5h-5", "M15 15l6 6", "M4 4l5 5"];
const FLAG = ["M4 22V4", "M4 4h13l-2 4 2 4H4"];

const reported = signal("idle");
const report = () => {
  if (reported.peek() !== "idle") return;
  reported.value = "sending";
  reportShare(id).then(ok => { reported.value = ok ? "done" : "idle"; }, () => { reported.value = "idle"; });
};

bar.append(
  h("a", { class: "a-made", href: "https://build.lucidui.dev/" },
    h("img", { src: "/media/logo/lucidui-icon.svg", alt: "", width: 20, height: 20 }),
    h("span", h("span", { class: "a-long" }, "Made with "), h("b", "Lucid Builder"))),
  h("button", { type: "button", class: "a-btn", disabled: () => reported.value !== "idle", onClick: report }, svg(FLAG), () => (reported.value === "done" ? "Reported" : reported.value === "sending" ? "Sending…" : "Report")),
  h("a", { class: "a-btn", "data-variant": "primary", href: `/s/${id}` }, svg(REMIX), "Remix"));

const empty = (title, text) => stage.replaceChildren(h("div", { class: "a-empty" }, h("h1", title), h("p", text), h("a", { class: "a-btn", "data-variant": "primary", href: "/" }, "Open Builder")));

fetchShare(id).then(data => {
  const theme = scheme.matches ? "dark" : "light";
  const html = standalone(data.files, { local: true }).replace("<html lang=\"en\">", `<html lang="en" data-theme="${theme}">`);
  const frame = h("iframe", { class: "a-frame", title: data.name, sandbox: SANDBOX, allow: "clipboard-write; fullscreen" });
  frame.srcdoc = html;
  stage.replaceChildren(frame);
  scheme.addEventListener("change", () => { frame.srcdoc = standalone(data.files, { local: true }).replace("<html lang=\"en\">", `<html lang="en" data-theme="${scheme.matches ? "dark" : "light"}">`); });
}, () => empty("This app has been removed", "The link may have expired, or it was taken down after a report."));
