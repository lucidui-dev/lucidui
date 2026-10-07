import { computed, untrack, h, mount, signal, effect } from "/lucid/index.js";
import { Button, Segmented, Menu, CommandMenu, Kbd, Icon, Tooltip, toast, hotkey, isMac } from "/lucid/ui/index.js";
import {
  route, go, view, theme, composing, commandOpen, inviting, navOpen, selectedId, issues, scope, visible, me, history
} from "./store.js";
import { TEAMS } from "./data.js";
import { TeamMark, PersonAvatar } from "./parts.js";
import { IssuesView, ViewSwitch } from "./views/issues.js";
import { InsightsView } from "./views/insights.js";
import { IssueSheet, NewIssue } from "./views/issue.js";
import { ActivityView, activity } from "./views/activity.js";
import { InviteDialog } from "./views/invite.js";
import { ExitCard } from "/exit.js";

const openCount = predicate => computed(() => issues.value.filter(issue => predicate(issue) && !["done", "canceled"].includes(issue.status)).length);

const slim = signal((() => { try { return localStorage.getItem("lucid-tracker:slim") === "1"; } catch { return false; } })());
effect(() => { try { localStorage.setItem("lucid-tracker:slim", slim.value ? "1" : "0"); } catch {} });

function NavLink({ href, icon, label, count, active }) {
  return h("a", {
    href,
    class: "tk-nav",
    title: () => (slim.value ? label : null),
    "aria-current": () => (active() ? "page" : false),
    draggable: "false",
    onClick: () => { navOpen.value = false; }
  },
  icon,
  h("span", { class: "tk-nav-label" }, label),
  count ? h("span", { class: "tk-count" }, count) : null);
}

function Sidebar() {
  const page = computed(() => route.value.page);
  const workspace = h("button", { type: "button", class: "tk-workspace" },
    h("span", { class: "tk-mark", style: { "--h": 275, "--s": "24px" }, "aria-hidden": "true" }, "O"),
    "Orbitry",
    Icon({ name: "chevrons-up-down", size: 14, class: "lucid-chevron" }));
  return h("nav", { class: "tk-side", aria: { label: "Workspace" } },
    h("div", { class: "tk-side-top" },
    Menu({
      trigger: workspace,
      width: "232px",
      items: [
        { group: "Theme" },
        { label: "Light", icon: "sun", checked: () => theme.value === "light", onSelect: () => { theme.value = "light"; } },
        { label: "Dark", icon: "moon", checked: () => theme.value === "dark", onSelect: () => { theme.value = "dark"; } },
        { label: "System", icon: "monitor", checked: () => theme.value === "system", onSelect: () => { theme.value = "system"; } },
        { separator: true },
        { label: "Invite people", icon: "users", onSelect: () => { inviting.value = true; } },
        { label: "Command menu", icon: "command", kbd: ["mod", "K"], onSelect: () => { commandOpen.value = true; } }
      ]
    }),
    Tooltip({ label: "Collapse sidebar", kbd: ["["] }, Button({ variant: "ghost", size: "sm", icon: "sidebar", class: "tk-slim-btn", "aria-pressed": () => String(slim.value), aria: { label: () => (slim.value ? "Expand sidebar" : "Collapse sidebar") }, onClick: () => { slim.value = !slim.peek(); } }))),
    h("button", { type: "button", class: "tk-search", title: () => (slim.value ? "Search" : null), onClick: () => { commandOpen.value = true; navOpen.value = false; } },
      Icon({ name: "search", size: 15 }),
      h("span", { class: "tk-nav-label" }, "Search or jump to…"),
      Kbd("mod", "K")),
    NavLink({ href: "#/my", icon: Icon({ name: "user", size: 16 }), label: "My issues", count: openCount(issue => issue.assignee === me.id), active: () => page.value === "my" }),
    NavLink({ href: "#/issues", icon: Icon({ name: "layers", size: 16 }), label: "All issues", active: () => page.value === "issues" }),
    NavLink({ href: "#/activity", icon: Icon({ name: "clock", size: 16 }), label: "Activity", active: () => page.value === "activity" }),
    NavLink({ href: "#/insights", icon: Icon({ name: "chart", size: 16 }), label: "Insights", active: () => page.value === "insights" }),
    h("div", { class: "tk-section" }, "Teams"),
    TEAMS.map(team => NavLink({
      href: `#/team/${team.id}`,
      icon: TeamMark(team.id, 18),
      label: team.name,
      count: openCount(issue => issue.team === team.id),
      active: () => page.value === "team" && route.value.id === team.id
    })),
    h("div", { class: "tk-side-foot" },
      ExitCard({ compact: slim }),
      h("div", { class: "tk-appearance" },
        "Appearance",
        Segmented({
          value: theme,
          size: "sm",
          iconOnly: true,
          aria: { label: "Theme" },
          options: [{ value: "light", label: "Light", icon: "sun" }, { value: "dark", label: "Dark", icon: "moon" }, { value: "system", label: "System", icon: "monitor" }]
        })),
      h("div", { class: "tk-me" },
        PersonAvatar(me.id, 30),
        h("div", { style: { minWidth: 0, flex: 1 } },
          h("div", { class: "tk-me-name" }, me.name),
          h("div", { class: "tk-me-role" }, me.role)))));
}

