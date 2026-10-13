import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { examplesDoc } from "./examples.js";

export const LLMS_DOCS = ["API", "UI", "VIZ", "EXAMPLES", "RECIPES", "DIAGNOSTICS", "WORDPRESS"];

export const pinVersion = (text, version) => text.replaceAll("@lucidui-dev/core@0.3/", `@lucidui-dev/core@${version}/`);

export async function llmsFull(root) {
  const { version } = JSON.parse(await readFile(join(root, "package.json"), "utf8"));
  const parts = [await readFile(join(root, "llms.txt"), "utf8")];
  for (const name of LLMS_DOCS) parts.push(await readFile(join(root, "docs", `${name}.md`), "utf8"));
  return pinVersion(parts.join("\n\n---\n\n"), version);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const root = join(import.meta.dirname, "..");
  await writeFile(join(root, "docs", "EXAMPLES.md"), await examplesDoc(root));
  await writeFile(join(root, "llms-full.txt"), await llmsFull(root));
}
