import { execFileSync } from "node:child_process";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const chrome = process.env.CHROME || "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const { RELEASES, releaseDate, CODE } = await import(pathToFileURL(join(root, "sites/www/press/releases.js")).href);
const esc = s => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const code = s => esc(s).replace(CODE, m => `<code>${m}</code>`);
const logo = `data:image/svg+xml;base64,${(await readFile(join(root, "media/logo/lucidui-wordmark-on-dark.svg"))).toString("base64")}`;

export const pageCount = buffer => (buffer.toString("latin1").match(/\/Type\s*\/Page(?!s)/g) ?? []).length;

function html(r) {
  const date = releaseDate(r.date);
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>${esc(r.headline)}</title>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Geist:wght@400..700&family=Geist+Mono:wght@400..600&display=swap">
<style>
@page { size: Letter; margin: 0.62in 0 0.6in; }
@page :first { margin: 0 0 0.6in; }
* { box-sizing: border-box; }
html, body { margin: 0; }
body { font: 9.9pt/1.58 Geist, system-ui, sans-serif; color: #2f3640; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
.band { position: relative; padding: 0.6in 0.78in 0.52in; color: #f5f2ea; background: radial-gradient(90% 130% at 88% 10%, #2e2e2c 0%, #1c1c1b 44%, #111111 80%, #0a0a0a 100%); overflow: hidden; }
.band::before { content: ""; position: absolute; inset: 0; background-image: radial-gradient(circle at 1px 1px, rgba(255,255,255,.08) 1px, transparent 1.4px); background-size: 13px 13px; -webkit-mask-image: linear-gradient(100deg, transparent 35%, #000 80%); }
.band::after { content: ""; position: absolute; right: -1.4in; bottom: -2.2in; width: 5in; height: 5in; border-radius: 50%; background: radial-gradient(circle, rgba(232,214,168,.26), transparent 65%); }
.band > * { position: relative; z-index: 1; }
.top { display: flex; align-items: center; justify-content: space-between; }
.top img { height: 26px; display: block; }
.kicker { display: inline-flex; align-items: center; gap: 7px; padding: 5px 11px 5px 9px; border-radius: 99px; font: 500 7.2pt/1 "Geist Mono", monospace; letter-spacing: .08em; text-transform: uppercase; color: #e8d6a8; background: rgba(232,214,168,.1); box-shadow: inset 0 0 0 1px rgba(232,214,168,.35); }
.kicker i { width: 5px; height: 5px; border-radius: 50%; background: #e8d6a8; }
h1 { margin: 0.46in 0 0; max-width: 6.4in; font-size: 31pt; line-height: 1.02; font-weight: 600; letter-spacing: -0.04em; color: #fff; }
.sub { margin: 0.17in 0 0; max-width: 6.3in; font-size: 11.6pt; line-height: 1.52; color: rgba(245,242,234,.74); }
.meta { margin-top: 0.32in; display: flex; gap: 20px; font: 500 7.6pt/1 "Geist Mono", monospace; letter-spacing: .06em; text-transform: uppercase; color: rgba(245,242,234,.5); }
.meta b { color: #e8d6a8; font-weight: 500; }
.page { padding: 0.46in 0.78in 0; }
p { margin: 0 0 9.5pt; }
.lead { font-size: 11.4pt; line-height: 1.52; color: #111111; }
.lead b { font-weight: 650; }
code { padding: 1px 4px; border-radius: 4px; font: 500 .9em "Geist Mono", monospace; color: #111111; background: #f0efea; white-space: nowrap; }
h2 { margin: 15pt 0 6pt; font: 500 7.4pt/1 "Geist Mono", monospace; letter-spacing: .1em; text-transform: uppercase; color: #8a6d1f; break-after: avoid; }
.facts { margin: 6pt 0 15pt; padding: 13pt 16pt 5pt; border-radius: 12px; background: #f3f3f1; box-shadow: inset 0 0 0 1px #e4e3dd; break-inside: avoid; }
.facts h2 { margin: 0 0 9pt; }
.facts dl { margin: 0; display: grid; grid-template-columns: 1fr 1fr; column-gap: 22pt; }
.facts dl > div { padding: 5.5pt 0 6.5pt; border-top: 1px solid #e4e3dd; }
.facts dl > div:nth-child(-n+2) { border-top: 0; padding-top: 0; }
.facts dt { font-size: 7.4pt; color: #7a7f87; }
.facts dd { margin: 1pt 0 0; font-size: 8.9pt; line-height: 1.38; color: #111111; }
.quote { position: relative; margin: 14pt 0 13pt; padding: 30pt 24pt 15pt 26pt; border-radius: 12px; color: #fff; background: radial-gradient(120% 140% at 0% 0%, #2a2925 0%, #1a1a19 50%, #111111 100%); break-inside: avoid; }
.quote::before { content: "“"; position: absolute; left: 17pt; top: -1pt; font: 600 50pt/1 Geist, serif; color: #e8d6a8; opacity: .45; }
.quote p { margin: 0; font-size: 12.4pt; line-height: 1.47; font-weight: 500; letter-spacing: -0.01em; color: #fff; }
.quote span { display: flex; align-items: center; gap: 8px; margin-top: 9pt; font-size: 9pt; color: rgba(245,242,234,.72); }
.quote span::before { content: ""; width: 18px; height: 2px; border-radius: 2px; background: #e8d6a8; }
.about { margin-top: 11pt; padding-top: 1pt; border-top: 1px solid #e4e3dd; break-inside: avoid; }
.end { margin-top: 8pt; text-align: center; letter-spacing: .5em; font: 600 9pt "Geist Mono", monospace; color: #9aa0a8; }
</style></head><body>
<section class="band">
  <div class="top"><img src="${logo}" alt="Lucid UI"><span class="kicker"><i></i>${esc(r.kicker)}</span></div>
  <h1>${esc(r.headline)}</h1>
  <p class="sub">${esc(r.sub)}</p>
  <div class="meta"><span><b>${esc(r.immediate)}</b></span><span>${esc(r.place)}</span><span>${esc(date)}</span></div>
</section>
<section class="page">
  <p class="lead"><b>${esc(r.place)}, ${esc(date)}.</b> ${esc(r.lead)}</p>
  <div class="facts"><h2>${esc(r.factsTitle)}</h2><dl>${r.facts.map(([a, b]) => `<div><dt>${esc(a)}</dt><dd>${esc(b)}</dd></div>`).join("")}</dl></div>
  ${r.body.map(p => `<p>${code(p)}</p>`).join("\n  ")}
  <div class="quote"><p>${esc(r.quote)}</p><span>${esc(r.quoteBy)}</span></div>
  <h2>${esc(r.availabilityTitle)}</h2>
  <p>${code(r.availability)}</p>
  <div class="about">
    <h2>${esc(r.aboutTitle)}</h2>
    <p>${esc(r.about)}</p>
    <h2>${esc(r.contactTitle)}</h2>
    <p>${esc(r.contact)}</p>
    <div class="end">###</div>
  </div>
</section>
</body></html>`;
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const out = join(root, "media/press");
  await mkdir(out, { recursive: true });
  for (const r of RELEASES) {
    const tmp = join(out, `.render-${r.slug}.html`);
    await writeFile(tmp, html(r));
    const file = join(out, r.pdf);
    execFileSync(chrome, ["--headless=new", "--disable-gpu", "--no-pdf-header-footer", "--allow-file-access-from-files", "--virtual-time-budget=6000", `--print-to-pdf=${file}`, pathToFileURL(tmp).href], { stdio: "ignore" });
    await rm(tmp);
    const pages = pageCount(await readFile(file));
    console.log(`${r.pdf}: ${pages} pages`);
    if (pages !== 2) process.exitCode = 1;
  }
}
