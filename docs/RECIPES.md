# Lucid UI recipes

Complete pages to start from. Each uses only Lucid UI components, so it looks finished with no CSS of your own. In a plain HTML page, import every name from `https://cdn.jsdelivr.net/npm/@lucidui-dev/core@0.3/bundle/lucid.js`, load `bundle/lucid.css`, and put `class="lucid-app"` on `<body>`.

## Settings page

```js
import { signal, mount, AppShell, NavList, Page, Section, SettingRow, Input, Select, Switch, Button, Badge, toast, ask } from "@lucidui-dev/core/bundle";

const view = signal("settings");
const name = signal("Lucid Analytics");
const period = signal("30d");
const timezone = signal("America/Toronto");
const digest = signal(true);
const alerts = signal(true);
const twoFactor = signal(true);

const nav = NavList({
  value: view,
  items: [
    { group: "Workspace" },
    { value: "overview", label: "Overview", icon: "board" },
    { value: "reports", label: "Reports", icon: "chart" },
    { group: "Manage" },
    { value: "settings", label: "Settings", icon: "sliders" }
  ]
});

const Settings = () => Page({
  title: "Settings",
  description: "Workspace, notifications and security.",
  actions: Button({ variant: "primary", onClick: () => toast("Settings saved", { tone: "success" }) }, "Save changes")
},
  Section({ title: "Workspace", description: "How the workspace appears and reports." },
    SettingRow({ label: "Workspace name", description: "Shown in navigation and shared reports." },
      Input({ bind: name, aria: { label: "Workspace name" } })),
    SettingRow({ label: "Default period", description: "The range analytics opens with." },
      Select({ value: period, options: [{ value: "7d", label: "Last 7 days" }, { value: "30d", label: "Last 30 days" }, { value: "90d", label: "Last 90 days" }] })),
    SettingRow({ label: "Timezone", description: "Used for daily boundaries and scheduled reports." },
      Select({ value: timezone, searchable: true, options: ["America/Toronto", "America/Vancouver", "Europe/London", "UTC"].map(value => ({ value, label: value })) }))),
  Section({ title: "Notifications" },
    SettingRow({ label: "Weekly digest", description: "A Monday summary of the numbers that moved." }, Switch({ bind: digest, aria: { label: "Weekly digest" } })),
    SettingRow({ label: "Anomaly alerts", description: "When a key metric leaves its normal range." }, Switch({ bind: alerts, aria: { label: "Anomaly alerts" } }))),
  Section({ title: "Security" },
    SettingRow({ label: "Two-factor authentication", description: "Ask for a second step when signing in." }, Switch({ bind: twoFactor, aria: { label: "Two-factor authentication" } })),
    SettingRow({ label: "Active sessions", description: "Signed in on 2 devices." }, Badge({ color: "var(--lucid-success)" }, "Secure"), Button({ size: "sm" }, "Manage"))),
  Section({ title: "Danger zone", tone: "danger" },
    SettingRow({ label: "Delete workspace", description: "Permanently removes the workspace and its data." },
      Button({
        variant: "danger",
        size: "sm",
        onClick: async () => {
          if (await ask({ title: "Delete this workspace?", description: "This can't be undone.", confirm: "Delete", tone: "danger" })) toast("Workspace deleted");
        }
      }, "Delete"))));

mount(() => AppShell({ sidebar: nav }, () => (view.value === "settings" ? Settings() : Page({ title: "Overview" }))), "#app");
```

Rules this follows, and every page should:

- Every control is a Lucid component: `Select`, never `select`; `Switch`, never a hand-made toggle; `toast()` and `ask()`, never `alert()` or `confirm()`.
- No CSS for colours, borders, radii, shadows or type. The components and `--lucid-*` tokens are the design. Add CSS only for layout, and only when a component can't do it.
- Mount once. Switch views with a signal inside the app, not by calling `mount` again.

## Dashboard

```js
const range = signal("week");
Page({ title: "Overview", width: "lg", actions: Segmented({ value: range, options: [{ value: "week", label: "Week" }, { value: "month", label: "Month" }] }) },
  Grid({ min: 220, gap: 4 },
    StatTile({ label: "Revenue", value: 48200, unit: "USD", delta: 12, trend: [31, 34, 33, 38, 41, 45, 48] }),
    StatTile({ label: "Orders", value: 1284, delta: 6, trend: [9, 11, 10, 12, 12, 13, 13] }),
    StatTile({ label: "Refund rate", value: 1.7, unit: "%", delta: -4, upIsGood: false })),
  Grid({ min: 340, gap: 4 },
    ChartCard({ title: "Orders by day" }, DotColumns({ data: [{ label: "Mon", value: 12 }, { label: "Tue", value: 18 }, { label: "Wed", value: 15 }], unit: "orders" })),
    ChartCard({ title: "Channel mix" }, Waffle({ segments: [{ label: "Organic", value: 52 }, { label: "Paid", value: 31 }, { label: "Direct", value: 17 }] }))));
```

## List with empty state

```js
const items = signal([]);
Page({ title: "Projects", actions: Button({ variant: "primary", icon: "plus" }, "New project") },
  Section({},
    () => items.value.length
      ? For({ each: items, key: item => item.id }, item => SettingRow({ label: item.name, description: item.owner }, Button({ size: "sm", variant: "ghost" }, "Open")))
      : EmptyState({ icon: "inbox", title: "No projects yet", description: "Create one to get started." })));
```
