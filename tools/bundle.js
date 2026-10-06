import { readFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const ENTRIES = ["index.js", "ui/index.js", "viz/index.js"];

const IMPORT = /^import\s*\{([^}]*)\}\s*from\s*"(\.{1,2}\/[^"]+)";?\s*$/;
const REEXPORT = /^export\s*\{([^}]*)\}\s*from\s*"(\.{1,2}\/[^"]+)";?\s*$/;
const STAR = /^export\s*\*\s*from\s*"(\.{1,2}\/[^"]+)";?\s*$/;
const DECLARE = /^export\s+((?:async\s+)?function\*?|const|let|var|class)\s+([A-Za-z_$][\w$]*)/;

const names = list => list.split(",").map(part => part.trim()).filter(Boolean).map(part => {
  const [from, as] = part.split(/\s+as\s+/);
  return { from: from.trim(), as: (as ?? from).trim() };
});

export function bundle(srcDir = fileURLToPath(new URL("../src/", import.meta.url))) {
  const modules = new Map();
  const order = [];

  const load = (file, trail = []) => {
    if (modules.has(file)) return modules.get(file);
    if (trail.includes(file)) throw new Error(`Circular import: ${[...trail, file].map(f => relative(srcDir, f)).join(" → ")}`);
    const lines = readFileSync(file, "utf8").split("\n");
    const mod = { id: "", file, body: [], exported: [], stars: [] };
    for (const line of lines) {
      let match;
      if ((match = line.match(IMPORT))) {
        const dep = load(join(dirname(file), match[2]), [...trail, file]);
        mod.body.push(`const { ${names(match[1]).map(n => (n.from === n.as ? n.from : `${n.from}: ${n.as}`)).join(", ")} } = ${dep.id};`);
      } else if ((match = line.match(REEXPORT))) {
        const dep = load(join(dirname(file), match[2]), [...trail, file]);
        for (const n of names(match[1])) {
          mod.body.push(`const ${n.as} = ${dep.id}.${n.from};`);
          mod.exported.push(n.as);
        }
      } else if ((match = line.match(STAR))) {
        mod.stars.push(load(join(dirname(file), match[1]), [...trail, file]));
      } else if ((match = line.match(DECLARE))) {
        if (match[1] === "let" || match[1] === "var") throw new Error(`Mutable export ${match[2]} in ${relative(srcDir, file)} cannot be bundled`);
        mod.exported.push(match[2]);
        mod.body.push(line.replace(/^export\s+/, ""));
      } else if (/^\s*(import|export)\b/.test(line)) {
        throw new Error(`Unsupported module syntax in ${relative(srcDir, file)}: ${line.trim()}`);
      } else mod.body.push(line);
    }
    mod.id = `__lucid${order.length}`;
    modules.set(file, mod);
    order.push(mod);
    return mod;
  };

  const entries = ENTRIES.map(entry => load(join(srcDir, entry)));

  const exportsOf = mod => [...mod.stars.flatMap(exportsOf), ...mod.exported];

  const parts = order.map(mod => [
    `const ${mod.id} = (() => {`,
    mod.body.join("\n").trimEnd(),
    `return Object.freeze({ ${[...mod.stars.map(star => `...${star.id}`), ...mod.exported].join(", ")} });`,
    "})();"
  ].join("\n"));

  const seen = new Map();
  const lines = [];
  for (const entry of entries) {
    const list = exportsOf(entry).filter(name => {
      if (seen.has(name)) return false;
      seen.set(name, entry);
      return true;
    });
    lines.push(`const { ${list.join(", ")} } = ${entry.id};`);
  }

  return `${parts.join("\n\n")}\n\n${lines.join("\n")}\n\nexport { ${[...seen.keys()].join(", ")} };\n`;
}
