import { signal, computed, effect } from "/lucid/index.js";
import { createHistory } from "/lucid/ui/index.js";
import { seed, PEOPLE, TEAMS, STATUSES, LABELS, ME } from "./data.js";

const data = seed();

export const NOW = data.now;
export const EVENTS = data.events;
export const DAY = 86400000;

export const issues = signal(data.issues);
export const history = createHistory(issues);

export const labels = signal(LABELS);
export const labelMap = computed(() => new Map(labels.value.map(label => [label.id, label])));

export function createLabel(name) {
  const text = name.trim();
  const existing = labels.peek().find(label => label.label.toLowerCase() === text.toLowerCase());
  if (existing) return existing.id;
  const id = `${text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}-${labels.peek().length}`;
  labels.value = [...labels.peek(), { id, label: text, color: `var(--lucid-series-${(labels.peek().length % 8) + 1})` }];
  return id;
}
export const byId = computed(() => new Map(issues.value.map(issue => [issue.id, issue])));
export const childrenOf = computed(() => {
  const map = new Map();
  for (const issue of issues.value) {
    if (!issue.parent) continue;
    if (!map.has(issue.parent)) map.set(issue.parent, []);
    map.get(issue.parent).push(issue);
  }
  return map;
});
export const people = new Map(PEOPLE.map(person => [person.id, person]));
export const teams = new Map(TEAMS.map(team => [team.id, team]));
export const statuses = new Map(STATUSES.map(status => [status.id, status]));
export const me = people.get(ME);

const stored = key => {
  try { return localStorage.getItem(`lucid-tracker:${key}`); } catch { return null; }
};
const store = (key, value) => {
  try { localStorage.setItem(`lucid-tracker:${key}`, value); } catch {}
};

const parseRoute = () => {
  const [, page = "issues", id = null] = (location.hash || "#/issues").slice(1).split("/");
  return { page, id };
};

export const route = signal(parseRoute());
window.addEventListener("hashchange", () => {
  const next = parseRoute();
  const apply = () => { route.value = next; };
  if (document.startViewTransition && !matchMedia("(prefers-reduced-motion: reduce)").matches) document.startViewTransition(apply);
  else apply();
});

export const go = hash => {
  if (location.hash === hash) return;
  location.hash = hash;
};

export const selectedId = signal(null);
export const composing = signal(false);
export const commandOpen = signal(false);
export const inviting = signal(false);
export const navOpen = signal(false);

export const view = signal(stored("view") ?? "list");
effect(() => store("view", view.value));

export const theme = signal(stored("theme") ?? "system");
effect(() => {
  const id = selectedId.value;
  if (id && !byId.value.has(id)) selectedId.value = null;
});

effect(() => {
  store("theme", theme.value);
  if (theme.value === "system") delete document.documentElement.dataset.theme;
  else document.documentElement.dataset.theme = theme.value;
});


export const filters = {
  status: signal([]),
  priority: signal([]),
  assignee: signal([]),
  label: signal([])
};
export const query = signal("");

export const filtersActive = computed(() =>
  Object.values(filters).some(f => f.value.length) || query.value.trim() !== "");

export const clearFilters = () => {
  for (const f of Object.values(filters)) f.value = [];
  query.value = "";
};

export const scope = computed(() => {
  const { page, id } = route.value;
  if (page === "my") return { title: "My issues", test: issue => issue.assignee === ME };
  if (page === "team" && teams.has(id)) return { title: teams.get(id).name, team: teams.get(id), test: issue => issue.team === id };
  return { title: "All issues", test: () => true };
});

export const visible = computed(() => {
  const { test } = scope.value;
  const q = query.value.trim().toLowerCase();
  const s = filters.status.value;
  const p = filters.priority.value;
  const a = filters.assignee.value;
  const l = filters.label.value;
  return issues.value.filter(issue =>
    test(issue) &&
    (!s.length || s.includes(issue.status)) &&
    (!p.length || p.includes(issue.priority)) &&
    (!a.length || a.includes(issue.assignee ?? "none")) &&
    (!l.length || issue.labels.some(label => l.includes(label))) &&
    (!q || issue.title.toLowerCase().includes(q) || issue.id.toLowerCase().includes(q)));
});

const PRIORITY_ORDER = { 1: 0, 2: 1, 3: 2, 4: 3, 0: 4 };
export const byPriority = (a, b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority] || b.createdAt - a.createdAt;
export const byRank = (a, b) => a.rank - b.rank;

export function update(id, patch, label = `Edit ${id}`) {
  const at = Date.now();
  history.change(label, () => {
    issues.value = issues.value.map(issue => {
      if (issue.id !== id) return issue;
      const next = { ...issue, ...patch };
      if (patch.status && patch.status !== issue.status) {
        if ((patch.status === "in_progress" || patch.status === "in_review") && !issue.startedAt) next.startedAt = at;
        if (patch.status === "done" || patch.status === "canceled") next.completedAt = at;
        else next.completedAt = null;
        if (patch.status === "backlog" || patch.status === "todo") next.startedAt = null;
      }
      return next;
    });
  });
}

export function remove(id) {
  history.change(`Delete ${id}`, () => {
    issues.value = issues.value.filter(issue => issue.id !== id);
  });
}

const counters = {};
for (const issue of data.issues) {
  const n = Number(issue.id.split("-")[1]);
  counters[issue.team] = Math.max(counters[issue.team] ?? 0, n);
}

export function create({ team, title, description = "", status = "todo", priority = 0, assignee = null, labels = [], dueAt = null }) {
  counters[team] = (counters[team] ?? 0) + 1;
  const id = `${teams.get(team).key}-${counters[team]}`;
  const at = Date.now();
  const issue = {
    id, team, title, description, status, priority, assignee, labels,
    createdAt: at,
    startedAt: status === "in_progress" || status === "in_review" ? at : null,
    completedAt: status === "done" ? at : null,
    dueAt,
    rank: -at / 1e13,
    creator: ME,
    comments: []
  };
  history.change(`Create ${id}`, () => { issues.value = [issue, ...issues.value]; });
  return id;
}

export function comment(id, body) {
  const issue = byId.peek().get(id);
  if (!issue) return;
  update(id, { comments: [...issue.comments, { id: `${id}-c${Date.now()}`, author: ME, body, at: Date.now() }] }, `Comment on ${id}`);
}
