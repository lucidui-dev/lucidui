import { h } from "/lucid/index.js";

export const slugify = text => text.toLowerCase().replace(/`/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
export const plain = text => text.replace(/`([^`]+)`/g, "$1").replace(/\*\*([^*]+)\*\*/g, "$1").replace(/\[([^\]]+)\]\([^)]+\)/g, "$1");

const INLINE = /(`[^`]+`)|\[([^\]]+)\]\(([^)\s]+)\)|\*\*(.+?)\*\*|(https?:\/\/[^\s)<>]+[^\s)<>.,;:])/g;

export function inline(text, link) {
  const out = [];
  let last = 0;
  for (const m of text.matchAll(INLINE)) {
    if (m.index > last) out.push(text.slice(last, m.index));
    if (m[1]) out.push(h("code", { class: "dx-ic" }, m[1].slice(1, -1)));
    else if (m[2]) out.push(anchor(m[3], inline(m[2], link), link));
    else if (m[4]) out.push(h("strong", inline(m[4], link)));
    else if (m[5]) out.push(anchor(m[5], m[5], link));
    last = m.index + m[0].length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

function anchor(href, children, link) {
  const to = link(href);
  const external = /^https?:/.test(to);
  return h("a", { href: to, ...(external ? { target: "_blank", rel: "noopener" } : {}) }, children);
}

const isTable = (lines, i) => /^\s*\|/.test(lines[i]) && /^\s*\|[\s:|-]+\|\s*$/.test(lines[i + 1] ?? "");
const cells = line => line.trim().replace(/^\||\|$/g, "").split(/(?<!\\)\|/).map(c => c.trim().replace(/\\\|/g, "|"));
const LIST = /^(\s*)([-*]|\d+\.)\s+(.*)$/;

export function parse(md) {
  const lines = md.replace(/\r/g, "").split("\n");
  const blocks = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim()) { i++; continue; }
    const fence = /^```(\w*)\s*$/.exec(line);
    if (fence) {
      const body = [];
      i++;
      while (i < lines.length && !/^```\s*$/.test(lines[i])) body.push(lines[i++]);
      i++;
      blocks.push({ type: "code", lang: fence[1] || "text", text: body.join("\n") });
      continue;
    }
    const head = /^(#{1,4})\s+(.*)$/.exec(line);
    if (head) { blocks.push({ type: "heading", level: head[1].length, text: head[2].trim() }); i++; continue; }
    if (/^---+\s*$/.test(line)) { blocks.push({ type: "rule" }); i++; continue; }
    if (isTable(lines, i)) {
      const header = cells(lines[i]);
      i += 2;
      const rows = [];
      while (i < lines.length && /^\s*\|/.test(lines[i])) rows.push(cells(lines[i++]));
      blocks.push({ type: "table", header, rows });
      continue;
    }
    if (/^>\s?/.test(line)) {
      const body = [];
      while (i < lines.length && /^>\s?/.test(lines[i])) body.push(lines[i++].replace(/^>\s?/, ""));
      blocks.push({ type: "quote", text: body.join(" ") });
      continue;
    }
    if (LIST.test(line)) {
      const ordered = /\d/.test(LIST.exec(line)[2]);
      const items = [];
      while (i < lines.length) {
        const m = LIST.exec(lines[i]);
        if (m) { items.push(m[3]); i++; continue; }
        if (lines[i].trim() && /^\s{2,}/.test(lines[i]) && items.length) { items[items.length - 1] += ` ${lines[i].trim()}`; i++; continue; }
        break;
      }
      blocks.push({ type: "list", ordered, items });
      continue;
    }
    const body = [];
    while (i < lines.length && lines[i].trim() && !/^(#{1,4}\s|```|>\s?|---+\s*$)/.test(lines[i]) && !LIST.test(lines[i]) && !isTable(lines, i)) body.push(lines[i++].trim());
    blocks.push({ type: "para", text: body.join(" ") });
  }
  return blocks;
}
