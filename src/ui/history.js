import { signal, computed } from "../reactive.js";

export function createHistory(source, { limit = 100 } = {}) {
  const past = signal([]);
  const future = signal([]);

  const change = (label, fn) => {
    const before = source.peek();
    const result = fn();
    if (source.peek() !== before) {
      past.value = [...past.peek(), { label, state: before }].slice(-limit);
      future.value = [];
    }
    return result;
  };

  const step = (from, to) => {
    const list = from.peek();
    if (!list.length) return null;
    const entry = list[list.length - 1];
    from.value = list.slice(0, -1);
    to.value = [...to.peek(), { label: entry.label, state: source.peek() }].slice(-limit);
    source.value = entry.state;
    return entry.label;
  };

  return {
    change,
    undo: () => step(past, future),
    redo: () => step(future, past),
    clear: () => {
      past.value = [];
      future.value = [];
    },
    canUndo: computed(() => past.value.length > 0),
    canRedo: computed(() => future.value.length > 0),
    nextUndo: computed(() => past.value.at(-1)?.label ?? null),
    nextRedo: computed(() => future.value.at(-1)?.label ?? null)
  };
}
