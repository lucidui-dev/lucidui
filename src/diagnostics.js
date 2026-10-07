const catalog = {
  "button-without-name": {
    level: "warn",
    message: "Button has no accessible name.",
    fix: "Give the button visible text, or pass aria: { label: \"...\" } for an icon-only button."
  },
  "img-without-alt": {
    level: "warn",
    message: "Image has no alt text.",
    fix: "Pass alt: \"what the image shows\", or alt: \"\" when it is purely decorative."
  },
  "click-on-static-element": {
    level: "warn",
    message: "A click handler is attached to an element keyboard users cannot reach.",
    fix: "Use a button element for actions, or an a element for navigation."
  },
  "native-select": {
    level: "warn",
    message: "A native select was used, so its option list is drawn by the browser.",
    fix: "Use Select({ value, options }) from Lucid UI's components. Its menu matches the rest of the app."
  },
  "native-picker": {
    level: "warn",
    message: "A native date, time or colour input was used, so its picker is drawn by the browser.",
    fix: "Use DatePicker for dates. For other values, use Select or Input."
  },
  "native-dialog": {
    level: "warn",
    message: "alert(), confirm() or prompt() was called, which opens a browser dialog.",
    fix: "Use toast(\"...\") for messages and await ask({ title, confirm }) for confirmations. Both are styled."
  },
  "unknown-icon": {
    level: "warn",
    message: "Icon was given a name it does not know, so a placeholder was drawn.",
    fix: "Use a name from iconNames, listed in the Icons section of docs/UI.md, such as home, settings, plus, x, check, search, user, bell, mail or trash."
  },
  "invalid-event-handler": {
    level: "error",
    message: "Event handler is not a function.",
    fix: "Pass a function, for example onClick: () => count.value++."
  },
  "invalid-child": {
    level: "warn",
    message: "A plain object was passed as a child and was not rendered.",
    fix: "Children must be nodes, text, numbers, arrays, signals or functions. Props go first, as the only plain object."
  },
  "duplicate-key": {
    level: "warn",
    message: "For received two items with the same key.",
    fix: "Make key return a value that is unique per item, such as an id."
  },
  "effect-cycle": {
    level: "error",
    message: "Effects kept triggering each other and were stopped after 1000 rounds.",
    fix: "An effect is writing to a signal it also reads. Read it with untrack(), or move the write into an event handler."
  },
  "mount-target-missing": {
    level: "error",
    message: "mount() could not find its target element.",
    fix: "Check the selector, and make sure the script runs after the element exists."
  },
  "cleanup-outside-scope": {
    level: "warn",
    message: "onCleanup() was called outside a component, effect or root, so it will never run.",
    fix: "Call onCleanup() inside an effect, a component rendered by mount(), or root()."
  }
};

const handlers = new Set();
let consoleOutput = true;

export class LucidError extends Error {
  constructor(diagnostic) {
    super(`[lucid] ${diagnostic.code}: ${diagnostic.message} ${diagnostic.fix}`);
    this.name = "LucidError";
    this.code = diagnostic.code;
    this.diagnostic = diagnostic;
  }
}

export function onDiagnostic(handler) {
  handlers.add(handler);
  return () => handlers.delete(handler);
}

export function configure({ console: useConsole } = {}) {
  if (useConsole !== undefined) consoleOutput = Boolean(useConsole);
}

export function report(code, context = {}, { quiet = false } = {}) {
  const entry = catalog[code];
  const diagnostic = {
    code,
    level: entry.level,
    message: entry.message,
    fix: entry.fix,
    docs: `https://docs.lucidui.dev/docs/DIAGNOSTICS.md#${code}`,
    ...context
  };
  for (const handler of handlers) handler(diagnostic);
  if (!quiet && consoleOutput && handlers.size === 0) {
    const method = entry.level === "error" ? "error" : "warn";
    console[method](`[lucid] ${code}: ${entry.message} ${entry.fix}`, context.element ?? "");
  }
  return diagnostic;
}

export function fail(code, context) {
  throw new LucidError(report(code, context, { quiet: true }));
}

export const codes = Object.keys(catalog);
