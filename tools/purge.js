const pkg = JSON.parse(await (await import("node:fs/promises")).readFile(new URL("../package.json", import.meta.url), "utf8"));
const minor = pkg.version.split(".").slice(0, 2).join(".");

for (const file of ["package.json", "src/index.js", "bundle/lucid.js", "bundle/lucid.css", "llms.txt", "llms-full.txt"]) {
  const response = await fetch(`https://purge.jsdelivr.net/npm/${pkg.name}@${minor}/${file}`);
  console.log(`CDN refresh ${pkg.name}@${minor}/${file}: ${response.ok ? "done" : `failed (${response.status})`}`);
}
