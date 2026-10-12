const PANEL = { fill: 0, edge: 1, glow: 0.24, reach: 110 };

const MATERIALS = [
  { match: '.lucid-btn[data-variant="primary"], .lucid-btn[data-variant="accent"]', fill: 0, edge: 2, press: 1, thicken: true },
  { match: '.lucid-btn[data-variant="ghost"]', fill: 0, press: 1, hoverEdge: 1 },
  { match: ".lucid-btn", fill: 0, edge: 1, press: 1, thicken: true },
  { match: ".lucid-switch-track", fill: 0.25, edge: 1, checked: { fill: 0.5 } },
  { match: ".lucid-check-box", fill: 0, edge: 1, checked: { fill: 1 } },
  { match: ".lucid-input", fill: 0, edge: 1 },
  { match: ".lucid-seg", fill: 0, edge: 1 },
  { match: ".lucid-seg-thumb", fill: 1 },
  { match: ".lucid-badge, .lucid-kbd", fill: 0, edge: 1 },
  { match: ".lucid-card, .lucid-section-body", ...PANEL },
  { match: ".lucid-pop, .lucid-dialog, .lucid-toast", ...PANEL, glow: 0.14, assemble: true },
  { match: '[data-lisa="panel"]', ...PANEL },
  { match: '[data-lisa="fill"]', fill: 1 },
  { match: '[data-lisa="tone"]', fill: 0.5 }
];

const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
const WATCHED = ["aria-current", "aria-checked", "aria-selected", "data-variant", "data-lisa", "class"];
const CELL = 2;

const hash = (x, y) => {
  const n = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
  return n - Math.floor(n);
};

const roundedBox = (px, py, hw, hh, r) => {
  const qx = Math.abs(px) - hw + r;
  const qy = Math.abs(py) - hh + r;
  return Math.min(Math.max(qx, qy), 0) + Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) - r;
};

const ease = t => 1 - Math.pow(1 - Math.min(1, Math.max(0, t)), 3);

