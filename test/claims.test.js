import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { gzipSync } from "node:zlib";

const gz = files => gzipSync(files.map(f => readFileSync(new URL(f, import.meta.url), "utf8")).join("\n"), { level: 9 }).length;
const js = dir => readdirSync(new URL(dir, import.meta.url)).filter(name => name.endsWith(".js")).map(name => `${dir}${name}`);
const kb = bytes => `${(bytes / 1024).toFixed(1)} KB`;

test("the core size the site states is the size we measure", () => {
  const measured = kb(gz(js("../src/")));
  const home = readFileSync(new URL("../sites/www/home.js", import.meta.url), "utf8");
  const stated = /core: "([\d.]+ KB)"/.exec(home)[1];
  assert.equal(stated, measured, `the site says the core is ${stated}, but it measures ${measured}. Update FACTS in sites/www/home.js and the other pages that quote it.`);
  for (const page of ["sites/www/manifesto/manifesto.js", "sites/www/case/case.js", "sites/www/press/press.js"]) {
    const text = readFileSync(new URL(`../${page}`, import.meta.url), "utf8");
    for (const [, size] of text.matchAll(/"?(\d+\.\d)"?,? "?KB/g)) assert.equal(`${size} KB`, measured, `${page} quotes ${size} KB, but the core measures ${measured}`);
  }
});

test("the full size the site states is within a kilobyte of the bundle", () => {
  const measured = gz(["../bundle/lucid.js"]) + gz(["../bundle/lucid.css"]);
  const home = readFileSync(new URL("../sites/www/home.js", import.meta.url), "utf8");
  const stated = Number(/all: "(\d+) KB"/.exec(home)[1]);
  assert.ok(Math.abs(stated - measured / 1024) <= 1, `the site says everything is ${stated} KB, but the bundle measures ${kb(measured)}.`);
});
