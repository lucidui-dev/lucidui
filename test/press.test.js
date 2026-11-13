import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { RELEASES, releaseText, releasePath } from "../sites/www/press/releases.js";
import { pressFiles } from "../tools/press.js";
import { pageCount } from "../tools/press-pdf.js";

const read = path => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("every release has its newswire parts and names Ezra by first name only", () => {
  assert.ok(RELEASES.length > 0);
  for (const r of RELEASES) {
    assert.match(r.slug, /^\d{4}-\d{2}-[a-z0-9-]+$/);
    assert.ok(r.slug.startsWith(r.date.slice(0, 7)), r.slug);
    for (const key of ["immediate", "place", "headline", "sub", "lead", "quote", "availability", "about", "contact"]) assert.ok(r[key], `${r.slug} needs ${key}`);
    assert.equal(r.body.length, 3);
    assert.equal(r.quoteBy, "Ezra, who designed and built Lucid UI");
    assert.ok(r.facts.length >= 6);
    const all = JSON.stringify(r);
    assert.doesNotMatch(all, /Ezra [A-Z]/, "first name only");
    assert.doesNotMatch(all, /colour/i, "user-facing text says color");
    assert.ok(r.lead.split(/\s+/).length <= 70, "the opening paragraph runs as-is in a newsletter");
  }
});

test("the release page, plain text and sitemap are generated from the release data", async () => {
  for (const [path, content] of Object.entries(await pressFiles("."))) assert.equal(read(path), content, `Run node tools/press.js to regenerate ${path}`);
});

test("each release page loads the release view and links its PDF and plain text", () => {
  for (const r of RELEASES) {
    const html = read(`sites/www/press/${r.slug}/index.html`);
    assert.match(html, /<script type="module" src="\/press\/release\.js">/);
    assert.ok(html.includes(`<link rel="canonical" href="https://lucidui.dev${releasePath(r)}">`));
    assert.ok(html.includes(`/media/press/${r.pdf}`));
    assert.ok(html.includes(`/press/${r.slug}.txt`));
    assert.ok(html.includes(r.headline));
  }
  const view = read("sites/www/press/release.js");
  assert.match(view, /\/media\/press\/\$\{r\.pdf\}/);
  assert.match(view, /\.txt`, target: "_blank", rel: "noopener"/);
  assert.match(read("sites/www/press/press.js"), /class: "pr-card"/);
});

test("the plain text version reads as a complete release", () => {
  for (const r of RELEASES) {
    const text = read(`sites/www/press/${r.slug}.txt`);
    assert.equal(text, releaseText(r));
    assert.match(text, /^FOR IMMEDIATE RELEASE\n/);
    assert.ok(text.includes(`${r.place}, `));
    assert.ok(text.includes(r.quoteBy));
    assert.match(text, /press@lucidui\.dev/);
    assert.match(text, /\n###\n$/);
  }
});

test("each release ships as a two-page PDF beside the press kit", () => {
  for (const r of RELEASES) {
    const file = new URL(`../media/press/${r.pdf}`, import.meta.url);
    assert.ok(existsSync(file), `Run node tools/press-pdf.js to render ${r.pdf}`);
    const pdf = readFileSync(file);
    assert.equal(pdf.subarray(0, 5).toString(), "%PDF-");
    assert.equal(pageCount(pdf), 2, r.pdf);
  }
});

test("search engines and agents can find every release", () => {
  const sitemap = read("sites/www/sitemap.xml");
  assert.match(read("sites/www/robots.txt"), /Sitemap: https:\/\/lucidui\.dev\/sitemap\.xml/);
  for (const r of RELEASES) {
    assert.ok(sitemap.includes(`<loc>https://lucidui.dev${releasePath(r)}</loc>`));
    assert.ok(read("llms.txt").includes(`https://lucidui.dev/press/${r.slug}.txt`));
  }
});