export function lisa({ root = document.querySelector(".lucid-app") ?? document.body, materials = [] } = {}) {
  const all = [...materials, ...MATERIALS];
  const selector = all.map(m => m.match).join(", ");
  const still = matchMedia("(prefers-reduced-motion: reduce)");
  const states = new Map();
  let ink = "#000";
  let pointer = null;
  let raf = 0;
  let stopped = false;

  root.classList.add("lucid-lisa", "lucid-lisa-live");

  const probe = document.createElement("span");
  probe.setAttribute("aria-hidden", "true");
  probe.style.cssText = "position:absolute;width:0;height:0;overflow:hidden;pointer-events:none;color:var(--lucid-ink)";
  root.append(probe);
  const readInk = () => {
    ink = getComputedStyle(probe).color;
    for (const s of states.values()) s.dirty = true;
    wake();
  };

  const visibility = new IntersectionObserver(entries => {
    for (const entry of entries) {
      const s = states.get(entry.target);
      if (!s) continue;
      s.visible = entry.isIntersecting;
      s.dirty = true;
      if (!s.visible) { s.canvas.width = 0; s.canvas.height = 0; }
    }
    wake();
  }, { rootMargin: "120px" });

  const sizing = new ResizeObserver(entries => {
    for (const entry of entries) { const s = states.get(entry.target); if (s) s.dirty = true; }
    wake();
  });

  const materialFor = el => all.find(m => el.matches(m.match));

  const attach = el => {
    if (states.has(el) || el.tagName === "TEXTAREA" || el.tagName === "INPUT" || !el.isConnected) return;
    const material = materialFor(el);
    if (!material) return;
    const canvas = document.createElement("canvas");
    canvas.className = "lucid-lisa-canvas";
    canvas.setAttribute("aria-hidden", "true");
    el.setAttribute("data-lisa-live", "");
    el.prepend(canvas);
    states.set(el, { el, material, canvas, ctx: canvas.getContext("2d"), visible: false, dirty: true, openAt: performance.now(), wasOpen: false, pressAt: 0 });
    visibility.observe(el);
    sizing.observe(el);
  };

  const detach = s => {
    visibility.unobserve(s.el);
    sizing.unobserve(s.el);
    s.canvas.remove();
    s.el.removeAttribute("data-lisa-live");
    states.delete(s.el);
  };

  const refresh = el => {
    const s = states.get(el);
    if (!s) { if (el.matches(selector)) attach(el); return; }
    const material = materialFor(el);
    if (!material) detach(s);
    else if (material !== s.material) { s.material = material; s.dirty = true; }
  };

  const scan = node => {
    if (node.nodeType !== 1) return;
    if (node.matches(selector)) attach(node);
    for (const el of node.querySelectorAll(selector)) attach(el);
  };

  const mutations = new MutationObserver(records => {
    for (const record of records) {
      if (record.type === "attributes") refresh(record.target);
      else for (const node of record.addedNodes) scan(node);
    }
    wake();
  });

  const theme = new MutationObserver(readInk);

  const onMove = event => { pointer = { x: event.clientX, y: event.clientY }; wake(); };
  const onLeave = () => { pointer = null; wake(); };
  const onDown = event => {
    const s = states.get(event.target.closest?.("[data-lisa-live]"));
    if (s) { s.pressAt = performance.now(); s.dirty = true; wake(); }
  };
  const onUp = () => { for (const s of states.values()) if (s.pressAt) { s.pressAt = 0; s.dirty = true; } wake(); };

  function stateOf(el) {
    const label = el.closest(".lucid-check");
    const input = label?.querySelector("input");
    let open = true;
    try { open = el.matches("[open], :popover-open") || !el.matches("dialog, [popover]"); } catch { open = el.matches("[open]") || !el.matches("dialog, [popover]"); }
    return {
      checked: Boolean(input?.checked),
      disabled: el.matches(":disabled, [aria-disabled='true']") || Boolean(input?.disabled),
      hover: (label ?? el).matches(":hover"),
      open,
      loading: el.hasAttribute("data-loading")
    };
  }

  function draw(s, t, st, rect) {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const w = rect.width;
    const h = rect.height;
    if (Math.round(w * dpr) !== s.canvas.width || Math.round(h * dpr) !== s.canvas.height) {
      s.canvas.width = Math.round(w * dpr);
      s.canvas.height = Math.round(h * dpr);
    }
    const ctx = s.ctx;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    if (w < 2 || h < 2) return;
    const m = st.checked && s.material.checked ? { ...s.material, ...s.material.checked } : s.material;
    const radius = Math.min(parseFloat(getComputedStyle(s.el).borderTopLeftRadius) || 0, w / 2, h / 2);
    const moving = !still.matches;
    const fill = m.fill ?? 0;
    const rings = (m.edge ?? 0) + (st.hover ? (m.thicken ? 1 : m.hoverEdge ?? 0) : 0);
    const reach = m.reach ?? 100;
    const px = pointer && moving ? pointer.x - rect.left : -1e5;
    const py = pointer && moving ? pointer.y - rect.top : -1e5;
    const press = s.pressAt ? ease((t - s.pressAt) / 40) : 0;
    const appear = m.assemble && moving ? ease((t - s.openAt) / 420) : 1;
    const half = CELL / 2;
    const cx = w / 2;
    const cy = h / 2;
    ctx.fillStyle = ink;
    ctx.beginPath();
    for (let y = half; y < h; y += CELL) {
      for (let x = half; x < w; x += CELL) {
        const d = roundedBox(x - cx, y - cy, cx, cy, radius);
        if (d > 0) continue;
        if (appear < 1 && hash(x, y) > appear * 1.02) continue;
        const edge = Math.floor(-d / CELL) < rings;
        let v = edge ? 1 : fill;
        let near = 0;
        if (!edge && m.glow) {
          const dx = x - px;
          const dy = y - py;
          near = Math.exp(-(dx * dx + dy * dy) / (reach * reach));
          v += near * m.glow;
        }
        if (st.loading && !edge) v = 0.5 + 0.5 * Math.sin(x * 0.11 - t * 0.009);
        v = Math.max(v, press * (m.press ?? 0));
        if (st.disabled) v *= 0.5;
        const ix = Math.floor(x / CELL);
        const iy = Math.floor(y / CELL);
        const crawl = moving && near > 0.15 ? Math.floor(t / 140) : 0;
        if (v < (BAYER[((ix + crawl) & 3) + ((iy & 3) << 2)] + 0.5) / 16) continue;
        ctx.rect(x - half, y - half, CELL, CELL);
      }
    }
    ctx.fill();
  }

  function frame(t) {
    raf = 0;
    if (stopped) return;
    const moving = !still.matches;
    let busy = false;
    for (const s of states.values()) {
      if (!s.el.isConnected) { detach(s); continue; }
      if (!s.canvas.isConnected) s.el.prepend(s.canvas);
      if (!s.visible) continue;
      const st = stateOf(s.el);
      if (st.open && !s.wasOpen) { s.openAt = t; s.dirty = true; }
      s.wasOpen = st.open;
      const rect = s.el.getBoundingClientRect();
      const reach = (s.material.reach ?? 100) * 1.6;
      const near = Boolean(moving && s.material.glow && pointer && pointer.x > rect.left - reach && pointer.x < rect.right + reach && pointer.y > rect.top - reach && pointer.y < rect.bottom + reach);
      const key = `${st.checked}${st.disabled}${st.hover}${st.loading}`;
      if (key !== s.key) { s.key = key; s.dirty = true; }
      const animating = moving && (near || s.pressAt || st.loading || t - s.openAt < 460);
      if (s.dirty || animating || near !== s.near) {
        draw(s, t, st, rect);
        s.dirty = false;
      }
      s.near = near;
      if (animating) busy = true;
    }
    if (busy && !document.hidden) raf = requestAnimationFrame(frame);
  }

  function wake() {
    if (!raf && !stopped) raf = requestAnimationFrame(frame);
  }

  const onScheme = () => readInk();
  readInk();
  scan(root);
  mutations.observe(root, { childList: true, subtree: true, attributes: true, attributeFilter: WATCHED });
  theme.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme", "class"] });
  theme.observe(root, { attributes: true, attributeFilter: ["data-theme"] });
  matchMedia("(prefers-color-scheme: dark)").addEventListener("change", onScheme);
  still.addEventListener("change", wake);
  addEventListener("pointermove", onMove, { passive: true });
  addEventListener("pointerover", wake, { passive: true });
  document.addEventListener("pointerleave", onLeave);
  addEventListener("pointerdown", onDown, true);
  addEventListener("pointerup", onUp, true);
  addEventListener("pointercancel", onUp, true);
  document.addEventListener("visibilitychange", wake);
  wake();

  return function stop() {
    stopped = true;
    cancelAnimationFrame(raf);
    mutations.disconnect();
    theme.disconnect();
    visibility.disconnect();
    sizing.disconnect();
    matchMedia("(prefers-color-scheme: dark)").removeEventListener("change", onScheme);
    still.removeEventListener("change", wake);
    removeEventListener("pointermove", onMove);
    removeEventListener("pointerover", wake);
    document.removeEventListener("pointerleave", onLeave);
    removeEventListener("pointerdown", onDown, true);
    removeEventListener("pointerup", onUp, true);
    removeEventListener("pointercancel", onUp, true);
    document.removeEventListener("visibilitychange", wake);
    for (const s of [...states.values()]) detach(s);
    probe.remove();
    root.classList.remove("lucid-lisa-live");
  };
}
