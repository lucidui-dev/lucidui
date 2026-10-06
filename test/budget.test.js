import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { gzipSync } from "node:zlib";

const BUDGET_BYTES = 7 * 1024;

test(`core stays under ${BUDGET_BYTES / 1024} KB gzipped, unminified`, () => {
  const dir = new URL("../src/", import.meta.url);
  const source = readdirSync(dir)
    .filter(name => name.endsWith(".js"))
    .map(name => readFileSync(new URL(name, dir), "utf8"))
    .join("\n");
  const size = gzipSync(source, { level: 9 }).length;
  assert.ok(size <= BUDGET_BYTES, `core is ${size} bytes gzipped, budget is ${BUDGET_BYTES}`);
});
