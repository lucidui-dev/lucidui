import { join } from "node:path";
import { pathToFileURL } from "node:url";

const MODULES = [["core", "@lucidui-dev/core", "src/index.js"], ["ui", "@lucidui-dev/core/ui", "src/ui/index.js"], ["viz", "@lucidui-dev/core/viz", "src/viz/index.js"]];

export async function examplesDoc(root) {
  const load = path => import(pathToFileURL(join(root, path)).href);
  const { SETS, COMPONENTS, sourceOf, usesName } = await load("sites/shared/catalog.js");
  const exports = await Promise.all(MODULES.map(async ([, from, path]) => [from, Object.keys(await load(path))]));
  const imports = text => exports
    .map(([from, names]) => [from, names.filter(name => usesName(text, name))])
    .filter(([, names]) => names.length)
    .map(([from, names]) => `import { ${names.sort().join(", ")} } from "${from}";`);
  const out = [
    "# Examples",
    "",
    `Every component and pattern in Lucid UI as a working snippet: ${COMPONENTS.length} examples in ${SETS.length} sets. This page is generated from the same catalog that runs lucidui.dev/components and Builder's Insert panel, so it always matches the library.`,
    "",
    "Each snippet ends in an expression, and any lines above it set up the state it uses. Put them in a component and return the expression, or pass it to `mount(() => ..., \"#app\")`. The import lines list exactly what it needs.",
    ""
  ];
  for (const set of SETS) {
    out.push(`## ${set.title}`, "", set.note, "");
    for (const entry of COMPONENTS.filter(e => e.set === set.id)) {
      const text = sourceOf(entry);
      out.push(`### ${entry.name}`, "", entry.summary, "", "```js", ...imports(text), "", text, "```", "");
    }
  }
  return out.join("\n");
}
