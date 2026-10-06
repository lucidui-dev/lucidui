import { cp, rm, mkdir, readFile, writeFile, readdir } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { join } from "node:path";
import { bundle } from "./bundle.js";

const root = fileURLToPath(new URL("..", import.meta.url));
const pkg = JSON.parse(await readFile(join(root, "package.json"), "utf8"));
const dist = join(root, "dist");
const releases = join(root, "RELEASES");
const release = `lucidui-${pkg.version}`;
const skip = source => !source.endsWith(".DS_Store");

await rm(dist, { recursive: true, force: true });
await mkdir(releases, { recursive: true });

const stage = join(dist, "stage", release);
await mkdir(stage, { recursive: true });
for (const item of ["src", "docs", "README.md", "LICENSE", "llms.txt", "package.json"]) {
  await cp(join(root, item), join(stage, item), { recursive: true, filter: skip });
}
const single = bundle();
await mkdir(join(stage, "bundle"), { recursive: true });
await writeFile(join(stage, "bundle", "lucid.js"), single);
await cp(join(root, "src/ui/lucid.css"), join(stage, "bundle", "lucid.css"));
await mkdir(join(dist, "download"), { recursive: true });
execFileSync("zip", ["-qrX", join(dist, "download", `${release}.zip`), release], { cwd: join(dist, "stage") });
await rm(join(dist, "stage"), { recursive: true, force: true });

const plugin = join(dist, "stage", "lucid-ui");
await cp(join(root, "integrations/wordpress/lucid-ui"), plugin, { recursive: true, filter: skip });
await writeFile(join(plugin, "assets", "lucid.js"), single);
await cp(join(root, "src/ui/lucid.css"), join(plugin, "assets", "lucid.css"));
await cp(join(root, "LICENSE"), join(plugin, "LICENSE.txt"));
execFileSync("zip", ["-qrX", join(dist, "download", `lucid-ui-wordpress-${pkg.version}.zip`), "lucid-ui"], { cwd: join(dist, "stage") });
await rm(join(dist, "stage"), { recursive: true, force: true });


const kit = join(dist, "stage", "lucidui-press-kit");
await mkdir(kit, { recursive: true });
await cp(join(root, "brand/marks/press"), kit, { recursive: true, filter: skip });
await cp(join(root, "brand/marks/lucid-mark.svg"), join(kit, "favicon.svg"));
await writeFile(join(kit, "colours.txt"), [
  "Lucid UI colours",
  "",
  "Plum        #570D38   RGB 87 13 56",
  "Deep plum   #370723   RGB 55 7 35",
  "Tangerine   #FFB448   RGB 255 180 72",
  "Navy ink    #0A2540   RGB 10 37 64",
  "Slate       #425466   RGB 66 84 102",
  "Paper       #F3F3F1   RGB 243 243 241",
  "",
  "More at https://lucidui.dev/press/ and press@lucidui.dev",
  ""
].join("\n"));
await mkdir(join(dist, "press-kit"), { recursive: true });
execFileSync("zip", ["-qrX", join(dist, "press-kit", "lucidui-press-kit.zip"), "lucidui-press-kit"], { cwd: join(dist, "stage") });
await rm(join(dist, "stage"), { recursive: true, force: true });

const STAMP = `${pkg.version}-${Date.now().toString(36)}`;
const LOCAL = String.raw`(?:\.{1,2}\/|\/(?!\/))[^"'$?\s]+?`;
const JS_REF = new RegExp(String.raw`(\bfrom\s*|\bimport\s*\(\s*|\bimport\s+)(["'])(${LOCAL}\.js)\2`, "g");
const HTML_REF = new RegExp(String.raw`((?:href|src)=")(${LOCAL}\.(?:css|js))"`, "g");

async function stamp(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) await stamp(path);
    else if (entry.name.endsWith(".js")) {
      const text = await readFile(path, "utf8");
      const next = text.replace(JS_REF, (_, lead, quote, ref) => `${lead}${quote}${ref}?v=${STAMP}${quote}`);
      if (next !== text) await writeFile(path, next);
    } else if (entry.name.endsWith(".html")) {
      const text = await readFile(path, "utf8");
      const next = text.replace(HTML_REF, (_, lead, ref) => `${lead}${ref}?v=${STAMP}"`);
      if (next !== text) await writeFile(path, next);
    }
  }
}

async function site(name, from, { shared = true, extras = [], files = {} } = {}) {
  const out = join(dist, name);
  await cp(join(root, from), out, { recursive: true, filter: skip });
  await cp(join(root, "src"), join(out, "lucid"), { recursive: true, filter: skip });
  await cp(join(root, "brand"), join(out, "brand"), { recursive: true, filter: skip });
  if (shared) await cp(join(root, "sites/shared"), join(out, "shared"), { recursive: true, filter: skip });
  for (const [source, target] of extras) await cp(join(root, source), join(out, target), { recursive: true, filter: skip });
  for (const [target, content] of Object.entries(files)) await writeFile(join(out, target), content);
  await stamp(out);
  const archive = join(releases, `${name}-${pkg.version}.zip`);
  await rm(archive, { force: true });
  const entries = await readdir(out);
  execFileSync("zip", ["-qrX", archive, ...entries], { cwd: out });
  return archive;
}

const built = [
  await site("lucidui.dev", "sites/www", {
    extras: [["dist/press-kit", "press-kit"], ["LICENSE", "LICENSE.txt"], ["llms.txt", "llms.txt"]]
  }),
  await site("sandbox.lucidui.dev", "examples/tracker", { shared: false, extras: [["examples/transit", "transit"], ["examples/campaign", "campaign"], ["examples/checkin", "checkin"], ["examples/fitness", "fitness"], ["examples/beats", "beats"], ["examples/maison", "maison"], ["examples/clinic", "clinic"]] }),
  await site("docs.lucidui.dev", "sites/docs", {
    extras: /GUIDES_OPEN = true/.test(await readFile(join(root, "sites/docs/docs.js"), "utf8")) ? [["docs", "docs"], ["llms.txt", "llms.txt"]] : []
  }),
  await site("changelog.lucidui.dev", "sites/changelog"),
  await site("build.lucidui.dev", "sites/build")
];

await writeFile(join(dist, "VERSION"), `${pkg.version}\n`);
console.log(`Built ${release}`);
for (const archive of built) console.log(`  ${archive.replace(root, "")}`);
