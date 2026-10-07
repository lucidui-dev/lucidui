export const TEMPLATES = [
  {
    value: "counter",
    label: "Counter",
    icon: "plus",
    note: "Signals, computed values and a live trend",
    code: `import { signal, computed, h, mount } from "@lucidui-dev/core";
import { Button, Segmented, Badge, Card, Stack, Row, Text } from "@lucidui-dev/core/ui";
import { DotSparkline } from "@lucidui-dev/core/viz";

function Counter() {
  const count = signal(0);
  const step = signal("1");
  const history = signal([0]);
  const parity = computed(() => (count.value % 2 === 0 ? "Even" : "Odd"));

  const change = by => {
    count.value += by * Number(step.value);
    history.value = [...history.value.slice(-23), count.value];
  };

  return Card({ padding: "lg", class: "demo-card" },
    Stack({ gap: 5 },
      Row({ justify: "space-between", align: "center" },
        Text({ tone: "muted", size: "sm" }, "Clicks"),
        Badge({ tone: "accent" }, () => parity.value)),
      h("h1", { class: "demo-title", style: { fontSize: "64px" } }, () => count.value),
      DotSparkline({ data: () => history.value, height: 36, label: "Count over time" }),
      Row({ gap: 2, wrap: true },
        Button({ icon: "plus", variant: "primary", onClick: () => change(1) }, "Add"),
        Button({ onClick: () => change(-1) }, "Take away"),
        Button({ variant: "ghost", onClick: () => { count.value = 0; history.value = [0]; } }, "Reset")),
      Row({ gap: 3, align: "center" },
        Text({ tone: "muted", size: "sm" }, "Step"),
        Segmented({ value: step, size: "sm", aria: { label: "Step" }, options: [{ value: "1", label: "1" }, { value: "5", label: "5" }, { value: "10", label: "10" }] }))));
}

mount(Counter, "#app");
`
  },
  {
    value: "form",
    label: "Sign-up form",
    icon: "pen",
    note: "Validation, a plan picker and a success state",
    code: `import { signal, h, mount, Show } from "@lucidui-dev/core";
import { form, required, email, minLength, Field, Input, Button, Segmented, Checkbox, Card, Stack, Text, toast } from "@lucidui-dev/core/ui";

function SignUp() {
  const plan = signal("pro");
  const agree = signal(false);
  const done = signal(null);
  const f = form({
    name: { value: "", rules: [required("Tell us your name")] },
    mail: { value: "", rules: [required("Add your email"), email()] },
    pass: { value: "", rules: [minLength(8, "Use at least 8 characters")] }
  });

  const submit = f.submit(values => {
    if (!agree.value) { toast("Please accept the terms", { tone: "danger" }); return; }
    done.value = values;
    toast("Welcome aboard", { tone: "success", description: values.mail });
  });

  return Card({ padding: "lg", class: "demo-card" },
    Show({ when: done, fallback: () => h("form", { onSubmit: submit, novalidate: true },
      Stack({ gap: 4 },
        h("h2", { class: "demo-title" }, "Create your account"),
        Text({ tone: "muted" }, "Free for 14 days. No card needed."),
        Field({ label: "Name", field: f.fields.name }, Input({ bind: f.fields.name.value, placeholder: "Ada Lovelace", autocomplete: "name" })),
        Field({ label: "Email", field: f.fields.mail }, Input({ bind: f.fields.mail.value, type: "email", placeholder: "ada@example.com", autocomplete: "email" })),
        Field({ label: "Password", field: f.fields.pass, hint: "8 characters or more" }, Input({ bind: f.fields.pass.value, type: "password", autocomplete: "new-password" })),
        Field({ label: "Plan" }, Segmented({ value: plan, aria: { label: "Plan" }, options: [{ value: "free", label: "Free" }, { value: "pro", label: "Pro" }, { value: "team", label: "Team" }] })),
        Checkbox({ bind: agree, label: "I agree to the terms" }),
        Button({ type: "submit", variant: "primary", loading: f.submitting }, "Create account"))) },
      () => Stack({ gap: 3 },
        h("h2", { class: "demo-title" }, "You're in, ", done.value.name.split(" ")[0], "."),
        Text({ tone: "muted" }, "We sent a welcome note to ", done.value.mail, ". Your ", plan.value, " trial starts now."),
        Button({ onClick: () => { done.value = null; f.reset(); agree.value = false; } }, "Start over"))));
}

mount(SignUp, "#app");
`
  },
  {
    value: "dashboard",
    label: "Dashboard",
    icon: "chart",
    note: "Stat tiles and dot charts that follow a range",
    code: `import { signal, computed, mount } from "@lucidui-dev/core";
import { Page, Grid, Segmented } from "@lucidui-dev/core/ui";
import { StatTile, DotColumns, Waffle, ChartCard } from "@lucidui-dev/core/viz";

const RANGES = {
  week: { orders: [12, 18, 15, 22, 19, 26, 21], revenue: 48200, change: 12, mix: [52, 31, 17] },
  month: { orders: [64, 72, 58, 81, 77, 90, 85], revenue: 196400, change: 7, mix: [47, 36, 17] }
};
const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function Dashboard() {
  const range = signal("week");
  const r = computed(() => RANGES[range.value]);
  const orders = computed(() => r.value.orders.reduce((a, b) => a + b, 0));

  return Page({
    title: "Overview",
    description: "How the shop is doing.",
    width: "lg",
    actions: Segmented({ value: range, size: "sm", aria: { label: "Range" }, options: [{ value: "week", label: "This week" }, { value: "month", label: "This month" }] })
  },
    Grid({ min: 200, gap: 4 },
      StatTile({ label: "Revenue", value: () => r.value.revenue, unit: "USD", delta: () => r.value.change, deltaLabel: "vs last period", trend: () => r.value.orders }),
      StatTile({ label: "Orders", value: orders, delta: 6, trend: () => r.value.orders }),
      StatTile({ label: "Refund rate", value: 1.7, unit: "%", delta: -4, upIsGood: false })),
    Grid({ min: 320, gap: 4 },
      ChartCard({ title: "Orders by day", table: () => ({ columns: ["Day", "Orders"], rows: r.value.orders.map((v, i) => [DAYS[i], v]) }) },
        DotColumns({ data: () => r.value.orders.map((value, i) => ({ label: DAYS[i], value })), height: 180, unit: "orders" })),
      ChartCard({ title: "Where orders came from" },
        Waffle({ segments: () => [{ label: "Organic", value: r.value.mix[0] }, { label: "Paid", value: r.value.mix[1] }, { label: "Direct", value: r.value.mix[2] }] }))));
}

mount(Dashboard, "#app");
`
  },
  {
    value: "settings",
    label: "Settings page",
    icon: "settings",
    note: "A whole screen from AppShell, Section and SettingRow",
    code: `import { signal, mount } from "@lucidui-dev/core";
import { AppShell, NavList, Page, Section, SettingRow, Input, Select, Switch, Button, Badge, toast, ask } from "@lucidui-dev/core/ui";

const view = signal("settings");
const name = signal("Lucid Analytics");
const period = signal("30d");
const digest = signal(true);
const alerts = signal(true);
const twoFactor = signal(true);

const nav = NavList({
  value: view,
  items: [
    { group: "Workspace" },
    { value: "overview", label: "Overview", icon: "home" },
    { value: "reports", label: "Reports", icon: "chart" },
    { group: "Manage" },
    { value: "settings", label: "Settings", icon: "settings" }
  ]
});

const Settings = () => Page({
  title: "Settings",
  description: "Workspace, notifications and security.",
  actions: Button({ variant: "primary", onClick: () => toast("Settings saved", { tone: "success" }) }, "Save changes")
},
  Section({ title: "Workspace" },
    SettingRow({ label: "Workspace name", description: "Shown in navigation and shared reports." }, Input({ bind: name, aria: { label: "Workspace name" } })),
    SettingRow({ label: "Default period", description: "The range analytics opens with." },
      Select({ value: period, options: [{ value: "7d", label: "Last 7 days" }, { value: "30d", label: "Last 30 days" }, { value: "90d", label: "Last 90 days" }] }))),
  Section({ title: "Notifications" },
    SettingRow({ label: "Weekly digest", description: "A Monday summary of what moved." }, Switch({ bind: digest, aria: { label: "Weekly digest" } })),
    SettingRow({ label: "Anomaly alerts", description: "When a key metric leaves its range." }, Switch({ bind: alerts, aria: { label: "Anomaly alerts" } }))),
  Section({ title: "Security" },
    SettingRow({ label: "Two-factor authentication", description: "Ask for a second step when signing in." }, Switch({ bind: twoFactor, aria: { label: "Two-factor authentication" } })),
    SettingRow({ label: "Active sessions", description: "Signed in on 2 devices." }, Badge({ color: "var(--lucid-success)" }, "Secure"))),
  Section({ title: "Danger zone", tone: "danger" },
    SettingRow({ label: "Delete workspace", description: "Removes the workspace and all its data." },
      Button({
        variant: "danger", size: "sm",
        onClick: async () => { if (await ask({ title: "Delete this workspace?", description: "This can't be undone.", confirm: "Delete", tone: "danger" })) toast("Workspace deleted"); }
      }, "Delete"))));

mount(() => AppShell({ sidebar: nav }, () => (view.value === "settings" ? Settings() : Page({ title: view.value === "overview" ? "Overview" : "Reports", description: "Pick Settings in the sidebar to see the full page." }))), "#app");
`
  },
  {
    value: "tasks",
    label: "Task list",
    icon: "check-circle",
    note: "Keyed lists, an empty state and undo",
    code: `import { signal, computed, h, mount, For, Show } from "@lucidui-dev/core";
import { Button, Input, Checkbox, Badge, Card, Row, Stack, Text, EmptyState, createHistory, hotkey, toast } from "@lucidui-dev/core/ui";

let next = 4;
const tasks = signal([
  { id: 1, title: "Sketch the onboarding flow", done: true },
  { id: 2, title: "Write the pricing page", done: false },
  { id: 3, title: "Record a demo video", done: false }
]);
const history = createHistory(tasks);
const draft = signal("");
const left = computed(() => tasks.value.filter(t => !t.done).length);

const add = event => {
  event.preventDefault();
  const title = draft.value.trim();
  if (!title) return;
  history.change("Add task", () => { tasks.value = [...tasks.value, { id: next++, title, done: false }]; });
  draft.value = "";
};
const toggle = id => history.change("Toggle", () => { tasks.value = tasks.value.map(t => (t.id === id ? { ...t, done: !t.done } : t)); });
const remove = task => {
  history.change("Remove", () => { tasks.value = tasks.value.filter(t => t.id !== task.id); });
  toast("Task removed", { description: task.title, action: { label: "Undo", onClick: history.undo } });
};

function Tasks() {
  hotkey("mod+z", history.undo);
  return Card({ padding: "lg", class: "demo-card", style: { maxWidth: "460px" } },
    Stack({ gap: 4 },
      Row({ justify: "space-between", align: "center" },
        h("h2", { class: "demo-title" }, "Today"),
        Badge(() => (left.value ? left.value + " to go" : "All done"))),
      h("form", { onSubmit: add },
        Row({ gap: 2 },
          Input({ bind: draft, placeholder: "Add a task", aria: { label: "New task" }, style: { flex: "1" } }),
          Button({ type: "submit", variant: "primary", icon: "plus" }, "Add"))),
      Show({ when: () => tasks.value.length, fallback: () => EmptyState({ icon: "check-circle", title: "Nothing left", description: "Add a task above, or press Cmd Z to bring one back." }) },
        () => Stack({ gap: 2 },
          For({ each: tasks, key: t => t.id }, task => Row({ gap: 3, align: "center", justify: "space-between" },
            Checkbox({ checked: () => task.done, onChange: () => toggle(task.id), label: task.title }),
            Button({ variant: "ghost", size: "xs", icon: "trash", aria: { label: "Remove " + task.title }, onClick: () => remove(task) }))))),
      Text({ tone: "muted", size: "sm" }, "Cmd Z undoes anything.")));
}

mount(Tasks, "#app");
`
  },
  {
    value: "dialogs",
    label: "Dialogs and toasts",
    icon: "message",
    note: "Styled confirms, sheets and notifications, never browser ones",
    code: `import { signal, mount } from "@lucidui-dev/core";
import { Button, Dialog, Field, Input, Card, Row, Stack, Text, Tooltip, toast, ask } from "@lucidui-dev/core/ui";

function Dialogs() {
  const sheet = signal(false);
  const name = signal("Q4 planning");

  const archive = async () => {
    if (await ask({ title: "Archive this project?", description: "It moves to Archived. You can restore it any time.", confirm: "Archive" })) {
      toast("Project archived", { tone: "success", action: { label: "Undo", onClick: () => toast("Restored") } });
    }
  };

  return Card({ padding: "lg", class: "demo-card", style: { maxWidth: "460px" } },
    Stack({ gap: 4 },
      Stack({ gap: 1 },
        Text({ weight: 600 }, "Every dialog is designed"),
        Text({ tone: "muted", size: "sm" }, "No alert(), no confirm(): Lucid's own, in light and dark.")),
      Row({ gap: 2, wrap: true },
        Button({ variant: "primary", icon: "pen", onClick: () => { sheet.value = true; } }, "Rename"),
        Button({ icon: "trash", onClick: archive }, "Archive"),
        Tooltip({ label: "Shows a toast" }, Button({ variant: "ghost", icon: "bell", onClick: () => toast("Build finished", { tone: "success", description: "Deployed to production in 42 s" }) }, "Notify"))),
      Dialog({
        open: sheet,
        title: "Rename project",
        variant: "sheet",
        footer: [
          Button({ variant: "ghost", onClick: () => { sheet.value = false; } }, "Cancel"),
          Button({ variant: "primary", onClick: () => { sheet.value = false; toast("Renamed", { description: name.value }); } }, "Save")
        ]
      }, Field({ label: "Project name" }, Input({ bind: name, autofocus: true })))));
}

mount(Dialogs, "#app");
`
  },
  {
    value: "diagnostics",
    label: "Diagnostics tour",
    icon: "alert-circle",
    note: "Break things on purpose and watch Lucid explain the fix",
    code: `import { signal, h, mount, For } from "@lucidui-dev/core";
import { Button, Select, Switch, Card, Row, Stack, Text, Badge } from "@lucidui-dev/core/ui";

const fruit = signal("pear");
const people = [{ id: "ada", name: "Ada" }, { id: "grace", name: "Grace" }];

const MISTAKES = [
  {
    code: "button-without-name",
    title: "An icon button with no name",
    broken: () => Button({ icon: "trash" }),
    fixed: () => Button({ icon: "trash", aria: { label: "Delete" } })
  },
  {
    code: "img-without-alt",
    title: "An image with no alt text",
    broken: () => h("img", { src: "/media/logo/lucidui-icon.svg", width: 36, height: 36 }),
    fixed: () => h("img", { src: "/media/logo/lucidui-icon.svg", width: 36, height: 36, alt: "Lucid UI" })
  },
  {
    code: "native-select",
    title: "A native browser select",
    broken: () => h("select", h("option", "Pear"), h("option", "Plum")),
    fixed: () => Select({ value: fruit, options: [{ value: "pear", label: "Pear" }, { value: "plum", label: "Plum" }] })
  },
  {
    code: "duplicate-key",
    title: "Two list items with the same key",
    broken: () => h("ul", For({ each: () => people, key: () => "same" }, p => h("li", p.name))),
    fixed: () => h("ul", For({ each: () => people, key: p => p.id }, p => h("li", p.name)))
  }
];

function Mistake(m) {
  const fixed = signal(false);
  return Card({ padding: "md" },
    Stack({ gap: 3 },
      Row({ justify: "space-between", align: "center", gap: 3 },
        Stack({ gap: 1 },
          Text({ weight: 600 }, m.title),
          Text({ mono: true, size: "sm", tone: "muted" }, m.code)),
        Switch({ bind: fixed, label: () => (fixed.value ? "Fixed" : "Broken") })),
      Row({ align: "center", gap: 3, style: { minHeight: "44px" } }, () => (fixed.value ? m.fixed() : m.broken()))));
}

function Tour() {
  return Stack({ gap: 4, style: { maxWidth: "560px" } },
    Stack({ gap: 1 },
      Row({ gap: 2, align: "center" }, h("h2", { class: "demo-title" }, "Diagnostics tour"), Badge({ tone: "accent" }, "4 mistakes")),
      Text({ tone: "muted" }, "Each card starts broken. Read what Lucid says in the console below, then flip the switch to apply the fix.")),
    MISTAKES.map(Mistake));
}

mount(Tour, "#app");
`
  }
];
