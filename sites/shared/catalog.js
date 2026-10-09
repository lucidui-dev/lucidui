export const SETS = [
  { id: "layout", title: "Layout & grids", note: "Space, alignment and columns, without writing CSS. Gaps are steps on one scale, so everything lines up." },
  { id: "shells", title: "Shells & rails", note: "Whole-screen frames. Sidebars and rails, pages and sections that carry the spacing and collapse for phones." },
  { id: "text", title: "Text", note: "A type scale with tones for hierarchy, and keyboard keys that read correctly on every platform." },
  { id: "actions", title: "Actions", note: "Buttons in five voices and four sizes, menus and tooltips that never clip." },
  { id: "inputs", title: "Inputs & forms", note: "Every control styled, labelled and wired to validation. Never the browser's grey box." },
  { id: "overlays", title: "Overlays & feedback", note: "Dialogs, sheets, confirmations, toasts and a command menu. Focus is trapped, Escape closes, motion respects the system." },
  { id: "identity", title: "Identity & status", note: "People, labels, and the icon set every component shares." },
  { id: "state", title: "Lists & state", note: "Tens of thousands of rows, undo for anything, shortcuts that clean up after themselves." },
  { id: "charts", title: "Charts", note: "Data drawn with one mark, the dot. Every chart sizes itself, animates in, and has a table behind it." },
  { id: "patterns", title: "Patterns", note: "Complete screens composed from the pieces above. Start here, then make them yours." }
];

