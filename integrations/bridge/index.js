#!/usr/bin/env node
import { createServer } from "node:http";
import { randomBytes } from "node:crypto";
import { createInterface } from "node:readline";
import { readFileSync } from "node:fs";

const { version } = JSON.parse(readFileSync(new URL("./package.json", import.meta.url), "utf8"));
const BUILDER = process.env.LUCID_BUILDER_URL ?? "https://build.lucidui.dev";
const ORIGINS = new Set([new URL(BUILDER).origin, "https://build.lucidui.dev", "http://localhost:8745", "http://127.0.0.1:8745"]);
const FIRST_PORT = Number(process.env.LUCID_BRIDGE_PORT ?? 7357);
const TOKEN = randomBytes(18).toString("hex");
const WAIT = 15000;

let port = 0;
let builder = null;
let nextId = 1;
const waiting = new Map();
const log = (...parts) => process.stderr.write(`[lucid-bridge] ${parts.join(" ")}\n`);

const link = () => `${BUILDER}/#bridge=${port}.${TOKEN}`;

function cors(req, res) {
  const origin = req.headers.origin;
  if (origin && ORIGINS.has(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Vary", "Origin");
    res.setHeader("Access-Control-Allow-Headers", "content-type");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Private-Network", "true");
  }
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on("data", chunk => {
      size += chunk.length;
      if (size > 2_000_000) { reject(new Error("Body too large")); req.destroy(); return; }
      chunks.push(chunk);
    });
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    req.on("error", reject);
  });
}

function send(type, payload = {}) {
  if (!builder) return false;
  builder.write(`event: ${type}\ndata: ${JSON.stringify(payload)}\n\n`);
  return true;
}

function ask(type, payload = {}) {
  const id = nextId++;
  return new Promise(resolve => {
    const timer = setTimeout(() => { waiting.delete(id); resolve(null); }, WAIT);
    waiting.set(id, value => { clearTimeout(timer); waiting.delete(id); resolve(value); });
    if (!send(type, { id, ...payload })) { clearTimeout(timer); waiting.delete(id); resolve(null); }
  });
}

const server = createServer(async (req, res) => {
  cors(req, res);
  const url = new URL(req.url, "http://127.0.0.1");
  if (req.method === "OPTIONS") { res.writeHead(204).end(); return; }
  if (req.headers.origin && !ORIGINS.has(req.headers.origin)) { res.writeHead(403).end(); return; }
  if (url.searchParams.get("token") !== TOKEN) { res.writeHead(401, { "content-type": "application/json" }).end(JSON.stringify({ error: "Pairing token does not match. Ask your agent for a new link." })); return; }

  if (req.method === "GET" && url.pathname === "/events") {
    if (builder) builder.end();
    res.writeHead(200, { "content-type": "text/event-stream", "cache-control": "no-store", connection: "keep-alive" });
    builder = res;
    send("hello", { name: "lucid-bridge", version });
    log("Builder connected");
    const beat = setInterval(() => res.write(": beat\n\n"), 15000);
    req.on("close", () => {
      clearInterval(beat);
      if (builder === res) { builder = null; log("Builder disconnected"); }
    });
    return;
  }

  if (req.method === "POST" && url.pathname === "/reply") {
    try {
      const data = JSON.parse(await readBody(req));
      waiting.get(data.id)?.(data);
      res.writeHead(204).end();
    } catch {
      res.writeHead(400).end();
    }
    return;
  }

  res.writeHead(404).end();
});

function listen(candidate, tries = 0) {
  return new Promise((resolve, reject) => {
    server.once("error", error => {
      if (error.code === "EADDRINUSE" && tries < 9) resolve(listen(candidate + 1, tries + 1));
      else reject(error);
    });
    server.listen(candidate, "127.0.0.1", () => { port = candidate; resolve(candidate); });
  });
}

