import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { codes } from "../src/diagnostics.js";

const read = path => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("every diagnostic code is documented", () => {
  const doc = read("docs/DIAGNOSTICS.md");
  for (const code of codes) assert.ok(doc.includes(`## ${code}\n`), `docs/DIAGNOSTICS.md has no section for ${code}`);
});

test("the API reference stays small enough for an agent's context", () => {
  const approxTokens = Math.ceil(read("docs/API.md").length / 4);
  assert.ok(approxTokens <= 2500, `docs/API.md is about ${approxTokens} tokens, budget is 2500`);
});

test("llms-full.txt is current and names the right project", async () => {
  const { llmsFull } = await import("../tools/llms.js");
  const committed = read("llms-full.txt");
  assert.equal(committed, await llmsFull("."), "Run node tools/llms.js to regenerate llms-full.txt");
  assert.match(committed, /@lucidui-dev\/core/);
  assert.match(committed, /not AppNexus/i);
});

test("docs/EXAMPLES.md is generated from the current catalog", async () => {
  const { examplesDoc } = await import("../tools/examples.js");
  assert.equal(read("docs/EXAMPLES.md"), await examplesDoc("."), "Run node tools/llms.js to regenerate docs/EXAMPLES.md");
});

test("the catalog shows every component, and only ones that exist", async () => {
  const { COMPONENTS, sourceOf, usesName } = await import("../sites/shared/catalog.js");
  const modules = { ...(await import("../src/index.js")), ...(await import("../src/ui/index.js")), ...(await import("../src/viz/index.js")) };
  for (const entry of COMPONENTS) for (const name of entry.uses ?? []) assert.ok(name in modules, `${entry.id} lists ${name}, which Lucid UI doesn't export`);
  const shown = name => COMPONENTS.some(entry => usesName(sourceOf(entry), name));
  const components = Object.keys({ ...(await import("../src/ui/index.js")), ...(await import("../src/viz/index.js")) }).filter(name => /^[A-Z]/.test(name));
  for (const name of [...components, "toast", "ask", "hotkey", "form", "createHistory"]) assert.ok(shown(name), `${name} has no example in sites/shared/catalog.js`);
});
