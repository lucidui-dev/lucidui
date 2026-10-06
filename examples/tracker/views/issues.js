import { signal, computed, untrack, h, For, Show } from "/lucid/index.js";
import { Button, Input, Select, Segmented, Tooltip, EmptyState } from "/lucid/ui/index.js";
import { undoable } from "./issue.js";
import { STATUSES } from "../data.js";
import {
  visible, view, filters, query, filtersActive, clearFilters, selectedId, composing, childrenOf,
  byPriority, byRank, update, statuses, NOW, DAY
} from "../store.js";
import {
  StatusIcon, PriorityIcon, PersonAvatar, LabelBadge, DueDate,
  statusOptions, priorityOptions, assigneeFilterOptions, labelOptions
} from "../parts.js";

const open = id => { selectedId.value = id; };

export function Toolbar() {
  const chip = (name, label, icon, options, extra = {}) => Select({
    value: filters[name],
    options,
    multiple: true,
    size: "sm",
    variant: "ghost",
    icon,
    searchable: Array.isArray(options) ? options.length > 6 : true,
    searchPlaceholder: `Filter by ${label.toLowerCase()}`,
    aria: { label: `Filter by ${label.toLowerCase()}` },
    display: chosen => chosen.length
      ? [h("span", label), h("span", { style: { color: "var(--lucid-ink)" } }, chosen.length === 1 ? chosen[0].label : `${chosen.length}`)]
      : h("span", label),
    ...extra
  });
  return h("div", { class: "tk-toolbar" },
    chip("status", "Status", "target", statusOptions),
    chip("priority", "Priority", "zap", priorityOptions),
    chip("assignee", "Assignee", "user", assigneeFilterOptions, { width: "240px" }),
    chip("label", "Label", "tag", labelOptions),
    Show({ when: filtersActive }, () => Button({ variant: "ghost", size: "sm", icon: "x", onClick: clearFilters }, "Clear")),
    h("div", { class: "lucid-spacer tk-hide-sm" }),
    Input({ icon: "search", size: "sm", bind: query, placeholder: "Search issues", aria: { label: "Search issues" }, kbd: "/" }));
}

export function ViewSwitch() {
  return Segmented({
    value: view,
    size: "sm",
    iconOnly: true,
    aria: { label: "Layout" },
    options: [{ value: "list", label: "List", icon: "list" }, { value: "board", label: "Board", icon: "board" }]
  });
}

export function SubProgress(issue) {
  return () => {
    const kids = childrenOf.value.get(issue.id) ?? [];
    if (!kids.length) return null;
    const done = kids.filter(kid => kid.status === "done").length;
    return h("span", { class: "tk-sub", title: `${done} of ${kids.length} sub-issues done` },
      h("span", { class: "tk-sub-dots", "aria-hidden": "true" },
        kids.slice(0, 6).map((_, i) => h("i", { "data-on": i < done ? "" : undefined }))),
      `${done}/${kids.length}`);
  };
}

function Row(entry) {
  const { issue, kind, last } = entry;
  return h("button", {
    type: "button",
    class: ["tk-row", kind === "child" ? "tk-row-child" : null, kind === "parent" ? "tk-row-parent" : null],
    "data-last": kind === "child" && last ? "" : undefined,
    "data-id": issue.id,
    "data-selected": () => selectedId.value === issue.id,
    onClick: () => open(issue.id),
    onKeydown: event => {
      if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
      event.preventDefault();
      const rows = [...document.querySelectorAll(".tk-row")];
      const next = rows[rows.indexOf(event.currentTarget) + (event.key === "ArrowDown" ? 1 : -1)];
      next?.focus();
    }
  },
  PriorityIcon(issue.priority),
  h("span", { class: "tk-id" }, issue.id),
  StatusIcon(issue.status),
  h("span", { class: "tk-row-main" },
    h("span", { class: "tk-row-title" }, issue.title),
    kind === "parent" ? SubProgress(issue) : null),
  h("span", { class: "tk-labels" }, issue.labels.map(LabelBadge)),
  DueDate(issue.dueAt),
  PersonAvatar(issue.assignee, 22));
}

const collapsed = signal(new Set(["done", "canceled"]));

