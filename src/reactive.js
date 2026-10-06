import { report, LucidError } from "./diagnostics.js";

const CLEAN = 0;
const CHECK = 1;
const DIRTY = 2;
const MAX_ROUNDS = 1000;

let observer = null;
let owner = null;
let depth = 0;
let flushing = false;
const queue = new Set();

export class Scope {
  constructor(parent) {
    this.parent = parent;
    this.children = new Set();
    this.cleanups = [];
    this.disposed = false;
    if (parent) parent.children.add(this);
  }

  clear() {
    for (const child of [...this.children]) child.dispose();
    this.children.clear();
    for (const cleanup of this.cleanups.splice(0).reverse()) cleanup();
  }

  dispose() {
    if (this.disposed) return;
    this.clear();
    this.disposed = true;
    if (this.parent) this.parent.children.delete(this);
  }
}

class Effect extends Scope {
  constructor(fn, parent) {
    super(parent);
    this.fn = fn;
    this.sources = new Map();
  }

  stale() {
    queue.add(this);
  }

  refresh() {
    if (this.disposed) return;
    if (this.sources.size > 0 && !changed(this.sources)) return;
    this.run();
  }

  run() {
    if (this.disposed) return;
    this.clear();
    this.unsubscribe();
    const previousObserver = observer;
    const previousOwner = owner;
    observer = this;
    owner = this;
    try {
      const result = this.fn();
      if (typeof result === "function") this.cleanups.push(result);
    } finally {
      observer = previousObserver;
      owner = previousOwner;
    }
  }

  unsubscribe() {
    for (const source of this.sources.keys()) source.observers.delete(this);
    this.sources.clear();
  }

  dispose() {
    if (this.disposed) return;
    super.dispose();
    this.unsubscribe();
    queue.delete(this);
  }
}

class Signal {
  constructor(value, equals) {
    this.current = value;
    this.equals = equals;
    this.version = 0;
    this.observers = new Set();
  }

  get value() {
    track(this);
    return this.current;
  }

  set value(next) {
    if (this.equals(this.current, next)) return;
    this.current = next;
    this.version++;
    notify(this);
  }

  peek() {
    return this.current;
  }

  update(fn) {
    this.value = fn(this.current);
  }
}

class Computed {
  constructor(fn, equals) {
    this.fn = fn;
    this.equals = equals;
    this.current = undefined;
    this.version = 0;
    this.state = DIRTY;
    this.observers = new Set();
    this.sources = new Map();
  }

  get value() {
    this.update();
    track(this);
    return this.current;
  }

  peek() {
    this.update();
    return this.current;
  }

  stale() {
    if (this.state !== CLEAN) return;
    this.state = CHECK;
    for (const dependent of [...this.observers]) dependent.stale();
  }

  update() {
    if (this.state === CHECK) this.state = changed(this.sources) ? DIRTY : CLEAN;
    if (this.state !== DIRTY) return;
    this.unsubscribe();
    const previous = observer;
    observer = this;
    let next;
    try {
      next = this.fn();
    } finally {
      observer = previous;
    }
    this.state = CLEAN;
    if (this.version === 0 || !this.equals(this.current, next)) {
      this.current = next;
      this.version++;
    }
  }

  unsubscribe() {
    for (const source of this.sources.keys()) source.observers.delete(this);
    this.sources.clear();
  }

  dispose() {
    this.unsubscribe();
    this.state = DIRTY;
  }
}

function changed(sources) {
  for (const [source, version] of sources) {
    if (source instanceof Computed) source.update();
    if (source.version !== version) return true;
  }
  return false;
}

function track(source) {
  if (!observer) return;
  observer.sources.set(source, source.version);
  source.observers.add(observer);
}

function notify(source) {
  depth++;
  try {
    for (const dependent of [...source.observers]) dependent.stale();
  } finally {
    depth--;
  }
  if (depth === 0) flush();
}

function flush() {
  if (flushing) return;
  flushing = true;
  let rounds = 0;
  let firstError = null;
  try {
    while (queue.size > 0) {
      if (++rounds > MAX_ROUNDS) {
        queue.clear();
        firstError ??= new LucidError(report("effect-cycle", {}, { quiet: true }));
        break;
      }
      const pending = [...queue];
      queue.clear();
      for (const effect of pending) {
        try {
          effect.refresh();
        } catch (error) {
          firstError ??= error;
        }
      }
    }
  } finally {
    flushing = false;
  }
  if (firstError) throw firstError;
}

function equality(options) {
  if (options?.equals === false) return () => false;
  return options?.equals ?? Object.is;
}

export function signal(value, options) {
  return new Signal(value, equality(options));
}

export function computed(fn, options) {
  const node = new Computed(fn, equality(options));
  if (owner) owner.cleanups.push(() => node.dispose());
  return node;
}

export function effect(fn) {
  const node = new Effect(fn, owner);
  node.run();
  return () => node.dispose();
}

export function batch(fn) {
  depth++;
  try {
    return fn();
  } finally {
    depth--;
    if (depth === 0) flush();
  }
}

export function untrack(fn) {
  const previous = observer;
  observer = null;
  try {
    return fn();
  } finally {
    observer = previous;
  }
}

export function root(fn) {
  return runIn(new Scope(null), scope => fn(() => scope.dispose()));
}

export function onCleanup(fn) {
  if (owner) owner.cleanups.push(fn);
  else report("cleanup-outside-scope");
}

export function isSignal(value) {
  return value instanceof Signal || value instanceof Computed;
}

export function read(value) {
  if (isSignal(value)) return value.value;
  if (typeof value === "function") return value();
  return value;
}

export function getOwner() {
  return owner;
}

export function runIn(scope, fn) {
  const previousObserver = observer;
  const previousOwner = owner;
  observer = null;
  owner = scope;
  try {
    return fn(scope);
  } finally {
    observer = previousObserver;
    owner = previousOwner;
  }
}