export const COMPONENTS = [
  {
    id: "stack", set: "layout", name: "Stack", uses: ["Stack"],
    summary: "Children in a column with an even gap.",
    code: `Stack({ gap: 3 },
  Card({ padding: "sm" }, "Brief"),
  Card({ padding: "sm" }, "Design"),
  Card({ padding: "sm" }, "Ship"))`
  },
  {
    id: "row", set: "layout", name: "Row", uses: ["Row"],
    summary: "Children in a line, aligned and spaced. Wraps when asked.",
    code: `Row({ gap: 2, justify: "space-between", wrap: true },
  Row({ gap: 2 }, Avatar({ name: "Ada Brook" }), Text({ weight: "medium" }, "Ada Brook")),
  Button({ size: "sm" }, "Follow"))`
  },
  {
    id: "grid-auto", set: "layout", name: "Grid · auto-fit", uses: ["Grid"],
    summary: "As many columns as fit, each at least min pixels wide. Resize the window and it reflows.",
    code: `Grid({ min: 110, gap: 3 },
  ["North", "South", "East", "West", "Coast", "Hills"].map(name =>
    Card({ padding: "sm", variant: "sunken" }, Text({ size: "sm" }, name))))`
  },
  {
    id: "grid-columns", set: "layout", name: "Grid · fixed columns", uses: ["Grid"],
    summary: "A set number of equal columns. Span a cell across several with gridColumn.",
    code: `Grid({ columns: 4, gap: 3 },
  Card({ padding: "sm", style: { gridColumn: "span 4" } }, "Header"),
  Card({ padding: "sm", style: { gridColumn: "span 3" } }, "Main · span 3"),
  Card({ padding: "sm" }, "Aside"),
  Card({ padding: "sm", style: { gridColumn: "span 2" } }, "Half"),
  Card({ padding: "sm", style: { gridColumn: "span 2" } }, "Half"))`
  },
  {
    id: "grid-template", set: "layout", name: "Grid · template", uses: ["Grid"],
    summary: "Any column template you like, such as a fixed sidebar beside a flexible main area.",
    code: `Grid({ columns: "160px minmax(0, 1fr)", gap: 3 },
  Card({ padding: "sm", variant: "sunken" }, "160px"),
  Card({ padding: "sm" }, "The rest"))`
  },
  {
    id: "card", set: "layout", name: "Card", uses: ["Card"],
    summary: "A surface for grouping. Three paddings, raised or sunken.",
    code: `Grid({ min: 120, gap: 3 },
  Card({}, Text({ size: "sm" }, "Default")),
  Card({ variant: "raised" }, Text({ size: "sm" }, "Raised")),
  Card({ variant: "sunken" }, Text({ size: "sm" }, "Sunken")))`
  },
  {
    id: "divider", set: "layout", name: "Divider", uses: ["Divider"],
    summary: "A hairline between groups, across or upright.",
    code: `Stack({ gap: 3 },
  Text({ size: "sm" }, "Above the line"),
  Divider(),
  Row({ gap: 3, style: { height: "20px" } }, Text({ size: "sm" }, "Left"), Divider({ vertical: true }), Text({ size: "sm" }, "Right")))`
  },
  {
    id: "appshell", set: "shells", name: "AppShell & NavList", uses: ["AppShell", "NavList", "Page"], wide: true, tall: true,
    summary: "A sidebar and a main area. On phones the sidebar becomes a scrolling row of tabs.",
    setup: `const view = signal("inbox");`,
    code: `AppShell({
  sidebar: NavList({ value: view, items: [
    { group: "Workspace" },
    { value: "inbox", label: "Inbox", icon: "inbox", badge: 4 },
    { value: "issues", label: "Issues", icon: "list" },
    { value: "projects", label: "Projects", icon: "layers" },
    { group: "Team" },
    { value: "people", label: "People", icon: "users" },
    { value: "settings", label: "Settings", icon: "settings" }
  ] })
},
  Page({ title: () => view.value[0].toUpperCase() + view.value.slice(1), description: "Pick a place in the sidebar." },
    Card({ variant: "sunken" }, Text({ tone: "muted", size: "sm" }, "Your content goes here."))))`
  },
  {
    id: "rail", set: "shells", name: "Collapsible rail", uses: ["NavList", "Button", "Tooltip"], wide: true, tall: true, desk: true,
    summary: "A rail that folds to icons and back. Built from a signal, a NavList and one button.",
    setup: `const open = signal(true);
const view = signal("overview");`,
    code: `Grid({ columns: () => (open.value ? "200px minmax(0, 1fr)" : "60px minmax(0, 1fr)"), gap: 0, style: { height: "100%", transition: "grid-template-columns 240ms" } },
  Stack({ gap: 3, style: { padding: "12px 10px", overflow: "hidden", background: "var(--lucid-surface-sunken)", boxShadow: "inset -1px 0 0 var(--lucid-line)" } },
    Tooltip({ label: () => (open.value ? "Collapse rail" : "Expand rail") },
      Button({ variant: "ghost", size: "sm", icon: "sidebar", aria: { label: "Toggle rail" }, onClick: () => { open.value = !open.value; } })),
    NavList({ value: view, items: [
      { value: "overview", label: "Overview", icon: "home" },
      { value: "reports", label: "Reports", icon: "chart" },
      { value: "calendar", label: "Calendar", icon: "calendar" },
      { value: "messages", label: "Messages", icon: "message", badge: 2 }
    ] })),
  Stack({ gap: 2, style: { padding: "20px" } },
    Heading({ level: 3 }, () => view.value[0].toUpperCase() + view.value.slice(1)),
    Text({ tone: "muted", size: "sm" }, "Fold the rail with the button at its top.")))`
  },
  {
    id: "subrail", set: "shells", name: "Rail & sub-rail", uses: ["NavList", "Button", "Tooltip"], wide: true, tall: true, desk: true,
    summary: "An icon rail picks a section, a sub-rail lists what's inside it, the main area shows the item.",
    setup: `const area = signal("mail");
const AREAS = { mail: ["Inbox", "Starred", "Sent", "Archive"], docs: ["Recent", "Shared", "Drafts"], team: ["People", "Groups", "Invites"] };
const item = signal("Inbox");`,
    code: `Grid({ columns: "56px 176px minmax(0, 1fr)", gap: 0, style: { height: "100%" } },
  Stack({ gap: 1, align: "center", style: { padding: "12px 0", background: "var(--lucid-surface-sunken)", boxShadow: "inset -1px 0 0 var(--lucid-line)" } },
    [["mail", "mail", "Mail"], ["docs", "layers", "Docs"], ["team", "users", "Team"]].map(([key, icon, label]) =>
      Tooltip({ label, placement: "right" },
        Button({ variant: () => (area.value === key ? "secondary" : "ghost"), size: "sm", icon, aria: { label }, onClick: () => { area.value = key; item.value = AREAS[key][0]; } })))),
  Stack({ gap: 2, style: { padding: "12px 8px", boxShadow: "inset -1px 0 0 var(--lucid-line)" } },
    Text({ size: "xs", tone: "subtle", weight: "medium", style: { padding: "4px 10px" } }, () => area.value.toUpperCase()),
    () => NavList({ value: item, items: AREAS[area.value].map(name => ({ value: name, label: name })) })),
  Stack({ gap: 2, style: { padding: "20px" } },
    Heading({ level: 3 }, item),
    Text({ tone: "muted", size: "sm" }, "Three levels, one signal each.")))`
  },
  {
    id: "page", set: "shells", name: "Page", uses: ["Page"], wide: true,
    summary: "A title, a description and actions, at one of four widths.",
    code: `Page({ title: "Invoices", description: "Everything billed this quarter.", width: "full",
  actions: [Button({ icon: "download" }, "Export"), Button({ variant: "primary", icon: "plus" }, "New invoice")] },
  Card({ variant: "sunken" }, Text({ tone: "muted", size: "sm" }, "Page content")))`
  },
  {
    id: "section", set: "shells", name: "Section & SettingRow", uses: ["Section", "SettingRow", "Switch", "Select"], wide: true,
    summary: "Settings in one card: a label and description on the left, the control on the right.",
    setup: `const digest = signal("weekly");`,
    code: `Section({ title: "Notifications", description: "Choose what reaches you, and when." },
  SettingRow({ label: "Mentions", description: "When someone @mentions you." }, Switch({ checked: true, aria: { label: "Mentions" } })),
  SettingRow({ label: "Digest", description: "A summary of everything else." },
    Select({ value: digest, options: [{ value: "daily", label: "Daily" }, { value: "weekly", label: "Weekly" }, { value: "never", label: "Never" }] })))`
  },
  {
    id: "empty", set: "shells", name: "EmptyState", uses: ["EmptyState"],
    summary: "What a screen says before there's anything in it, with the next step.",
    code: `EmptyState({ icon: "inbox", title: "No messages yet", description: "When someone writes to you, it lands here.",
  action: Button({ size: "sm", variant: "primary", icon: "plus" }, "Start a conversation") })`
  },
  {
    id: "heading", set: "text", name: "Heading", uses: ["Heading"],
    summary: "Six levels, each with a size that suits it. Override the size when the outline needs it.",
    code: `Stack({ gap: 2 },
  Heading({ level: 1 }, "Quarterly review"),
  Heading({ level: 2 }, "Revenue"),
  Heading({ level: 3 }, "By region"),
  Heading({ level: 4 }, "Notes"))`
  },
  {
    id: "text", set: "text", name: "Text", uses: ["Text"],
    summary: "Body copy with tones, sizes, weights, monospace and truncation.",
    code: `Stack({ gap: 2 },
  Text({}, "Default text for reading."),
  Text({ tone: "muted" }, "Muted, for secondary detail."),
  Text({ tone: "subtle", size: "sm" }, "Subtle and small, for captions."),
  Text({ mono: true, size: "sm" }, "INV-2026-0418"),
  Text({ truncate: true, style: { maxWidth: "220px" } }, "A long line that stops politely with an ellipsis"))`
  },
  {
    id: "kbd", set: "text", name: "Kbd", uses: ["Kbd"],
    summary: "Keyboard keys. mod shows ⌘ on a Mac and Ctrl everywhere else.",
    code: `Row({ gap: 4, wrap: true },
  Row({ gap: 2 }, Kbd("mod", "K"), Text({ size: "sm", tone: "muted" }, "Search")),
  Row({ gap: 2 }, Kbd("shift", "enter"), Text({ size: "sm", tone: "muted" }, "New line")),
  Row({ gap: 2 }, Kbd("escape"), Text({ size: "sm", tone: "muted" }, "Close")))`
  },
  {
    id: "button", set: "actions", name: "Button", uses: ["Button"],
    summary: "Five voices, from the one primary action to quiet ghosts and a careful danger.",
    code: `Row({ gap: 2, wrap: true },
  Button({ variant: "primary" }, "Primary"),
  Button({}, "Secondary"),
  Button({ variant: "ghost" }, "Ghost"),
  Button({ variant: "accent" }, "Accent"),
  Button({ variant: "danger" }, "Delete"))`
  },
  {
    id: "button-sizes", set: "actions", name: "Button · sizes & icons", uses: ["Button"],
    summary: "Four sizes, icons on either side, a shortcut hint and a loading state.",
    code: `Stack({ gap: 3 },
  Row({ gap: 2, wrap: true, align: "center" },
    Button({ size: "xs" }, "Extra small"), Button({ size: "sm" }, "Small"), Button({}, "Medium"), Button({ size: "lg" }, "Large")),
  Row({ gap: 2, wrap: true },
    Button({ icon: "plus" }, "New"),
    Button({ iconRight: "arrow-right" }, "Continue"),
    Button({ variant: "primary", kbd: ["mod", "enter"] }, "Send"),
    Button({ loading: true }, "Saving"),
    Button({ icon: "settings", aria: { label: "Settings" } })))`
  },
  {
    id: "tooltip", set: "actions", name: "Tooltip", uses: ["Tooltip", "Button"],
    summary: "A name for an icon, and its shortcut. Shows on hover and on keyboard focus.",
    code: `Row({ gap: 2 },
  Tooltip({ label: "Copy link", kbd: ["mod", "C"] }, Button({ icon: "copy", aria: { label: "Copy link" } })),
  Tooltip({ label: "Star", placement: "bottom" }, Button({ icon: "star", aria: { label: "Star" } })),
  Tooltip({ label: "Share" }, Button({ icon: "share", aria: { label: "Share" } })))`
  },
  {
    id: "menu", set: "actions", name: "Menu", uses: ["Menu", "Button", "toast"],
    summary: "Actions behind a button, with icons, shortcuts, groups and a danger row. Arrow keys move through it.",
    code: `Menu({
  trigger: Button({ iconRight: "chevron-down" }, "Actions"),
  items: [
    { label: "Edit", icon: "pen", kbd: "E", onSelect: () => toast("Editing") },
    { label: "Duplicate", icon: "copy", kbd: ["mod", "D"], onSelect: () => toast("Duplicated") },
    { separator: true },
    { label: "Delete", icon: "trash", danger: true, onSelect: () => toast("Deleted", { tone: "danger" }) }
  ]
})`
  },
  {
    id: "input", set: "inputs", name: "Input", uses: ["Input"],
    summary: "Text entry with an icon, a shortcut hint, three sizes and a ghost variant.",
    code: `Stack({ gap: 3 },
  Input({ placeholder: "Search projects", icon: "search", kbd: "/", aria: { label: "Search projects" } }),
  Input({ placeholder: "you@studio.example", type: "email", icon: "mail", aria: { label: "Email" } }),
  Input({ placeholder: "Untitled", variant: "ghost", aria: { label: "Title" } }))`
  },
  {
    id: "textarea", set: "inputs", name: "Textarea", uses: ["Textarea"],
    summary: "Multi-line text that grows with what's written.",
    code: `Textarea({ rows: 3, placeholder: "Write a note. It grows as you type.", aria: { label: "Note" } })`
  },
  {
    id: "field", set: "inputs", name: "Field & form", uses: ["Field", "Input", "Button", "form", "required", "email", "toast"], wide: true,
    summary: "Labels, hints and errors wired to the control. Errors appear once a field is left or the form is sent.",
    setup: `const invite = form({
  name: { value: "", rules: [required("Enter a name")] },
  email: { value: "", rules: [required("Enter an email"), email()] }
});
const send = invite.submit(values => toast("Invite sent", { tone: "success", description: values.email }));`,
    code: `Stack({ gap: 3, style: { maxWidth: "380px" } },
  Field({ label: "Name", field: invite.fields.name }, Input({ bind: invite.fields.name.value })),
  Field({ label: "Email", hint: "We'll send the invite here.", field: invite.fields.email }, Input({ bind: invite.fields.email.value })),
  Row({ gap: 2 }, Button({ variant: "primary", loading: invite.submitting, onClick: send }, "Send invite"), Button({ variant: "ghost", onClick: () => invite.reset() }, "Reset")))`
  },
  {
    id: "check", set: "inputs", name: "Checkbox & Switch", uses: ["Checkbox", "Switch"],
    summary: "On and off, with the label as part of the target.",
    code: `Stack({ gap: 3 },
  Checkbox({ label: "Email me a weekly summary", checked: true }),
  Checkbox({ label: "Include archived projects" }),
  Switch({ label: "Show completed tasks", checked: true }),
  Switch({ label: "Compact mode" }))`
  },
  {
    id: "segmented", set: "inputs", name: "Segmented", uses: ["Segmented"],
    summary: "One choice from a few, always visible. Text, icons or both.",
    setup: `const range = signal("week");
const layout = signal("grid");`,
    code: `Stack({ gap: 3, align: "flex-start" },
  Segmented({ value: range, aria: { label: "Range" }, options: [{ value: "day", label: "Day" }, { value: "week", label: "Week" }, { value: "month", label: "Month" }] }),
  Segmented({ value: layout, iconOnly: true, aria: { label: "Layout" }, options: [{ value: "grid", label: "Grid", icon: "grid" }, { value: "list", label: "List", icon: "list" }, { value: "board", label: "Board", icon: "board" }] }))`
  },
  {
    id: "select", set: "inputs", name: "Select", uses: ["Select"],
    summary: "A styled picker with icons and hints. Search appears when the list is long.",
    setup: `const owner = signal("ada");`,
    code: `Select({ value: owner, searchable: true, aria: { label: "Owner" }, options: [
  { value: "ada", label: "Ada Brook", icon: "user", hint: "Design" },
  { value: "ben", label: "Ben Okafor", icon: "user", hint: "Engineering" },
  { value: "cleo", label: "Cleo Varga", icon: "user", hint: "Research" },
  { value: "dev", label: "Dev Anand", icon: "user", hint: "Sales" }
] })`
  },
  {
    id: "select-multi", set: "inputs", name: "Select · multiple", uses: ["Select"],
    summary: "Several choices at once, and new ones created from the search.",
    setup: `const tags = signal(["design", "urgent"]);
const known = signal([{ value: "design", label: "Design" }, { value: "urgent", label: "Urgent" }, { value: "research", label: "Research" }, { value: "billing", label: "Billing" }]);`,
    code: `Select({ value: tags, options: known, multiple: true, searchable: true, placeholder: "Add tags", aria: { label: "Tags" },
  onCreate: text => { const value = text.toLowerCase(); known.value = [...known.value, { value, label: text }]; return value; } })`
  },
  {
    id: "datepicker", set: "inputs", name: "DatePicker", uses: ["DatePicker"],
    summary: "A calendar with presets like Tomorrow and Next week. Keyboard friendly, never the native picker.",
    setup: `const due = signal(null);`,
    code: `DatePicker({ value: due, placeholder: "Set a due date", aria: { label: "Due date" } })`
  },
  {
    id: "dialog", set: "overlays", name: "Dialog", uses: ["Dialog", "Button", "Field", "Input", "toast"],
    summary: "A focused task above the page. Focus stays inside, Escape closes it.",
    setup: `const open = signal(false);`,
    code: `Row({},
  Button({ variant: "primary", icon: "plus", onClick: () => { open.value = true; } }, "New project"),
  Dialog({ open, title: "New project", description: "Give it a name. You can change it later.",
    footer: [Button({ variant: "ghost", onClick: () => { open.value = false; } }, "Cancel"),
      Button({ variant: "primary", onClick: () => { open.value = false; toast("Project created", { tone: "success" }); } }, "Create")] },
    Field({ label: "Name" }, Input({ placeholder: "Northwind relaunch" }))))`
  },
  {
    id: "sheet", set: "overlays", name: "Dialog · sheet", uses: ["Dialog", "Button", "Text"],
    summary: "The same dialog sliding in from the side, for details and filters.",
    setup: `const open = signal(false);`,
    code: `Row({},
  Button({ icon: "sliders", onClick: () => { open.value = true; } }, "Filters"),
  Dialog({ open, variant: "sheet", title: "Filters", description: "Narrow the list down." },
    Stack({ gap: 3 }, Switch({ label: "Only mine", checked: true }), Switch({ label: "Include archived" }))))`
  },
  {
    id: "ask", set: "overlays", name: "ask", uses: ["ask", "Button", "toast"],
    summary: "A styled confirmation you await. Resolves true or false.",
    code: `Button({ variant: "danger", icon: "trash", onClick: async () => {
  const yes = await ask({ title: "Delete this project?", description: "Its files and history go with it.", confirm: "Delete", tone: "danger" });
  toast(yes ? "Project deleted" : "Kept it", { tone: yes ? "danger" : "info" });
} }, "Delete project")`
  },
  {
    id: "toast", set: "overlays", name: "toast", uses: ["toast", "Button"],
    summary: "A quiet note in the corner, with a tone and an optional action like Undo.",
    code: `Row({ gap: 2, wrap: true },
  Button({ onClick: () => toast("Saved", { tone: "success", description: "All changes are stored." }) }, "Success"),
  Button({ onClick: () => toast("Card declined", { tone: "danger", description: "Try another payment method." }) }, "Danger"),
  Button({ onClick: () => toast("Archived 3 tasks", { action: { label: "Undo", onClick: () => toast("Restored") } }) }, "With Undo"))`
  },
  {
    id: "command", set: "overlays", name: "CommandMenu", uses: ["CommandMenu", "Button", "toast"],
    summary: "Search everything you can do, grouped, with shortcuts. The ⌘K of your app.",
    setup: `const open = signal(false);`,
    code: `Row({},
  Button({ icon: "command", onClick: () => { open.value = true; } }, "Open command menu"),
  CommandMenu({ open, items: [
    { group: "Go to", label: "Dashboard", icon: "home", run: () => toast("Dashboard") },
    { group: "Go to", label: "Invoices", icon: "table", run: () => toast("Invoices") },
    { group: "Create", label: "New invoice", icon: "plus", kbd: ["mod", "I"], run: () => toast("New invoice") },
    { group: "Create", label: "Invite teammate", icon: "users", run: () => toast("Invite") }
  ] }))`
  },
  {
    id: "avatar", set: "identity", name: "Avatar & AvatarStack", uses: ["Avatar", "AvatarStack"],
    summary: "Initials with a colour derived from the name, so a person always looks the same.",
    code: `Stack({ gap: 3 },
  Row({ gap: 2 }, ["Ada Brook", "Ben Okafor", "Cleo Varga", "Dev Anand"].map(name => Avatar({ name, size: 32 }))),
  AvatarStack({ size: 28 }, ["Eli Moss", "Fay Lund", "Gus Hart", "Hana Ito", "Ivo Kade"].map(name => Avatar({ name, size: 28 }))))`
  },
  {
    id: "badge", set: "identity", name: "Badge", uses: ["Badge"],
    summary: "Short labels and states, with a dot of colour when it helps.",
    code: `Row({ gap: 2, wrap: true },
  Badge({}, "Draft"),
  Badge({ color: "var(--lucid-success)" }, "Paid"),
  Badge({ color: "var(--lucid-warning)" }, "Due soon"),
  Badge({ color: "var(--lucid-danger)" }, "Overdue"),
  Badge({ tone: "accent" }, "New"),
  Badge({ tone: "solid" }, "Pro"))`
  },
  {
    id: "icons", set: "identity", name: "Icon", uses: ["Icon", "iconNames"], wide: true,
    summary: "One set of icons drawn on one grid. Every icon prop in Lucid takes these names.",
    code: `Grid({ min: 132, gap: 1 },
  iconNames.map(name => Stack({ gap: 2, align: "center", style: { padding: "12px 4px" } },
    Icon({ name, size: 18 }),
    Text({ size: "xs", tone: "muted", mono: true }, name))))`
  },
  {
    id: "virtual", set: "state", name: "VirtualList", uses: ["VirtualList", "Avatar", "Badge"], wide: true,
    summary: "Ten thousand rows that scroll like ten. Only what's in view is drawn.",
    setup: `const people = Array.from({ length: 10000 }, (_, i) => ({ id: i + 1, name: ["Ada", "Ben", "Cleo", "Dev", "Eli", "Fay"][i % 6] + " " + ["Brook", "Okafor", "Varga", "Anand", "Moss", "Lund"][(i * 7) % 6], team: ["Design", "Engineering", "Sales"][i % 3] }));`,
    code: `VirtualList({ each: people, key: p => p.id, itemHeight: 44, style: { height: "264px" }, aria: { label: "People" } }, p =>
  Row({ gap: 3, style: { height: "44px", padding: "0 12px", boxShadow: "inset 0 -1px 0 var(--lucid-line)" } },
    Text({ mono: true, size: "xs", tone: "subtle", style: { width: "48px" } }, "#" + p.id),
    Avatar({ name: p.name }),
    Text({ size: "sm", truncate: true, style: { flex: "1" } }, p.name),
    Badge({}, p.team)))`
  },
  {
    id: "history", set: "state", name: "createHistory", uses: ["createHistory", "Button", "Text"],
    summary: "Undo and redo for any state. The alternative to asking “are you sure?”.",
    setup: `const count = signal(0);
const history = createHistory(count);`,
    code: `Row({ gap: 2, wrap: true },
  Button({ icon: "plus", onClick: () => history.change("Add one", () => { count.value += 1; }) }, "Add one"),
  Button({ variant: "ghost", disabled: () => !history.canUndo.value, onClick: () => history.undo() }, "Undo"),
  Button({ variant: "ghost", disabled: () => !history.canRedo.value, onClick: () => history.redo() }, "Redo"),
  Text({ mono: true, weight: "medium" }, () => "count = " + count.value))`
  },
  {
    id: "hotkey", set: "state", name: "hotkey", uses: ["hotkey", "Kbd", "toast"],
    summary: "A keyboard shortcut that's removed with its component, and stays quiet while you type.",
    setup: `hotkey("mod+j", () => toast("Shortcut pressed", { description: "Registered with hotkey(\\"mod+j\\")" }));`,
    code: `Row({ gap: 2 }, Text({ size: "sm", tone: "muted" }, "Press"), Kbd("mod", "J"), Text({ size: "sm", tone: "muted" }, "anywhere on this page"))`
  },
  {
    id: "stattile", set: "charts", name: "StatTile", uses: ["StatTile", "Grid"], wide: true,
    summary: "A key number with its change and a dotted trend. Says whether up is good.",
    code: `Grid({ min: 180, gap: 4 },
  StatTile({ label: "Revenue", value: 48200, unit: "USD", delta: 12, trend: [31, 34, 33, 38, 41, 45, 48] }),
  StatTile({ label: "Active users", value: 1284, delta: 6, trend: [9, 11, 10, 12, 12, 13, 13] }),
  StatTile({ label: "Churn", value: 1.7, unit: "%", delta: -4, upIsGood: false }))`
  },
  {
    id: "sparkline", set: "charts", name: "DotSparkline", uses: ["DotSparkline"],
    summary: "A trail of dots for a trend, the latest one lit.",
    code: `Stack({ gap: 3 },
  DotSparkline({ data: [4, 6, 5, 8, 7, 9, 12, 11, 14, 13, 16, 18], label: "Signups" }),
  DotSparkline({ data: [18, 16, 17, 13, 14, 11, 9, 10, 7, 6, 5, 4], color: "var(--lucid-series-2)", label: "Errors" }))`
  },
  {
    id: "meter", set: "charts", name: "DotMeter", uses: ["DotMeter"],
    summary: "Progress toward a total, counted in dots.",
    code: `Stack({ gap: 3 },
  DotMeter({ value: 72, label: "Storage used" }),
  DotMeter({ value: 9, max: 12, dots: 12, color: "var(--lucid-success)", label: "Tasks done" }))`
  },
  {
    id: "columns", set: "charts", name: "DotColumns", uses: ["DotColumns"], wide: true,
    summary: "Instead of bars: stacks of dots, each standing for a stated number of units.",
    code: `DotColumns({ unit: "orders", height: 200, data: [
  { label: "Mon", value: 12 }, { label: "Tue", value: 18 }, { label: "Wed", value: 15 }, { label: "Thu", value: 22 },
  { label: "Fri", value: 19 }, { label: "Sat", value: 26 }, { label: "Sun", value: 21 }
] })`
  },
  {
    id: "dumbbell", set: "charts", name: "DotDumbbell", uses: ["DotDumbbell"], wide: true,
    summary: "Instead of lines: every series per period, joined by a stem so the spread is the story.",
    code: `DotDumbbell({ labels: ["Jan", "Feb", "Mar", "Apr", "May", "Jun"], series: [
  { name: "Plan", values: [40, 44, 48, 52, 56, 60] },
  { name: "Actual", values: [36, 47, 45, 58, 54, 66] }
] })`
  },
  {
    id: "waffle", set: "charts", name: "Waffle", uses: ["Waffle"],
    summary: "Instead of a pie: a grid where every dot is an equal share.",
    code: `Waffle({ segments: [
  { label: "Organic", value: 52 },
  { label: "Paid", value: 31 },
  { label: "Direct", value: 17, hollow: true }
] })`
  },
  {
    id: "unitrows", set: "charts", name: "UnitRows", uses: ["UnitRows"],
    summary: "Instead of stacked bars: one dot per item, per row. Best for small counts.",
    code: `UnitRows({
  segments: [{ key: "done", label: "Done" }, { key: "doing", label: "Doing" }, { key: "todo", label: "To do" }],
  rows: [
    { label: "Ada", counts: { done: 9, doing: 3, todo: 4 } },
    { label: "Ben", counts: { done: 6, doing: 5, todo: 2 } },
    { label: "Cleo", counts: { done: 11, doing: 1, todo: 3 } }
  ]
})`
  },
  {
    id: "calendar", set: "charts", name: "DotCalendar", uses: ["DotCalendar"], wide: true,
    summary: "Instead of a heatmap: a year of days, size and shade both carrying the value.",
    setup: `const today = new Date().setHours(0, 0, 0, 0);
const days = Array.from({ length: 364 }, (_, i) => ({ date: today - (363 - i) * 86400000, value: Math.max(0, Math.round(4 + 4 * Math.sin(i / 9) + ((i * 37) % 7) - 3)) }));`,
    code: `DotCalendar({ days, unit: "commits", label: "Commits this year" })`
  },
  {
    id: "chartcard", set: "charts", name: "ChartCard", uses: ["ChartCard", "DotColumns"], wide: true,
    summary: "A frame for any chart, with a switch to a table so every value can be read.",
    setup: `const sales = [{ label: "North", value: 42 }, { label: "South", value: 28 }, { label: "East", value: 35 }, { label: "West", value: 19 }];`,
    code: `ChartCard({ title: "Sales by region", subtitle: "Units, last 30 days",
  table: () => ({ columns: ["Region", "Units"], rows: sales.map(s => [s.label, s.value]) }) },
  DotColumns({ data: sales, unit: "units", height: 180 }))`
  },
  {
    id: "dashboard", set: "patterns", name: "Dashboard", uses: ["Page", "Grid", "Segmented", "StatTile", "ChartCard", "DotColumns", "Waffle"], wide: true, tall: true,
    summary: "Stat tiles, a range switch and two charts that follow it.",
    setup: `const range = signal("week");
const DATA = { week: { orders: [12, 18, 15, 22, 19, 26, 21], revenue: 48200, mix: [52, 31, 17] }, month: { orders: [64, 72, 58, 81, 77, 90, 85], revenue: 196400, mix: [47, 36, 17] } };
const d = () => DATA[range.value];`,
    code: `Page({ title: "Overview", description: "How the shop is doing.", width: "full",
  actions: Segmented({ value: range, size: "sm", aria: { label: "Range" }, options: [{ value: "week", label: "Week" }, { value: "month", label: "Month" }] }) },
  Grid({ min: 180, gap: 4 },
    StatTile({ label: "Revenue", value: () => d().revenue, unit: "USD", delta: 12 }),
    StatTile({ label: "Orders", value: () => d().orders.reduce((a, b) => a + b, 0), delta: 6 }),
    StatTile({ label: "Refunds", value: 1.7, unit: "%", delta: -4, upIsGood: false })),
  Grid({ min: 280, gap: 4 },
    ChartCard({ title: "Orders by day" }, DotColumns({ unit: "orders", height: 170, data: () => d().orders.map((value, i) => ({ label: ["M", "T", "W", "T", "F", "S", "S"][i], value })) })),
    ChartCard({ title: "Where orders came from" }, Waffle({ segments: () => [{ label: "Organic", value: d().mix[0] }, { label: "Paid", value: d().mix[1] }, { label: "Direct", value: d().mix[2] }] }))))`
  },
  {
    id: "settings", set: "patterns", name: "Settings page", uses: ["Page", "Section", "SettingRow", "Input", "Switch", "Select", "Button"], wide: true, tall: true,
    summary: "Sections of rows, a danger zone, and controls that line up.",
    setup: `const lang = signal("en");`,
    code: `Page({ title: "Settings", width: "full" },
  Section({ title: "Profile" },
    SettingRow({ label: "Display name" }, Input({ value: "Ada Brook", aria: { label: "Display name" } })),
    SettingRow({ label: "Language" }, Select({ value: lang, options: [{ value: "en", label: "English" }, { value: "fr", label: "Français" }, { value: "de", label: "Deutsch" }] }))),
  Section({ title: "Privacy" },
    SettingRow({ label: "Public profile", description: "Anyone with the link can see it." }, Switch({ checked: true, aria: { label: "Public profile" } }))),
  Section({ title: "Danger zone", tone: "danger" },
    SettingRow({ label: "Delete account", description: "This can't be undone." }, Button({ variant: "danger", size: "sm" }, "Delete"))))`
  },
  {
    id: "split", set: "patterns", name: "Split view", uses: ["Grid", "NavList", "Avatar", "Heading", "Text", "Badge"], wide: true, tall: true, desk: true,
    summary: "A list on the left, the selected item on the right. Mail, tickets, anything.",
    setup: `const TICKETS = [
  { id: "T-1042", title: "Export stalls at 90%", who: "Ada Brook", state: "Open" },
  { id: "T-1041", title: "Invite email lands in spam", who: "Ben Okafor", state: "Waiting" },
  { id: "T-1039", title: "Dark mode on charts", who: "Cleo Varga", state: "Closed" }
];
const pick = signal("T-1042");
const current = () => TICKETS.find(t => t.id === pick.value);`,
    code: `Grid({ columns: "minmax(0, 220px) minmax(0, 1fr)", gap: 0, style: { height: "100%" } },
  Stack({ gap: 1, style: { padding: "10px", boxShadow: "inset -1px 0 0 var(--lucid-line)" } },
    NavList({ value: pick, label: "Tickets", items: TICKETS.map(t => ({ value: t.id, label: t.title })) })),
  Stack({ gap: 3, style: { padding: "20px" } },
    Row({ gap: 2 }, Text({ mono: true, size: "xs", tone: "subtle" }, () => current().id), Badge({ color: "var(--lucid-accent)" }, () => current().state)),
    Heading({ level: 3 }, () => current().title),
    Row({ gap: 2 }, () => Avatar({ name: current().who }), Text({ size: "sm", tone: "muted" }, () => current().who))))`
  },
  {
    id: "list-empty", set: "patterns", name: "List with empty state", uses: ["Page", "Section", "SettingRow", "EmptyState", "Button", "For"], wide: true,
    summary: "A list that knows what to say when it's empty, and adds items back.",
    setup: `let next = 1;
const items = signal([]);
const add = () => { items.value = [...items.value, { id: next, name: "Project " + next++ }]; };`,
    code: `Page({ title: "Projects", width: "full", actions: Row({ gap: 2 },
  Button({ variant: "ghost", disabled: () => !items.value.length, onClick: () => { items.value = []; } }, "Clear"),
  Button({ variant: "primary", icon: "plus", onClick: add }, "New project")) },
  Section({},
    () => items.value.length
      ? For({ each: items, key: item => item.id }, item => SettingRow({ label: item.name, description: "Just now" }, Button({ size: "sm", variant: "ghost" }, "Open")))
      : EmptyState({ icon: "layers", title: "No projects yet", description: "Create one to get started." })))`
  }
];

