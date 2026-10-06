import { signal, computed, effect, untrack, h } from "/lucid/index.js";
import {
  Button, Dialog, Select, Switch, Textarea, Tooltip, Icon, Menu, Field, DatePicker,
  toast, form, required, maxLength, minLength
} from "/lucid/ui/index.js";
import { selectedId, composing, byId, update, remove, create, comment, people, teams, route, history, createLabel, childrenOf } from "../store.js";
import { ME } from "../data.js";
import {
  StatusIcon, PersonAvatar, TeamMark, relative, labelDisplay,
  statusOptions, priorityOptions, assigneeOptions, labelOptions, teamOptions
} from "../parts.js";

const longDate = new Intl.DateTimeFormat("en", { month: "short", day: "numeric", year: "numeric" });

export const undoable = (message, options = {}) => toast(message, {
  tone: "success",
  ...options,
  action: { label: "Undo", onClick: () => history.undo() }
});

function Detail(id) {
  const issue = computed(() => byId.value.get(id));
  const initial = issue.peek();
  const status = signal(initial.status);
  const priority = signal(initial.priority);
  const assignee = signal(initial.assignee);
  const labels = signal(initial.labels);
  const due = signal(initial.dueAt);
  const draft = signal("");
  let titleEl;
  let descriptionEl;

  effect(() => {
    const current = issue.value;
    if (!current) return;
    untrack(() => {
      status.value = current.status;
      priority.value = current.priority;
      assignee.value = current.assignee;
      labels.value = current.labels;
      due.value = current.dueAt;
      if (titleEl && document.activeElement !== titleEl) titleEl.value = current.title;
      if (descriptionEl && document.activeElement !== descriptionEl) descriptionEl.value = current.description;
    });
  });

  const commitTitle = event => {
    const title = event.target.value.trim();
    if (title && title !== issue.peek().title) update(id, { title }, `Rename ${id}`);
    else event.target.value = issue.peek().title;
  };
  const send = () => {
    const body = draft.peek().trim();
    if (!body) return;
    comment(id, body);
    draft.value = "";
  };
  const copy = text => {
    navigator.clipboard?.writeText(text).catch(() => {});
    toast("Copied to clipboard", { tone: "success", description: text });
  };
  const destroy = () => {
    const title = issue.peek().title;
    remove(id);
    undoable(`${id} deleted`, { description: title });
  };

  const prop = (label, control) => [h("dt", label), h("dd", control)];

  const timeline = () => {
    const current = issue.value;
    if (!current) return null;
    const entries = [
      { at: current.createdAt, kind: "created" },
      current.startedAt ? { at: current.startedAt, kind: "started" } : null,
      current.completedAt ? { at: current.completedAt, kind: current.status === "canceled" ? "canceled" : "completed" } : null,
      ...current.comments.map(c => ({ at: c.at, kind: "comment", comment: c }))
    ].filter(Boolean).sort((a, b) => a.at - b.at);
    return entries.map(entry => {
      if (entry.kind === "comment") {
        const author = people.get(entry.comment.author);
        return h("div", { class: "tk-event" },
          h("div", { class: "tk-event-icon" }, PersonAvatar(entry.comment.author, 22)),
          h("div", { class: "tk-comment" },
            h("div", { class: "tk-comment-meta" }, h("b", author.name), relative(entry.at)),
            h("div", { class: "tk-comment-body tk-selectable" }, entry.comment.body)));
      }
      const text = { created: "created the issue", started: "moved it into progress", completed: "marked it done", canceled: "canceled it" }[entry.kind];
      const icon = StatusIcon({ created: "todo", started: "in_progress", completed: "done", canceled: "canceled" }[entry.kind], 13);
      const who = entry.kind === "created" ? people.get(current.creator ?? ME).name : people.get(current.assignee)?.name ?? "Someone";
      return h("div", { class: "tk-event", style: { alignItems: "center" } },
        h("div", { class: "tk-event-icon" }, icon),
        h("span", h("b", who), ` ${text} · ${relative(entry.at)}`));
    });
  };

  const more = Button({ variant: "ghost", size: "sm", icon: "more", aria: { label: "More actions" } });

  return [
    h("div", { class: "tk-sheet-head" },
      TeamMark(initial.team, 18),
      h("span", { class: "lucid-text", "data-tone": "subtle", style: { fontSize: "var(--lucid-text-sm)" } }, teams.get(initial.team).name),
      Icon({ name: "chevron-right", size: 13, style: { color: "var(--lucid-ink-4)" } }),
      h("span", { class: "tk-id" }, id),
      h("span", { class: "lucid-spacer" }),
      Tooltip({ label: "Copy link" }, Button({ variant: "ghost", size: "sm", icon: "link", aria: { label: "Copy link" }, onClick: () => copy(`${location.origin}${location.pathname}#/issue/${id}`) })),
      Menu({
        trigger: more,
        placement: "bottom-end",
        width: "220px",
        items: [
          { label: "Copy ID", icon: "hash", onSelect: () => copy(id) },
          { label: "Copy title", icon: "copy", onSelect: () => copy(issue.peek().title) },
          { separator: true },
          { label: "Delete issue", icon: "trash", danger: true, onSelect: destroy }
        ]
      }),
      Tooltip({ label: "Close", kbd: "escape" }, Button({ variant: "ghost", size: "sm", icon: "x", aria: { label: "Close" }, onClick: () => { selectedId.value = null; } }))),
    h("div", { class: "tk-sheet-main" },
      h("textarea", {
        class: "tk-title-input", rows: 1, value: initial.title, aria: { label: "Title" },
        ref: el => { titleEl = el; },
        onBlur: commitTitle,
        onKeydown: event => { if (event.key === "Enter") { event.preventDefault(); event.target.blur(); } }
      }),
      Textarea({
        variant: "ghost", rows: 2, value: initial.description, placeholder: "Add a description…", aria: { label: "Description" },
        ref: el => { descriptionEl = el; },
        onBlur: event => { if (event.target.value !== issue.peek().description) update(id, { description: event.target.value }, `Edit description of ${id}`); }
      })),
    h("dl", { class: "tk-props" },
      prop("Status", Select({ value: status, options: statusOptions, variant: "ghost", aria: { label: "Status" }, onChange: v => update(id, { status: v }, `Change status of ${id}`) })),
      prop("Priority", Select({ value: priority, options: priorityOptions, variant: "ghost", aria: { label: "Priority" }, onChange: v => update(id, { priority: v }, `Change priority of ${id}`) })),
      prop("Assignee", Select({ value: assignee, options: assigneeOptions, variant: "ghost", searchable: true, searchPlaceholder: "Assign to…", width: "240px", aria: { label: "Assignee" }, onChange: v => update(id, { assignee: v }, `Reassign ${id}`) })),
      prop("Labels", Select({
        value: labels, options: labelOptions, multiple: true, searchable: true, variant: "ghost", placeholder: "Add labels",
        searchPlaceholder: "Find or create a label", aria: { label: "Labels" }, display: labelDisplay,
        onCreate: createLabel, onChange: v => update(id, { labels: v }, `Relabel ${id}`)
      })),
      prop("Due date", DatePicker({ value: due, variant: "ghost", placeholder: "No due date", aria: { label: "Due date" }, onChange: v => update(id, { dueAt: v }, `Change due date of ${id}`) })),
      [h("dt", "Created"), h("dd", { class: "tk-static" }, longDate.format(initial.createdAt))],
      initial.parent && byId.peek().has(initial.parent) ? [
        h("dt", "Parent"),
        h("dd", h("button", { type: "button", class: "tk-parent-link", onClick: () => { selectedId.value = initial.parent; } },
          StatusIcon(byId.peek().get(initial.parent).status, 13),
          h("span", { class: "tk-id" }, initial.parent),
          h("span", { class: "tk-parent-title" }, byId.peek().get(initial.parent).title)))
      ] : null),
    () => {
      const kids = childrenOf.value.get(id) ?? [];
      if (!kids.length) return null;
      const done = kids.filter(kid => kid.status === "done").length;
      return h("div", { class: "tk-subs" },
        h("div", { class: "tk-subs-head" },
          h("span", { class: "tk-activity-title" }, "Sub-issues"),
          h("span", { class: "tk-subs-count" }, `${done} of ${kids.length} done`),
          h("span", { class: "tk-subs-bar", "aria-hidden": "true" }, h("i", { style: { width: `${(done / kids.length) * 100}%` } }))),
        h("ul", { class: "tk-subs-list" }, kids.map(kid => h("li",
          h("button", { type: "button", class: "tk-subs-item", onClick: () => { selectedId.value = kid.id; } },
            StatusIcon(kid.status, 14),
            h("span", { class: "tk-id" }, kid.id),
            h("span", { class: "tk-subs-title" }, kid.title),
            PersonAvatar(kid.assignee, 20))))));
    },
    h("div", { class: "tk-activity" },
      h("div", { class: "tk-activity-title" }, "Activity"),
      timeline,
      h("div", { class: "tk-composer" },
        Textarea({
          variant: "ghost", rows: 1, bind: draft, placeholder: "Leave a comment…", aria: { label: "Comment" },
          onKeydown: event => { if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) { event.preventDefault(); send(); } }
        }),
        h("div", { style: { display: "flex", justifyContent: "flex-end" } },
          Button({ size: "sm", variant: "primary", disabled: () => !draft.value.trim(), kbd: ["mod", "enter"], onClick: send }, "Comment"))))
  ];
}