function Header() {
  const isInsights = computed(() => route.value.page === "insights" || route.value.page === "activity");
  return h("header", { class: "tk-head" },
    Button({ variant: "ghost", size: "sm", icon: "menu", class: "tk-menu-btn", aria: { label: "Open navigation" }, onClick: () => { navOpen.value = true; } }),
    h("h1", { class: "tk-title" },
      () => {
        if (route.value.page === "insights") return [Icon({ name: "chart", size: 16 }), "Insights"];
        if (route.value.page === "activity") return [Icon({ name: "clock", size: 16 }), "Activity", h("span", { class: "tk-title-count" }, () => activity.value.length.toLocaleString("en"))];
        const s = scope.value;
        return [
          s.team ? TeamMark(s.team.id, 20) : Icon({ name: s.title === "My issues" ? "user" : "layers", size: 16 }),
          s.title,
          h("span", { class: "tk-title-count" }, () => visible.value.length)
        ];
      }),
    h("div", { class: "lucid-spacer" }),
    () => (isInsights.value ? null : untrack(ViewSwitch)),
    Tooltip({ label: "Create a new issue", kbd: "C" },
      Button({ variant: "primary", size: "sm", icon: "plus", onClick: () => { composing.value = {}; } }, h("span", { class: "tk-hide-sm" }, "New issue"))));
}

function undo() {
  const label = history.undo();
  if (label) toast(`Undid “${label}”`, { icon: "corner-down-left", action: { label: "Redo", onClick: redo } });
}

function redo() {
  const label = history.redo();
  if (label) toast(`Redid “${label}”`, { icon: "arrow-right", action: { label: "Undo", onClick: undo } });
}

function Commands() {
  const items = computed(() => [
    { group: "Create", label: "New issue", icon: "plus", kbd: "C", run: () => { composing.value = {}; } },
    { group: "Create", label: "Invite people", icon: "users", run: () => { inviting.value = true; } },
    ...(history.canUndo.value ? [{ group: "Edit", label: `Undo: ${history.nextUndo.value}`, icon: "corner-down-left", kbd: ["mod", "Z"], run: undo }] : []),
    ...(history.canRedo.value ? [{ group: "Edit", label: `Redo: ${history.nextRedo.value}`, icon: "arrow-right", kbd: ["mod", "shift", "Z"], run: redo }] : []),
    { group: "Navigate", label: "My issues", icon: "user", run: () => go("#/my") },
    { group: "Navigate", label: "All issues", icon: "layers", run: () => go("#/issues") },
    { group: "Navigate", label: "Activity", icon: "clock", run: () => go("#/activity") },
    { group: "Navigate", label: "Insights", icon: "chart", run: () => go("#/insights") },
    ...TEAMS.map(team => ({ group: "Navigate", label: `${team.name} team`, icon: () => TeamMark(team.id, 16), run: () => go(`#/team/${team.id}`) })),
    { group: "View", label: view.value === "list" ? "Switch to board" : "Switch to list", icon: view.value === "list" ? "board" : "list", run: () => { view.value = view.value === "list" ? "board" : "list"; } },
    { group: "View", label: "Light theme", icon: "sun", keywords: "appearance mode", run: () => { theme.value = "light"; } },
    { group: "View", label: "Dark theme", icon: "moon", keywords: "appearance mode", run: () => { theme.value = "dark"; } },
    { group: "View", label: "System theme", icon: "monitor", keywords: "appearance mode auto", run: () => { theme.value = "system"; } },
    ...issues.value.map(issue => ({
      group: "Issues",
      label: issue.title,
      hint: issue.id,
      keywords: issue.id,
      searchOnly: true,
      icon: () => TeamMark(issue.team, 16),
      run: () => { selectedId.value = issue.id; }
    }))
  ]);
  return CommandMenu({ open: commandOpen, items, placeholder: "Search issues, views and actions…" });
}

function App() {
  hotkey("mod+k", () => { commandOpen.value = !commandOpen.peek(); }, { inputs: true });
  hotkey("c", () => { composing.value = {}; });
  hotkey("mod+z", undo);
  hotkey("mod+shift+z", redo);
  hotkey("/", () => document.querySelector(".tk-toolbar input")?.focus());
  window.addEventListener("keydown", event => {
    const mod = isMac ? event.metaKey : event.ctrlKey;
    if (mod && event.key.toLowerCase() === "a" && !/^(INPUT|TEXTAREA)$/.test(event.target.tagName)) event.preventDefault();
    if (event.key === "Escape" && navOpen.peek()) navOpen.value = false;
  });

  hotkey("[", () => { slim.value = !slim.peek(); });
  return h("div", { class: "tk", "data-nav-open": navOpen, "data-slim": slim },
    Sidebar(),
    h("div", { class: "tk-backdrop", "aria-hidden": "true", onClick: () => { navOpen.value = false; } }),
    h("main", { class: "tk-main" },
      Header(),
      () => {
        const page = route.value.page;
        return untrack(() => (page === "insights" ? InsightsView() : page === "activity" ? ActivityView() : IssuesView()));
      }),
    IssueSheet(),
    NewIssue(),
    InviteDialog(),
    Commands());
}

const params = route.peek();
if (params.page === "issue" && params.id) {
  selectedId.value = params.id;
  history.replaceState(null, "", "#/issues");
  route.value = { page: "issues", id: null };
}

mount(App, "#app");
