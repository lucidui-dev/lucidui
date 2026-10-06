const MARGIN = 8;

const origins = {
  "bottom-start": "top left", "bottom-end": "top right", "bottom-center": "top center",
  "top-start": "bottom left", "top-end": "bottom right", "top-center": "bottom center",
  "right-start": "top left", "right-end": "bottom left", "right-center": "center left",
  "left-start": "top right", "left-end": "bottom right", "left-center": "center right"
};

const clamp = (value, min, max) => Math.max(min, Math.min(value, max));

export function place(anchor, panel, { placement = "bottom-start", offset = 6, matchWidth = false } = {}) {
  if (!anchor || !panel.isConnected || !panel.matches(":popover-open")) return;
  const a = anchor.getBoundingClientRect();
  if (matchWidth) panel.style.minWidth = `${a.width}px`;
  const width = panel.offsetWidth;
  const height = panel.offsetHeight;
  const vw = document.documentElement.clientWidth;
  const vh = window.innerHeight;
  let [side, align = "center"] = placement.split("-");

  if (side === "bottom" && a.bottom + offset + height > vh - MARGIN && a.top - offset - height > MARGIN) side = "top";
  else if (side === "top" && a.top - offset - height < MARGIN && a.bottom + offset + height < vh - MARGIN) side = "bottom";
  else if (side === "right" && a.right + offset + width > vw - MARGIN) side = "left";
  else if (side === "left" && a.left - offset - width < MARGIN) side = "right";

  let top;
  let left;
  if (side === "bottom" || side === "top") {
    top = side === "bottom" ? a.bottom + offset : a.top - offset - height;
    left = align === "start" ? a.left : align === "end" ? a.right - width : a.left + a.width / 2 - width / 2;
  } else {
    left = side === "right" ? a.right + offset : a.left - offset - width;
    top = align === "start" ? a.top : align === "end" ? a.bottom - height : a.top + a.height / 2 - height / 2;
  }

  panel.style.left = `${clamp(left, MARGIN, vw - width - MARGIN)}px`;
  panel.style.top = `${clamp(top, MARGIN, vh - height - MARGIN)}px`;
  panel.style.setProperty("--lucid-origin", origins[`${side}-${align}`] ?? "top left");
}

export function follow(anchor, panel, options) {
  const update = () => place(anchor, panel, options);
  panel.addEventListener("beforetoggle", event => {
    if (event.newState !== "open") return;
    queueMicrotask(update);
    requestAnimationFrame(update);
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
  });
  panel.addEventListener("toggle", event => {
    if (event.newState === "open") {
      update();
      return;
    }
    window.removeEventListener("resize", update);
    window.removeEventListener("scroll", update, true);
  });
  return update;
}