export function sourceOf(entry) {
  return entry.setup ? `${entry.setup}\n\n${entry.code}` : entry.code;
}

export function appSource(entry, modules) {
  const text = sourceOf(entry);
  const used = name => new RegExp(`(^|[^\\w.])${name}\\b`).test(text);
  const pick = (names, always = []) => [...new Set([...always, ...names.filter(used)])];
  const wraps = entry.set === "patterns" || entry.set === "shells";
  const core = pick(modules.core, ["mount"]);
  const ui = pick(modules.ui, wraps ? [] : ["Page"]);
  const viz = pick(modules.viz);
  const body = wraps ? entry.code : `Page({ title: ${JSON.stringify(entry.name)}, width: "lg" },\n  ${entry.code.replace(/\n/g, "\n  ")})`;
  return [
    `import { ${core.join(", ")} } from "@lucidui-dev/core";`,
    `import { ${ui.join(", ")} } from "@lucidui-dev/core/ui";`,
    viz.length ? `import { ${viz.join(", ")} } from "@lucidui-dev/core/viz";` : null,
    "",
    "function Demo() {",
    ...(entry.setup ? entry.setup.split("\n").map(line => `  ${line}`) : []),
    `  return ${body.replace(/\n/g, "\n  ")};`,
    "}",
    "",
    'mount(Demo, "#app");',
    ""
  ].filter(line => line !== null).join("\n");
}
