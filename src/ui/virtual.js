import { signal, computed, effect, untrack, read, getOwner, Scope, runIn } from "../reactive.js";
import { h, insert } from "../dom.js";

function locate(offsets, y) {
  let low = 0;
  let high = offsets.length - 2;
  while (low < high) {
    const mid = (low + high + 1) >> 1;
    if (offsets[mid] <= y) low = mid;
    else high = mid - 1;
  }
  return Math.max(0, low);
}

export function VirtualList({
  each, key = item => item, itemHeight = 40, overscan = 8,
  class: cls, style, role = "list", itemRole = "listitem", aria, ref
} = {}, render) {
  const owner = getOwner();
  const scrollTop = signal(0);
  const viewport = signal(0);
  const size = typeof itemHeight === "function" ? itemHeight : () => itemHeight;

  const layout = computed(() => {
    const items = read(each) ?? [];
    const offsets = new Array(items.length + 1);
    offsets[0] = 0;
    for (let i = 0; i < items.length; i++) offsets[i + 1] = offsets[i] + size(items[i], i);
    return { items, offsets };
  });

  const inner = h("div", { class: "lucid-virtual-inner", style: { height: () => `${layout.value.offsets.at(-1)}px` } });
  const root = h("div", { class: ["lucid-virtual", cls], style, role, aria }, inner);
  let rows = new Map();

  const create = (item, index) => {
    const scope = new Scope(owner);
    const position = signal(index);
    const node = h("div", { class: "lucid-virtual-row", role: itemRole });
    runIn(scope, () => insert(node, render(item, position)));
    inner.append(node);
    return { item, scope, node, position };
  };

  effect(() => {
    const { items, offsets } = layout.value;
    const top = scrollTop.value;
    const height = viewport.value || 900;
    untrack(() => {
      const first = items.length ? Math.max(0, locate(offsets, top) - overscan) : 0;
      const last = items.length ? Math.min(items.length, locate(offsets, top + height) + 1 + overscan) : 0;
      const next = new Map();
      for (let i = first; i < last; i++) {
        const item = items[i];
        const id = key(item, i);
        let row = rows.get(id);
        if (!row || row.item !== item) row = create(item, i);
        else row.position.value = i;
        row.node.dataset.index = String(i);
        row.node.style.transform = `translateY(${offsets[i]}px)`;
        row.node.style.height = `${offsets[i + 1] - offsets[i]}px`;
        row.node.setAttribute("aria-posinset", String(i + 1));
        row.node.setAttribute("aria-setsize", String(items.length));
        next.set(id, row);
      }
      for (const [id, row] of rows) {
        if (next.get(id) !== row) {
          row.scope.dispose();
          row.node.remove();
        }
      }
      rows = next;
    });
  });

  if (owner) owner.cleanups.push(() => { for (const row of rows.values()) row.scope.dispose(); });

  root.addEventListener("scroll", () => { scrollTop.value = root.scrollTop; }, { passive: true });
  if (typeof ResizeObserver !== "undefined") {
    const observer = new ResizeObserver(() => { viewport.value = root.clientHeight; });
    observer.observe(root);
    if (owner) owner.cleanups.push(() => observer.disconnect());
  }

  root.scrollToIndex = index => {
    const { offsets } = layout.peek();
    if (index < 0 || index >= offsets.length - 1) return;
    const top = offsets[index];
    const bottom = offsets[index + 1];
    if (top < root.scrollTop) root.scrollTop = top;
    else if (bottom > root.scrollTop + root.clientHeight) root.scrollTop = bottom - root.clientHeight;
    scrollTop.value = root.scrollTop;
  };

  const focusable = node => node?.querySelector("button, a[href], [tabindex]:not([tabindex='-1'])");

  root.addEventListener("keydown", event => {
    if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
    const row = event.target.closest?.(".lucid-virtual-row");
    if (!row) return;
    const step = event.key === "ArrowDown" ? 1 : -1;
    const total = layout.peek().items.length;
    for (let index = Number(row.dataset.index) + step; index >= 0 && index < total; index += step) {
      root.scrollToIndex(index);
      const target = focusable(inner.querySelector(`.lucid-virtual-row[data-index="${index}"]`));
      if (target) {
        event.preventDefault();
        target.focus({ preventScroll: true });
        return;
      }
    }
  });

  ref?.(root);
  return root;
}
