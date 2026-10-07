import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

export const LLMS_DOCS = ["API", "UI", "RECIPES", "VIZ", "DIAGNOSTICS"];

export async function llmsFull(root) {
  const parts = [await readFile(join(root, "llms.txt"), "utf8")];
  for (const name of LLMS_DOCS) parts.push(await readFile(join(root, "docs", `${name}.md`), "utf8"));
  return parts.join("\n\n---\n\n");
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const root = join(import.meta.dirname, "..");
  await writeFile(join(root, "llms-full.txt"), await llmsFull(root));
}
