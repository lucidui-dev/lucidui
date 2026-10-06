import { h } from "/lucid/index.js";
import { Avatar, Badge, Icon } from "/lucid/ui/index.js";
import { computed } from "/lucid/index.js";
import { people, statuses, teams, labelMap, labels, NOW, DAY } from "./store.js";
import { PRIORITIES, STATUSES, PEOPLE, TEAMS } from "./data.js";

const priorityMap = new Map(PRIORITIES.map(priority => [priority.id, priority]));

export function StatusIcon(status, size = 14) {
  const meta = statuses.get(status);
  const c = meta.color;
  const shapes = {
    backlog: [h("circle", { cx: 8, cy: 8, r: 6, fill: "none", stroke: c, "stroke-width": 1.5, "stroke-dasharray": "1.4 1.9" })],
    todo: [h("circle", { cx: 8, cy: 8, r: 6, fill: "none", stroke: c, "stroke-width": 1.5 })],
    in_progress: [h("circle", { cx: 8, cy: 8, r: 6, fill: "none", stroke: c, "stroke-width": 1.5 }), h("path", { d: "M8 4.5A3.5 3.5 0 0 1 8 11.5Z", fill: c })],
    in_review: [h("circle", { cx: 8, cy: 8, r: 6, fill: "none", stroke: c, "stroke-width": 1.5 }), h("path", { d: "M8 8V4.5A3.5 3.5 0 1 1 4.5 8Z", fill: c })],
    done: [h("circle", { cx: 8, cy: 8, r: 7, fill: c }), h("path", { d: "m5.1 8.2 1.9 1.9 3.9-4.2", fill: "none", stroke: "#fff", "stroke-width": 1.6, "stroke-linecap": "round", "stroke-linejoin": "round" })],
    canceled: [h("circle", { cx: 8, cy: 8, r: 7, fill: c }), h("path", { d: "m5.9 5.9 4.2 4.2m0-4.2-4.2 4.2", stroke: "var(--lucid-surface)", "stroke-width": 1.6, "stroke-linecap": "round" })]
  };
  return h("svg", { class: "lucid-icon", width: size, height: size, viewBox: "0 0 16 16", role: "img", aria: { label: meta.label } }, shapes[status]);
}

export function PriorityIcon(priority, size = 14) {
  const label = priorityMap.get(priority).label;
  let body;
  if (priority === 1) {
    body = [h("rect", { x: 1.5, y: 1.5, width: 13, height: 13, rx: 3.5, fill: "var(--lucid-danger)" }), h("rect", { x: 7.2, y: 4, width: 1.6, height: 5.2, rx: .8, fill: "#fff" }), h("circle", { cx: 8, cy: 11.4, r: .95, fill: "#fff" })];
  } else if (priority === 0) {
    body = [2, 6.5, 11].map(x => h("rect", { x, y: 7.25, width: 3, height: 1.5, rx: .75, fill: "var(--lucid-ink-4)" }));
  } else {
    const on = 5 - priority;
    body = [[2, 6], [6.5, 9], [11, 12]].map(([x, height], i) => h("rect", { x, y: 14 - height, width: 3, height, rx: 1, fill: i < on ? "var(--lucid-ink-2)" : "var(--lucid-ink-4)", opacity: i < on ? 1 : .55 }));
  }
  return h("svg", { class: "lucid-icon", width: size, height: size, viewBox: "0 0 16 16", role: "img", aria: { label: `Priority: ${label}` } }, body);
}

export function TeamMark(teamId, size = 22) {
  const team = teams.get(teamId);
  return h("span", { class: "tk-mark", style: { "--h": team.hue, "--s": `${size}px` }, "aria-hidden": "true" }, team.name[0]);
}

export const PersonAvatar = (id, size = 22) => {
  const person = id ? people.get(id) : null;
  return Avatar({ name: person?.name, size, title: person ? person.name : "Unassigned" });
};

export const LabelBadge = id => {
  const label = labelMap.peek().get(id) ?? { label: id, color: "var(--lucid-ink-3)" };
  return Badge({ color: label.color, size: "sm" }, label.label);
};

const short = new Intl.DateTimeFormat("en", { month: "short", day: "numeric" });

export function DueDate(at) {
  if (!at) return h("span", { class: "tk-due" });
  const overdue = at < NOW;
  return h("span", { class: "tk-due", "data-overdue": overdue, title: overdue ? "Overdue" : "Due date" },
    Icon({ name: "calendar", size: 12 }), short.format(at));
}

export function relative(at) {
  const diff = Date.now() - at;
  const minutes = Math.round(diff / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(diff / DAY);
  if (days < 7) return `${days}d ago`;
  return short.format(at);
}

export const statusOptions = STATUSES.map(status => ({ value: status.id, label: status.label, icon: () => StatusIcon(status.id) }));
export const priorityOptions = PRIORITIES.map(priority => ({ value: priority.id, label: priority.label, icon: () => PriorityIcon(priority.id) }));
export const assigneeOptions = [
  { value: null, label: "Unassigned", icon: () => PersonAvatar(null, 18) },
  ...PEOPLE.map(person => ({ value: person.id, label: person.name, keywords: person.role, icon: () => PersonAvatar(person.id, 18) }))
];
export const assigneeFilterOptions = assigneeOptions.map(option => ({ ...option, value: option.value ?? "none" }));
export const labelOptions = computed(() => labels.value.map(label => ({ value: label.id, label: label.label, icon: () => h("span", { class: "lucid-dot", style: { "--c": label.color, margin: "0 3.5px" } }) })));
export const teamOptions = TEAMS.map(team => ({ value: team.id, label: team.name, icon: () => TeamMark(team.id, 16) }));

export function labelDisplay(chosen) {
  if (!chosen.length) return h("span", { class: "lucid-select-value lucid-select-placeholder" }, "Add labels");
  const shown = chosen.slice(0, 2);
  return [
    ...shown.map(option => h("span", { class: "tk-label-chip" }, option.icon(), option.label)),
    chosen.length > 2 ? h("span", { class: "tk-label-more" }, `+${chosen.length - 2}`) : null
  ];
}