export function ListView() {
  const cache = new Map();
  const entry = (issue, kind, last, signature) => {
    const previous = cache.get(issue.id);
    if (previous && previous.issue === issue && previous.signature === signature) return previous;
    const next = { issue, kind, last, signature };
    cache.set(issue.id, next);
    return next;
  };
  const groups = computed(() => {
    const shown = visible.value;
    const ids = new Set(shown.map(issue => issue.id));
    const kidsOf = new Map();
    for (const issue of shown) {
      if (!issue.parent || !ids.has(issue.parent)) continue;
      if (!kidsOf.has(issue.parent)) kidsOf.set(issue.parent, []);
      kidsOf.get(issue.parent).push(issue);
    }
    const all = childrenOf.value;
    const map = new Map(STATUSES.map(status => [status.id, []]));
    const tops = shown.filter(issue => !issue.parent || !ids.has(issue.parent)).sort(byPriority);
    for (const issue of tops) {
      const list = map.get(issue.status);
      const kids = (kidsOf.get(issue.id) ?? []).sort(byPriority);
      const total = all.get(issue.id) ?? [];
      const done = total.filter(kid => kid.status === "done").length;
      list.push(entry(issue, kids.length || total.length ? "parent" : "single", false, `p${done}/${total.length}`));
      kids.forEach((kid, i) => list.push(entry(kid, "child", i === kids.length - 1, `c${i === kids.length - 1}`)));
    }
    return map;
  });
  const order = ["in_progress", "in_review", "todo", "backlog", "done", "canceled"];
  return h("div", { class: "tk-list" },
    order.map(id => {
      const status = statuses.get(id);
      const items = computed(() => groups.value.get(id));
      const expanded = computed(() => !collapsed.value.has(id));
      const toggle = () => {
        const next = new Set(collapsed.peek());
        if (next.has(id)) next.delete(id);
        else next.add(id);
        collapsed.value = next;
      };
      return Show({ when: () => items.value.length > 0 }, () => h("section", { "aria-label": status.label },
        h("div", { class: "tk-group-head" },
          h("button", { type: "button", class: "tk-group-toggle", "aria-expanded": expanded, onClick: toggle },
            h("svg", { class: "lucid-icon", width: 12, height: 12, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", "stroke-width": 2.5, "stroke-linecap": "round", "stroke-linejoin": "round", "aria-hidden": "true" }, h("path", { d: "m6 9 6 6 6-6" })),
            StatusIcon(id),
            status.label,
            h("span", { class: "tk-group-count" }, () => items.value.length)),
          h("div", { class: "lucid-spacer" }),
          Tooltip({ label: `New issue in ${status.label}` },
            Button({ variant: "ghost", size: "xs", icon: "plus", aria: { label: `New issue in ${status.label}` }, onClick: () => { composing.value = { status: id }; } }))),
        Show({ when: expanded }, () => For({ each: items, key: item => item.issue.id }, Row))));
    }),
    Show({ when: () => visible.value.length === 0 }, () => EmptyState({
      icon: "search",
      title: "No issues match",
      description: "Try a different search, or clear the filters to see everything in this view.",
      action: Button({ size: "sm", onClick: clearFilters }, "Clear filters")
    })));
}

function Card(issue) {
  return h("button", { type: "button", class: "tk-card", "data-id": issue.id },
    h("div", { class: "tk-card-top" },
      h("span", { class: "tk-id" }, issue.id),
      issue.parent ? h("span", { class: "tk-card-parent", title: `Sub-issue of ${issue.parent}` }, h("svg", { width: 10, height: 10, viewBox: "0 0 10 10", fill: "none", stroke: "currentColor", "stroke-width": 1.4, "stroke-linecap": "round", "aria-hidden": "true" }, h("path", { d: "M2 1v4.5a2 2 0 0 0 2 2h4" })), issue.parent) : null,
      h("span", { class: "lucid-spacer" }),
      PersonAvatar(issue.assignee, 20)),
    h("div", { class: "tk-card-title" }, issue.title),
    h("div", { class: "tk-card-meta" },
      PriorityIcon(issue.priority),
      issue.labels.map(LabelBadge),
      DueDate(issue.dueAt),
      SubProgress(issue)));
}

const BOARD = ["backlog", "todo", "in_progress", "in_review", "done"];

export function BoardView() {
  const columns = computed(() => {
    const map = new Map(BOARD.map(id => [id, []]));
    for (const issue of visible.value) {
      if (!map.has(issue.status)) continue;
      if (issue.status === "done" && issue.completedAt < NOW - 14 * DAY) continue;
      map.get(issue.status).push(issue);
    }
    for (const list of map.values()) list.sort(byRank);
    return map;
  });

  let board;
  const drag = { issue: null, card: null, ghost: null, column: null, index: 0, dx: 0, dy: 0, x: 0, y: 0, moved: false };

  const cardsIn = column => [...column.querySelectorAll(".tk-card")].filter(card => card !== drag.card);

  const target = (x, y) => {
    const column = document.elementFromPoint(x, y)?.closest(".tk-col");
    for (const col of board.querySelectorAll(".tk-col")) if (col !== column) col.removeAttribute("data-drop");
    drag.column = column;
    if (!column) return;
    column.setAttribute("data-drop", "");
    const cards = cardsIn(column);
    let index = cards.findIndex(card => {
      const rect = card.getBoundingClientRect();
      return y < rect.top + rect.height / 2;
    });
    if (index < 0) index = cards.length;
    drag.index = index;
    const body = column.querySelector(".tk-col-body");
    const line = column.querySelector(".tk-drop-line");
    const bodyRect = body.getBoundingClientRect();
    const ref = cards[index];
    const prev = cards[index - 1];
    const at = ref ? ref.getBoundingClientRect().top - 4 : prev ? prev.getBoundingClientRect().bottom + 2 : bodyRect.top + 4;
    line.style.top = `${at - bodyRect.top + body.scrollTop + body.offsetTop - 1}px`;
  };

  const finish = commit => {
    board.closest(".tk")?.classList.remove("is-dragging");
    drag.ghost?.remove();
    drag.card?.removeAttribute("data-dragging");
    for (const col of board.querySelectorAll(".tk-col")) col.removeAttribute("data-drop");
    if (commit && drag.column && drag.issue) {
      const status = drag.column.dataset.status;
      const list = columns.peek().get(status).filter(issue => issue.id !== drag.issue.id);
      const before = list[drag.index - 1]?.rank;
      const after = list[drag.index]?.rank;
      const rank = before == null && after == null ? 0 : before == null ? after - 1 : after == null ? before + 1 : (before + after) / 2;
      const moved = status !== drag.issue.status;
      update(drag.issue.id, { status, rank }, moved ? `Move ${drag.issue.id} to ${statuses.get(status).label}` : `Reorder ${drag.issue.id}`);
      if (moved) undoable(`${drag.issue.id} moved to ${statuses.get(status).label}`, { description: drag.issue.title });
    }
    drag.issue = drag.card = drag.ghost = drag.column = null;
  };

  const onPointerdown = event => {
    const card = event.target.closest(".tk-card");
    if (!card || event.button !== 0) return;
    const rect = card.getBoundingClientRect();
    Object.assign(drag, { card, issue: null, moved: false, x: event.clientX, y: event.clientY, dx: event.clientX - rect.left, dy: event.clientY - rect.top });
    try { card.setPointerCapture(event.pointerId); } catch {}
  };

  const onPointermove = event => {
    if (!drag.card) return;
    if (!drag.moved) {
      if (Math.hypot(event.clientX - drag.x, event.clientY - drag.y) < 5) return;
      drag.moved = true;
      drag.issue = visible.peek().find(issue => issue.id === drag.card.dataset.id);
      const ghost = drag.card.cloneNode(true);
      ghost.classList.add("tk-ghost");
      ghost.style.width = `${drag.card.offsetWidth}px`;
      ghost.setAttribute("aria-hidden", "true");
      board.closest(".tk").append(ghost);
      drag.ghost = ghost;
      drag.card.setAttribute("data-dragging", "");
      board.closest(".tk").classList.add("is-dragging");
    }
    drag.ghost.style.left = `${event.clientX - drag.dx}px`;
    drag.ghost.style.top = `${event.clientY - drag.dy}px`;
    target(event.clientX, event.clientY);
  };

  const onPointerup = () => {
    if (!drag.card) return;
    if (drag.moved) finish(true);
    else {
      const id = drag.card.dataset.id;
      drag.card = null;
      open(id);
    }
  };

  board = h("div", { class: "tk-board", onPointerdown, onPointermove, onPointerup, onPointercancel: () => finish(false),
    onKeydown: event => {
      if (event.key === "Escape" && drag.moved) finish(false);
      const card = event.target.closest?.(".tk-card");
      if (card && (event.key === "Enter" || event.key === " ")) { event.preventDefault(); open(card.dataset.id); }
    } },
  BOARD.map(id => {
    const items = computed(() => columns.value.get(id));
    return h("section", { class: "tk-col", "data-status": id, "aria-label": statuses.get(id).label },
      h("div", { class: "tk-col-head" },
        StatusIcon(id),
        statuses.get(id).label,
        h("span", { class: "tk-group-count" }, () => items.value.length),
        id === "done" ? h("span", { class: "tk-col-note" }, "· last 14 days") : null,
        h("span", { class: "lucid-spacer" }),
        Button({ variant: "ghost", size: "xs", icon: "plus", aria: { label: `New issue in ${statuses.get(id).label}` }, onClick: () => { composing.value = { status: id }; } })),
      h("div", { class: "tk-col-body" },
        h("div", { class: "tk-drop-line", "aria-hidden": "true" }),
        For({ each: items, key: issue => issue.id }, Card)));
  }));
  return board;
}

export function IssuesView() {
  return [
    Toolbar(),
    h("div", { class: "tk-scroll" }, () => { const mode = view.value; return untrack(() => (mode === "board" ? BoardView() : ListView())); })
  ];
}
