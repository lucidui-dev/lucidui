import { mkdir, writeFile, cp } from "node:fs/promises";
import { bundle } from "./bundle.js";
import { llmsFull } from "./llms.js";

await mkdir("bundle", { recursive: true });
await writeFile("bundle/lucid.js", bundle());
await cp("src/ui/lucid.css", "bundle/lucid.css");
await writeFile("llms-full.txt", await llmsFull("."));
