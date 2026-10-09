import { signal, computed, effect } from "/lucid/index.js";

const KEY = "lucid-builder:";
const read = (key, fallback = null) => { try { const v = localStorage.getItem(KEY + key); return v == null ? fallback : JSON.parse(v); } catch { return fallback; } };
const write = (key, value) => { try { localStorage.setItem(KEY + key, JSON.stringify(value)); return true; } catch { return false; } };
const drop = key => { try { localStorage.removeItem(KEY + key); } catch {} };

export const uid = () => `p${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
export const MAX_VERSIONS = 40;

export const projects = signal(read("projects", []));
effect(() => write("projects", projects.value));

export const loadProject = id => read(`project:${id}`);
export function saveProject(p) {
  const ok = write(`project:${p.id}`, p);
  const meta = { id: p.id, name: p.name, created: p.created, updated: p.updated, files: p.files.length, template: p.template, size: p.files.reduce((s, f) => s + f.text.length, 0) };
  projects.value = [meta, ...projects.peek().filter(x => x.id !== p.id)].sort((a, b) => b.updated - a.updated);
  return ok;
}
export function removeProject(id) {
  const p = loadProject(id);
  drop(`project:${id}`);
  projects.value = projects.peek().filter(x => x.id !== id);
  return p;
}

export function makeProject({ name, files, template = null }) {
  const now = Date.now();
  return { id: uid(), name, created: now, updated: now, template, active: files[0].name, files: files.map(f => ({ name: f.name, text: f.text })), versions: [] };
}

export function snapshot(p, label) {
  const last = p.versions[0];
  const same = last && JSON.stringify(last.files) === JSON.stringify(p.files);
  if (same) return p;
  const v = { id: uid(), at: Date.now(), label, files: p.files.map(f => ({ ...f })) };
  return { ...p, versions: [v, ...p.versions].slice(0, MAX_VERSIONS) };
}

export function migrate(templates) {
  if (read("migrated") || projects.peek().length) { write("migrated", true); return; }
  const made = [];
  for (const t of templates) {
    let draft = null;
    try { draft = localStorage.getItem(`${KEY}draft2:${t.value}`); } catch {}
    if (draft && draft !== t.code) made.push(makeProject({ name: `${t.label} draft`, files: [{ name: "app.js", text: draft }], template: t.value }));
  }
  for (const p of made) saveProject(p);
  write("migrated", true);
}

export const fileKind = name => (/\.css$/i.test(name) ? "css" : /\.(js|mjs)$/i.test(name) ? "js" : "text");
export const validName = (name, files, current) => {
  const n = name.trim();
  if (!n) return "Give the file a name";
  if (!/^[a-z0-9][a-z0-9._-]*\.(js|mjs|css)$/i.test(n)) return "Use letters, numbers, dashes and a .js or .css ending";
  if (files.some(f => f.name.toLowerCase() === n.toLowerCase() && f.name !== current)) return "A file with that name already exists";
  return null;
};

export function relink(text, origin) {
  return text
    .replace(/(from\s*["'])\.\/([^"']+)(["'])/g, (_, a, path, b) => `${a}${origin}/__project/${path}${b}`)
    .replace(/(import\s*\(\s*["'])\.\/([^"']+)(["'])/g, (_, a, path, b) => `${a}${origin}/__project/${path}${b}`)
    .replace(/(import\s*["'])\.\/([^"']+)(["'])/g, (_, a, path, b) => `${a}${origin}/__project/${path}${b}`);
}

const b64url = bytes => { let s = ""; for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000)); return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, ""); };
const unb64url = text => { const s = atob(text.replace(/-/g, "+").replace(/_/g, "/")); return Uint8Array.from(s, c => c.charCodeAt(0)); };
async function pipe(bytes, stream) { return new Uint8Array(await new Response(new Blob([bytes]).stream().pipeThrough(stream)).arrayBuffer()); }

export async function encodeShare(p) {
  const json = JSON.stringify({ v: 1, name: p.name, files: p.files });
  const packed = await pipe(new TextEncoder().encode(json), new CompressionStream("deflate-raw"));
  return b64url(packed);
}
export async function decodeShare(text) {
  const json = new TextDecoder().decode(await pipe(unb64url(text), new DecompressionStream("deflate-raw")));
  const data = JSON.parse(json);
  if (data?.v !== 1 || !Array.isArray(data.files) || !data.files.length) throw new Error("bad share");
  return { name: String(data.name || "Shared project").slice(0, 80), files: data.files.slice(0, 40).map(f => ({ name: String(f.name).slice(0, 60), text: String(f.text) })) };
}

const CRC = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
const crc32 = bytes => { let c = 0xffffffff; for (const b of bytes) c = CRC[(c ^ b) & 0xff] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };

export function zip(entries) {
  const enc = new TextEncoder();
  const parts = [], central = [];
  let offset = 0;
  const d = new Date();
  const time = (d.getHours() << 11) | (d.getMinutes() << 5) | (d.getSeconds() >> 1);
  const date = ((d.getFullYear() - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate();
  for (const { name, text } of entries) {
    const nameBytes = enc.encode(name), data = enc.encode(text), crc = crc32(data);
    const head = new DataView(new ArrayBuffer(30));
    head.setUint32(0, 0x04034b50, true); head.setUint16(4, 20, true); head.setUint16(6, 0x0800, true); head.setUint16(8, 0, true);
    head.setUint16(10, time, true); head.setUint16(12, date, true); head.setUint32(14, crc, true); head.setUint32(18, data.length, true); head.setUint32(22, data.length, true);
    head.setUint16(26, nameBytes.length, true); head.setUint16(28, 0, true);
    parts.push(new Uint8Array(head.buffer), nameBytes, data);
    const cd = new DataView(new ArrayBuffer(46));
    cd.setUint32(0, 0x02014b50, true); cd.setUint16(4, 20, true); cd.setUint16(6, 20, true); cd.setUint16(8, 0x0800, true); cd.setUint16(10, 0, true);
    cd.setUint16(12, time, true); cd.setUint16(14, date, true); cd.setUint32(16, crc, true); cd.setUint32(20, data.length, true); cd.setUint32(24, data.length, true);
    cd.setUint16(28, nameBytes.length, true); cd.setUint32(42, offset, true);
    central.push(new Uint8Array(cd.buffer), nameBytes);
    offset += 30 + nameBytes.length + data.length;
  }
  const size = central.reduce((s, b) => s + b.length, 0);
  const end = new DataView(new ArrayBuffer(22));
  end.setUint32(0, 0x06054b50, true); end.setUint16(8, entries.length, true); end.setUint16(10, entries.length, true); end.setUint32(12, size, true); end.setUint32(16, offset, true);
  return new Blob([...parts, ...central, new Uint8Array(end.buffer)], { type: "application/zip" });
}

export const since = ts => {
  const s = Math.round((Date.now() - ts) / 1000);
  if (s < 60) return "just now";
  const m = Math.round(s / 60); if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60); if (h < 24) return `${h} h ago`;
  const d = Math.round(h / 24); if (d < 7) return d === 1 ? "yesterday" : `${d} days ago`;
  return new Date(ts).toLocaleDateString(undefined, { day: "numeric", month: "short" });
};
