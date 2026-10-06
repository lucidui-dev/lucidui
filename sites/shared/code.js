import { h } from "/lucid/index.js";
import { Button, Tooltip, Icon, toast } from "/lucid/ui/index.js";

const KEYWORDS = new Set([
  "import", "from", "export", "const", "let", "var", "function", "return", "new", "if", "else",
  "await", "async", "true", "false", "null", "undefined", "for", "of", "in", "typeof"
]);

const JS = /("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|`(?:[^`\\]|\\.)*`)|(\b\d+(?:\.\d+)?\b)|([A-Za-z_$][\w$]*)|(=>|[{}()[\];,.:=+*?<>!&|-])|(\s+)|(.)/g;
const HTML = /(<\/?)([a-zA-Z][\w-]*)|([a-zA-Z-]+)(?==)|("(?:[^"\\]|\\.)*")|(\/?>)|(\s+)|([^<"\s]+)|(.)/g;

function tokensJS(line) {
  const out = [];
  let match;
  JS.lastIndex = 0;
  while ((match = JS.exec(line))) {
    const [text, string, number, word, punct] = match;
    let kind = null;
    if (string) kind = "str";
    else if (number) kind = "num";
    else if (word) {
      const before = line.slice(0, match.index).trimEnd();
      const after = line.slice(match.index + text.length).trimStart();
      if (KEYWORDS.has(word)) kind = "kw";
      else if (before.endsWith(".")) kind = after.startsWith("(") ? "fn" : "prop";
      else if (after.startsWith("(")) kind = /^[A-Z]/.test(word) ? "type" : "fn";
      else if (/^[A-Z]/.test(word)) kind = "type";
      else if (after.startsWith(":") && !after.startsWith("::")) kind = "prop";
    } else if (punct) kind = "punct";
    out.push([kind, text]);
  }
  return out;
}

function tokensHTML(line) {
  const out = [];
  let match;
  HTML.lastIndex = 0;
  while ((match = HTML.exec(line))) {
    const [text, open, tag, attr, string, close] = match;
    if (tag) out.push(["punct", open], ["tag", tag]);
    else if (attr) out.push(["prop", attr]);
    else if (string) out.push(["str", string]);
    else if (close) out.push(["punct", close]);
    else out.push([null, text]);
  }
  return out;
}

export function highlight(code, lang = "js") {
  const scripted = lang === "text" ? code.split("\n").map(line => (line ? [[line.startsWith("#") ? "kw" : line.startsWith(">") ? "str" : null, line]] : [])) : lang === "html" ? code.split("\n").map(line => (/^\s*(import|const|let|mount|signal)\b/.test(line) ? tokensJS(line) : tokensHTML(line))) : code.split("\n").map(tokensJS);
  return scripted.map((tokens, index) => h("span", { class: "code-line" },
    h("span", { class: "code-num", "aria-hidden": "true" }, String(index + 1)),
    h("span", { class: "code-text" }, tokens.length ? tokens.map(([kind, text]) => (kind ? h("span", { class: `tok-${kind}` }, text) : text)) : " ")));
}

export function CodeWindow({ file, code, lang = "js", icon = "hash", class: cls } = {}, ...below) {
  const source = code.replace(/^\n+|\s+$/g, "");
  const copy = () => {
    navigator.clipboard?.writeText(source).then(
      () => toast("Copied to clipboard", { tone: "success", description: file }),
      () => toast("Copy failed", { tone: "danger", description: "Select the code and copy it instead." })
    );
  };
  return h("figure", { class: ["code-window", cls] },
    h("figcaption", { class: "code-head" },
      Icon({ name: icon, size: 13 }),
      h("span", { class: "code-file" }, file),
      h("span", { class: "lucid-spacer" }),
      Tooltip({ label: "Copy code" }, Button({ variant: "ghost", size: "xs", icon: "copy", class: "code-copy", aria: { label: `Copy ${file}` }, onClick: copy }))),
    h("pre", { class: "code-body", tabindex: 0, aria: { label: `${file} source` } }, h("code", highlight(source, lang))),
    below.length ? h("div", { class: "code-preview" }, below) : null);
}
