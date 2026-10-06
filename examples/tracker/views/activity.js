import { signal, computed, h } from "/lucid/index.js";
import { Segmented, Select, VirtualList, EmptyState, Button, startOfDay } from "/lucid/ui/index.js";
import { issues, people, selectedId, DAY } from "../store.js";
import { PEOPLE } from "../data.js";
import { PersonAvatar, StatusIcon } from "../parts.js";

const dayName = new Intl.DateTimeFormat("en", { weekday: "long", month: "short", day: "numeric" });
const clock = new Intl.DateTimeFormat("en", { hour: "numeric", minute: "2-digit" });

const VERBS = {
  created: "created",
  started: "started",
  completed: "completed",
  canceled: "canceled",
  comment: "commented on"
};

export const kind = signal("all");
export const person = signal("everyone");

export const activity = computed(() => {
  const events = [];
  for (const issue of issues.value) {
    const add = (type, at, who, extra) => { if (at != null && who) events.push({ type, at, who, issue, ...extra }); };
    add("created", issue.createdAt, issue.creator);
    add("started", issue.startedAt, issue.assignee);
    if (issue.completedAt) add(issue.status === "canceled" ? "canceled" : "completed", issue.completedAt, issue.assignee);
    for (const c of issue.comments) add("comment", c.at, c.author, { body: c.body, key: c.id });
  }
  return events.sort((a, b) => b.at - a.at);
});

export function ActivityView() {
  const filtered = computed(() => activity.value.filter(event =>
    (kind.value === "all" || (kind.value === "comments" ? event.type === "comment" : event.type !== "comment")) &&
    (person.value === "everyone" || event.who === person.value)));

  const rows = computed(() => {
    const out = [];
    let day = null;
    let header = null;
    const today = startOfDay(Date.now());
    for (const event of filtered.value) {
      const d = startOfDay(event.at);
      if (d !== day) {
        day = d;
        const label = d === today ? "Today" : d === today - DAY ? "Yesterday" : dayName.format(d);
        header = { type: "day", key: `day-${d}`, label, count: 0 };
        out.push(header);
      }
      header.count++;
      out.push({ ...event, key: event.key ?? `${event.type}-${event.issue.id}` });
    }
    return out;
  });

  const Row = item => {
    if (item.type === "day") {
      return h("div", { class: "tk-feed-day" }, item.label, h("span", `${item.count} ${item.count === 1 ? "event" : "events"}`));
    }
    const who = people.get(item.who);
    const icon = item.type === "comment" ? null : StatusIcon({ created: "todo", started: "in_progress", completed: "done", canceled: "canceled" }[item.type], 13);
    return h("button", {
      type: "button",
      class: "tk-feed-row",
      onClick: () => { selectedId.value = item.issue.id; }
    },
    PersonAvatar(item.who, 28),
    h("div", { style: { minWidth: 0 } },
      h("div", { class: "tk-feed-line" },
        h("b", who.name), VERBS[item.type], icon,
        h("span", { class: "tk-id" }, item.issue.id),
        h("span", { class: "tk-feed-title" }, item.issue.title)),
      item.type === "comment" ? h("div", { class: "tk-feed-quote" }, item.body) : null),
    h("span", { class: "tk-feed-time" }, clock.format(item.at)));
  };

  return [
    h("div", { class: "tk-toolbar" },
      Segmented({
        value: kind,
        size: "sm",
        aria: { label: "Event type" },
        options: [{ value: "all", label: "All" }, { value: "updates", label: "Updates" }, { value: "comments", label: "Comments" }]
      }),
      Select({
        value: person,
        size: "sm",
        variant: "ghost",
        searchable: true,
        width: "240px",
        aria: { label: "Person" },
        options: [{ value: "everyone", label: "Everyone", icon: "users" }, ...PEOPLE.map(p => ({ value: p.id, label: p.name, keywords: p.role, icon: () => PersonAvatar(p.id, 18) }))]
      }),
      h("div", { class: "lucid-spacer" }),
      h("span", { class: "tk-col-note" }, () => `${filtered.value.length.toLocaleString("en")} events`)),
    () => (rows.value.length
      ? null
      : EmptyState({ icon: "clock", title: "Nothing here yet", description: "No activity matches these filters.", action: Button({ size: "sm", onClick: () => { kind.value = "all"; person.value = "everyone"; } }, "Show everything") })),
    VirtualList({
      each: rows,
      key: item => item.key,
      itemHeight: item => (item.type === "day" ? 44 : item.type === "comment" ? 70 : 48),
      class: "tk-feed",
      role: "feed",
      itemRole: "article",
      aria: { label: "Team activity" }
    }, Row)
  ];
}
