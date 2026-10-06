import { test } from "node:test";
import assert from "node:assert/strict";
import { signal, computed, effect, batch, untrack, root, onCleanup, isSignal } from "../src/index.js";
import { onDiagnostic } from "../src/diagnostics.js";

test("signal reads and writes", () => {
  const count = signal(1);
  assert.equal(count.value, 1);
  count.value = 2;
  assert.equal(count.value, 2);
  count.update(n => n + 1);
  assert.equal(count.peek(), 3);
  assert.ok(isSignal(count));
});

test("effect reruns when a dependency changes", () => {
  const count = signal(0);
  const seen = [];
  effect(() => seen.push(count.value));
  count.value = 1;
  count.value = 1;
  count.value = 2;
  assert.deepEqual(seen, [0, 1, 2]);
});

test("computed is lazy and cached", () => {
  const count = signal(2);
  let runs = 0;
  const double = computed(() => { runs++; return count.value * 2; });
  assert.equal(runs, 0);
  assert.equal(double.value, 4);
  assert.equal(double.value, 4);
  assert.equal(runs, 1);
  count.value = 5;
  assert.equal(double.value, 10);
  assert.equal(runs, 2);
});

test("effects skip when a computed value did not change", () => {
  const count = signal(1);
  const positive = computed(() => count.value > 0);
  let runs = 0;
  effect(() => { positive.value; runs++; });
  count.value = 2;
  count.value = 3;
  assert.equal(runs, 1);
  count.value = -1;
  assert.equal(runs, 2);
});

test("diamond dependencies update once with consistent values", () => {
  const a = signal(1);
  const b = computed(() => a.value + 1);
  const c = computed(() => a.value * 10);
  const seen = [];
  effect(() => seen.push(`${b.value}:${c.value}`));
  a.value = 2;
  assert.deepEqual(seen, ["2:10", "3:20"]);
});

test("batch defers effects until the end", () => {
  const first = signal("a");
  const last = signal("b");
  const seen = [];
  effect(() => seen.push(first.value + last.value));
  batch(() => {
    first.value = "x";
    last.value = "y";
  });
  assert.deepEqual(seen, ["ab", "xy"]);
});

test("untrack reads without subscribing", () => {
  const tracked = signal(0);
  const ignored = signal(0);
  let runs = 0;
  effect(() => { tracked.value; untrack(() => ignored.value); runs++; });
  ignored.value = 1;
  assert.equal(runs, 1);
  tracked.value = 1;
  assert.equal(runs, 2);
});

test("effect cleanup runs before each rerun and on dispose", () => {
  const count = signal(0);
  const log = [];
  const stop = effect(() => {
    const value = count.value;
    log.push(`run ${value}`);
    return () => log.push(`clean ${value}`);
  });
  count.value = 1;
  stop();
  count.value = 2;
  assert.deepEqual(log, ["run 0", "clean 0", "run 1", "clean 1"]);
});

test("nested effects are disposed when the parent reruns", () => {
  const outer = signal(0);
  const inner = signal(0);
  let innerRuns = 0;
  effect(() => {
    outer.value;
    effect(() => { inner.value; innerRuns++; });
  });
  outer.value = 1;
  outer.value = 2;
  innerRuns = 0;
  inner.value = 1;
  assert.equal(innerRuns, 1);
});

test("root disposes everything created inside it", () => {
  const count = signal(0);
  let runs = 0;
  let cleaned = false;
  const dispose = root(dispose => {
    effect(() => { count.value; runs++; });
    onCleanup(() => { cleaned = true; });
    return dispose;
  });
  dispose();
  count.value = 1;
  assert.equal(runs, 1);
  assert.equal(cleaned, true);
});

test("equals: false always notifies", () => {
  const list = signal([], { equals: false });
  let runs = 0;
  effect(() => { list.value; runs++; });
  list.value.push(1);
  list.value = list.peek();
  assert.equal(runs, 2);
});

test("an effect that feeds itself is stopped with a diagnostic", () => {
  const count = signal(0);
  const codes = [];
  const off = onDiagnostic(d => codes.push(d.code));
  assert.throws(() => {
    effect(() => { count.value = count.value + 1; });
    count.value = 100;
  }, error => error.code === "effect-cycle");
  off();
  assert.deepEqual(codes, ["effect-cycle"]);
});
