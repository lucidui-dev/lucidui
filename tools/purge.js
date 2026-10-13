import { readFile, readdir } from "node:fs/promises";

const root = new URL("../", import.meta.url);
const pkg = JSON.parse(await readFile(new URL("package.json", root), "utf8"));
const minor = pkg.version.split(".").slice(0, 2).join(".");
const walk = async dir => (await readdir(new URL(dir, root), { recursive: true, withFileTypes: true })).filter(e => e.isFile()).map(e => `${e.parentPath.slice(new URL(".", root).pathname.length)}/${e.name}`.replace(/^\/+/, ""));
const files = ["package.json", "llms.txt", "llms-full.txt", ...(await walk("src")), ...(await walk("bundle"))].filter(f => !/\.DS_Store$/.test(f));

for (const file of files) {
  const response = await fetch(`https://purge.jsdelivr.net/npm/${pkg.name}@${minor}/${file}`);
  console.log(`CDN refresh ${pkg.name}@${minor}/${file}: ${response.ok ? "done" : `failed (${response.status})`}`);
}