function moduleFrom(code) {
  const text = String(code ?? "").trim();
  if (!text.startsWith("<")) return text;
  const scripts = [...text.matchAll(/<script[^>]*type=["']module["'][^>]*>([\s\S]*?)<\/script>/gi)].map(match => match[1].trim()).filter(Boolean);
  return scripts.length ? scripts.join("\n\n") : text;
}

const NOT_CONNECTED = () => `No Lucid Builder tab is paired yet. Ask the user to open this link in their browser, then try again:\n${link()}`;

function report(result) {
  if (!result) return { text: "The Builder did not answer in time. It may be busy or closed. Check the tab, or ask the user to reopen the pairing link.", error: true };
  const lines = [];
  const problems = result.logs.filter(entry => entry.level === "error" || entry.level === "warn");
  lines.push(result.status === "ok" ? `Rendered in Lucid Builder. Mounted in ${result.mountedMs} ms.` : result.status === "error" ? "The code ran in Lucid Builder but threw an error." : "The code was sent to Lucid Builder but did not finish mounting.");
  if (!problems.length) lines.push("No errors and no Lucid diagnostics.");
  for (const entry of problems) {
    const head = entry.code ? `${entry.level} ${entry.code}` : entry.level;
    lines.push(`- ${head}: ${entry.text}${entry.tag ? ` (on <${entry.tag}>)` : ""}${entry.fix ? `\n  Fix: ${entry.fix}` : ""}`);
  }
  const notes = result.logs.filter(entry => entry.level === "log" || entry.level === "info");
  if (notes.length) lines.push(`Console:\n${notes.slice(-10).map(entry => `  ${entry.text}`).join("\n")}`);
  if (problems.length) lines.push("Apply each fix, then call render again.");
  return { text: lines.join("\n"), error: result.status === "error" };
}

const TOOLS = [
  {
    name: "connect_builder",
    description: "Get the link that pairs this session with Lucid Builder (build.lucidui.dev) in the user's browser. Show the link to the user and ask them to open it. Call this first if render says no Builder is paired.",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
    run: async () => ({ text: builder ? `Lucid Builder is already paired. You can call render now.\nPairing link, if the user needs to reopen it: ${link()}` : `Ask the user to open this link in Chrome, Edge or Firefox. It pairs their Lucid Builder tab with you:\n${link()}\nThe browser may ask to allow access to apps on this device; they should allow it.` })
  },
  {
    name: "render",
    description: "Run a Lucid UI app in the user's paired Lucid Builder tab and get back the result: whether it mounted, runtime errors, console output, and Lucid diagnostics with their fixes. The code is one ES module that imports from \"@lucidui-dev/core\" (or \"@lucidui-dev/core/ui\", \"@lucidui-dev/core/viz\") and calls mount(App, \"#app\"). Read https://lucidui.dev/llms-full.txt before writing code. After each render, apply every fix you are given and render again until it is clean.",
    inputSchema: {
      type: "object",
      properties: {
        code: { type: "string", description: "The complete app as one ES module. A full HTML page also works; its inline module script is used." },
        summary: { type: "string", description: "Optional. A few words on what changed, shown to the user in the Builder." }
      },
      required: ["code"],
      additionalProperties: false
    },
    run: async ({ code, summary }) => {
      if (!builder) return { text: NOT_CONNECTED(), error: true };
      return report(await ask("render", { code: moduleFrom(code), summary: summary ? String(summary).slice(0, 140) : "" }));
    }
  },
  {
    name: "get_code",
    description: "Read the code currently in the user's Lucid Builder editor, including any edits they made by hand.",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
    run: async () => {
      if (!builder) return { text: NOT_CONNECTED(), error: true };
      const result = await ask("get-code");
      return result ? { text: result.code } : { text: "The Builder did not answer in time.", error: true };
    }
  },
  {
    name: "status",
    description: "Check whether a Lucid Builder tab is paired with this session.",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
    run: async () => ({ text: builder ? "Lucid Builder is paired and ready." : NOT_CONNECTED() })
  }
];

const reply = (id, result) => process.stdout.write(`${JSON.stringify({ jsonrpc: "2.0", id, result })}\n`);
const fail = (id, code, message) => process.stdout.write(`${JSON.stringify({ jsonrpc: "2.0", id, error: { code, message } })}\n`);

async function handle(message) {
  const { id, method, params } = message;
  if (method === "initialize") {
    reply(id, {
      protocolVersion: params?.protocolVersion ?? "2025-06-18",
      capabilities: { tools: {} },
      serverInfo: { name: "lucid-bridge", version },
      instructions: "Lucid UI bridge. Call connect_builder and show the user the link to pair their Lucid Builder tab. Then call render with your code; it returns errors and Lucid diagnostics with fixes. Repeat until render reports no problems."
    });
    return;
  }
  if (method === "ping") { reply(id, {}); return; }
  if (method === "tools/list") {
    reply(id, { tools: TOOLS.map(({ name, description, inputSchema }) => ({ name, description, inputSchema })) });
    return;
  }
  if (method === "tools/call") {
    const tool = TOOLS.find(t => t.name === params?.name);
    if (!tool) { fail(id, -32602, `Unknown tool: ${params?.name}`); return; }
    try {
      const { text, error } = await tool.run(params.arguments ?? {});
      reply(id, { content: [{ type: "text", text }], isError: Boolean(error) });
    } catch (error) {
      reply(id, { content: [{ type: "text", text: `Bridge error: ${error.message}` }], isError: true });
    }
    return;
  }
  if (id !== undefined) fail(id, -32601, `Method not found: ${method}`);
}

await listen(FIRST_PORT);
log(`v${version} listening on 127.0.0.1:${port}`);

if (process.stdin.isTTY) {
  process.stderr.write(`\nLucid UI bridge ${version}\n\nThis runs inside your coding agent as an MCP server. Add it once:\n\n  Claude Code   claude mcp add --scope user lucid -- npx -y @lucidui-dev/bridge\n  Others        { "mcpServers": { "lucid": { "command": "npx", "args": ["-y", "@lucidui-dev/bridge"] } } }\n\nTo pair a Builder tab with this process, open:\n  ${link()}\n\nPress Ctrl+C to stop.\n`);
} else {
  const lines = createInterface({ input: process.stdin });
  lines.on("line", line => {
    if (!line.trim()) return;
    let message;
    try { message = JSON.parse(line); } catch { fail(null, -32700, "Parse error"); return; }
    handle(message);
  });
  lines.on("close", () => process.exit(0));
}
