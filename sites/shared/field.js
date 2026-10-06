import { h, onCleanup } from "/lucid/index.js";

export function DotField({ gap = 22, reach = 150 } = {}) {
  const canvas = h("canvas", { class: "dot-field", "aria-hidden": "true" });
  const ctx = canvas.getContext("2d");
  const still = matchMedia("(prefers-reduced-motion: reduce)");
  const pointer = { x: -9999, y: -9999, active: false, strength: 0 };
  let width = 0;
  let height = 0;
  let ink = "rgba(0,0,0,.2)";
  let accent = "rgb(42,120,214)";
  let frame = 0;
  let visible = true;
  let start = performance.now();

  const readColors = () => {
    const style = getComputedStyle(canvas);
    ink = style.color;
    accent = style.borderTopColor;
  };

  const resize = () => {
    const rect = canvas.getBoundingClientRect();
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    width = rect.width;
    height = rect.height;
    canvas.width = Math.round(width * ratio);
    canvas.height = Math.round(height * ratio);
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    draw(performance.now());
  };

  const draw = now => {
    ctx.clearRect(0, 0, width, height);
    const t = (now - start) / 1000;
    const offsetX = (width % gap) / 2;
    const offsetY = (height % gap) / 2;
    pointer.strength += ((pointer.active ? 1 : 0) - pointer.strength) * 0.08;
    for (let y = offsetY; y < height; y += gap) {
      for (let x = offsetX; x < width; x += gap) {
        const wave = still.matches ? 0 : Math.sin(x * 0.012 + y * 0.018 - t * 0.9) * 0.5 + 0.5;
        const dx = x - pointer.x;
        const dy = y - pointer.y;
        const near = Math.max(0, 1 - Math.sqrt(dx * dx + dy * dy) / reach) * pointer.strength;
        const lift = near * near;
        ctx.globalAlpha = 0.35 + wave * 0.25 + lift * 0.65;
        ctx.fillStyle = lift > 0.04 ? accent : ink;
        ctx.beginPath();
        ctx.arc(x, y, 1 + wave * 0.25 + lift * 1.9, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.globalAlpha = 1;
  };

  let last = 0;
  const loop = now => {
    if (pointer.strength > 0.02 || now - last > 32) {
      draw(now);
      last = now;
    }
    frame = visible && !document.hidden && (!still.matches || pointer.strength > 0.01) ? requestAnimationFrame(loop) : 0;
  };
  const wake = () => {
    if (!frame) frame = requestAnimationFrame(loop);
  };

  const move = event => {
    const rect = canvas.getBoundingClientRect();
    pointer.x = event.clientX - rect.left;
    pointer.y = event.clientY - rect.top;
    pointer.active = pointer.y >= 0 && pointer.y <= rect.height;
    wake();
  };
  const leave = () => {
    pointer.active = false;
    wake();
  };

  const sizeObserver = new ResizeObserver(resize);
  const viewObserver = new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    if (visible) wake();
  });
  const themeObserver = new MutationObserver(() => requestAnimationFrame(() => { readColors(); draw(performance.now()); }));
  const scheme = matchMedia("(prefers-color-scheme: dark)");
  const onScheme = () => requestAnimationFrame(() => { readColors(); draw(performance.now()); });

  requestAnimationFrame(() => {
    readColors();
    resize();
    sizeObserver.observe(canvas);
    viewObserver.observe(canvas);
    themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    scheme.addEventListener("change", onScheme);
    window.addEventListener("pointermove", move, { passive: true });
    document.documentElement.addEventListener("pointerleave", leave);
    document.addEventListener("visibilitychange", wake);
    wake();
  });

  onCleanup(() => {
    cancelAnimationFrame(frame);
    sizeObserver.disconnect();
    viewObserver.disconnect();
    themeObserver.disconnect();
    scheme.removeEventListener("change", onScheme);
    window.removeEventListener("pointermove", move);
    document.documentElement.removeEventListener("pointerleave", leave);
    document.removeEventListener("visibilitychange", wake);
  });

  return canvas;
}
