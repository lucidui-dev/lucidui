import { test } from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { get } from "node:http";

const status = (path, headers = {}) => new Promise((resolve, reject) => get({ host: "127.0.0.1", port: 7467, path, headers }, res => { res.resume(); resolve(res.statusCode); }).on("error", reject));

function startBridge(port = 7457) {
  const child = spawn(process.execPath, ["integrations/bridge/index.js"], { env: { ...process.env, LUCID_BRIDGE_PORT: String(port) }, stdio: ["pipe", "pipe", "pipe"] });
  let buffer = "";
  const waiting = new Map();
  child.stdout.on("data", chunk => {
    buffer += chunk;
    let end;
    while ((end = buffer.indexOf("\n")) >= 0) {
      const message = JSON.parse(buffer.slice(0, end));
      buffer = buffer.slice(end + 1);
      waiting.get(message.id)?.(message);
    }
  });
  let id = 0;
  const call = (method, params = {}) => new Promise(resolve => {
    const n = ++id;
    waiting.set(n, resolve);
    child.stdin.write(`${JSON.stringify({ jsonrpc: "2.0", id: n, method, params })}\n`);
  });
  const ready = new Promise(resolve => child.stderr.on("data", chunk => { if (String(chunk).includes("listening")) resolve(); }));
  return { child, call, ready };
}

test("the bridge speaks MCP, offers its tools and asks to pair before rendering", async () => {
  const { child, call, ready } = startBridge();
  await ready;
  try {
    const init = await call("initialize", { protocolVersion: "2025-06-18", capabilities: {}, clientInfo: { name: "test", version: "1" } });
    assert.equal(init.result.serverInfo.name, "lucid-bridge");
    const list = await call("tools/list");
    assert.deepEqual(list.result.tools.map(t => t.name), ["connect_builder", "render", "get_code", "status"]);
    const render = await call("tools/call", { name: "render", arguments: { code: "mount(App, '#app')" } });
    assert.equal(render.result.isError, true);
    assert.match(render.result.content[0].text, /#bridge=\d+\.[a-f0-9]+/);
    const missing = await call("nope");
    assert.equal(missing.error.code, -32601);
  } finally {
    child.kill();
  }
});

test("the bridge refuses requests without the pairing token or from other sites", async () => {
  const { child, ready } = startBridge(7467);
  await ready;
  try {
    assert.equal(await status("/events"), 401);
    assert.equal(await status("/events?token=x", { origin: "https://evil.example" }), 403);
  } finally {
    child.kill();
  }
});