export function IssueSheet() {
  return Dialog({
    open: () => selectedId.value != null,
    variant: "sheet",
    class: "tk-sheet",
    aria: { label: "Issue" },
    onClose: () => { selectedId.value = null; }
  }, () => {
    const id = selectedId.value;
    return id && byId.peek().has(id) ? untrack(() => Detail(id)) : null;
  });
}

export function NewIssue() {
  const team = signal("app");
  const status = signal("todo");
  const priority = signal(0);
  const assignee = signal(null);
  const labels = signal([]);
  const due = signal(null);
  const more = signal(false);
  const draft = form({
    title: { value: "", rules: [required("Give the issue a title"), minLength(3, "Make the title a little longer"), maxLength(120)] },
    description: { value: "", rules: [maxLength(2000)] }
  });
  const { title, description } = draft.fields;

  const submit = draft.submit(values => {
    const id = create({
      team: team.peek(), title: values.title.trim(), description: values.description,
      status: status.peek(), priority: priority.peek(), assignee: assignee.peek(), labels: labels.peek(), dueAt: due.peek()
    });
    toast(`${id} created`, { tone: "success", description: values.title.trim(), action: { label: "View", onClick: () => { selectedId.value = id; } } });
    draft.reset();
    due.value = null;
    if (more.peek()) title.element?.focus();
    else composing.value = false;
  });

  effect(() => {
    const preset = composing.value;
    if (!preset) return;
    untrack(() => {
      draft.reset();
      if (preset.status) status.value = preset.status;
      const current = route.peek();
      if (current.page === "team" && teams.has(current.id)) team.value = current.id;
      requestAnimationFrame(() => title.element?.focus());
    });
  });

  return Dialog({
    open: () => Boolean(composing.value),
    class: "tk-new",
    size: "lg",
    aria: { label: "New issue" },
    onClose: () => { composing.value = false; },
    footer: [
      Switch({ bind: more, label: h("span", { style: { fontSize: "var(--lucid-text-sm)", color: "var(--lucid-ink-2)" } }, "Create more") }),
      h("span", { class: "lucid-spacer" }),
      Button({ variant: "ghost", onClick: () => { composing.value = false; } }, "Cancel"),
      Button({ variant: "primary", kbd: ["mod", "enter"], onClick: submit }, "Create issue")
    ]
  },
  h("div", { class: "tk-new-head" },
    Select({ value: team, options: teamOptions, size: "xs", aria: { label: "Team" } }),
    Icon({ name: "chevron-right", size: 13, style: { color: "var(--lucid-ink-4)" } }),
    h("span", { class: "tk-crumb" }, "New issue"),
    h("span", { class: "lucid-spacer" }),
    Button({ variant: "ghost", size: "sm", icon: "x", aria: { label: "Close" }, onClick: () => { composing.value = false; } })),
  Field({ field: title },
    h("textarea", {
      class: "tk-title-input", rows: 1, placeholder: "Issue title", aria: { label: "Issue title" },
      value: title.value,
      onInput: event => { title.value.value = event.target.value; },
      onKeydown: event => {
        if (event.key !== "Enter") return;
        event.preventDefault();
        if (event.metaKey || event.ctrlKey) submit();
      }
    })),
  Field({ field: description },
    Textarea({
      variant: "ghost", rows: 3, bind: description.value, placeholder: "Add a description…", aria: { label: "Description" },
      onKeydown: event => { if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) { event.preventDefault(); submit(); } }
    })),
  h("div", { class: "tk-chips" },
    Select({ value: status, options: statusOptions, size: "xs", aria: { label: "Status" } }),
    Select({ value: priority, options: priorityOptions, size: "xs", aria: { label: "Priority" } }),
    Select({ value: assignee, options: assigneeOptions, size: "xs", searchable: true, width: "240px", aria: { label: "Assignee" } }),
    Select({ value: labels, options: labelOptions, multiple: true, searchable: true, size: "xs", placeholder: "Labels", icon: "tag", searchPlaceholder: "Find or create a label", onCreate: createLabel, aria: { label: "Labels" } }),
    DatePicker({ value: due, size: "xs", placeholder: "Due date", aria: { label: "Due date" } })));
}
