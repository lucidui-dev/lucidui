import { test } from "node:test";
import assert from "node:assert/strict";
import { writeFileSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { gzipSync } from "node:zlib";
import { bundle } from "../tools/bundle.js";
import * as core from "../src/index.js";
import * as ui from "../src/ui/index.js";
import * as viz from "../src/viz/index.js";

const code = bundle();
const file = join(mkdtempSync(join(tmpdir(), "lucid-bundle-")), "lucid.js");
writeFileSync(file, code);
const single = await import(pathToFileURL(file).href);

test("single-file build exports everything the three entry points do", () => {
  const expected = new Set([...Object.keys(core), ...Object.keys(ui), ...Object.keys(viz)]);
  assert.deepEqual(new Set(Object.keys(single)), expected);
});

test("single-file build has no imports left and stays small", () => {
  assert.doesNotMatch(code, /^\s*import\b/m);
  assert.ok(gzipSync(code).length < 40000, `gzipped ${gzipSync(code).length} bytes`);
});

test("single-file build renders, reacts and reports diagnostics", () => {
  const { signal, h, mount, onDiagnostic } = single;
  const { Button } = single;
  const host = document.createElement("div");
  document.body.append(host);
  const count = signal(1);
  const seen = [];
  const stop = onDiagnostic(d => seen.push(d.code));
  const dispose = mount(() => [h("p", () => `n=${count.value}`), Button({ icon: "plus" })], host);
  assert.equal(host.querySelector("p").textContent, "n=1");
  count.value = 2;
  assert.equal(host.querySelector("p").textContent, "n=2");
  assert.ok(seen.includes("button-without-name"));
  stop();
  dispose();
  host.remove();
});
