# Lucid UI components

Styled, accessible components built on the core runtime. Include the stylesheet and put `lucid-app` on the element that hosts your app. Lucid UI never styles anything outside it.

```html
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@lucidui-dev/core@0.3/bundle/lucid.css">
<body class="lucid-app">
```

```js
import { Button, Select, Dialog, toast } from "@lucidui-dev/core/ui";
```

Every component takes optional props first, then children, the same as `h`.

## Theme

Light and dark are built in and follow the system. Force one with `data-theme="light"` or `data-theme="dark"` on `<html>` or the `lucid-app` element. Every colour, space, radius, shadow and easing is a `--lucid-*` custom property, so a theme is a short list of overrides.

The default typeface is Geist with Geist Mono for code and IDs. Load it yourself, or set `--lucid-font-sans` to your own.

## Layout

| Component | Props |
| --- | --- |
| `Stack` | `gap` (space step 0–16), `align`, `justify`, `as` |
| `Row` | `gap`, `align`, `justify`, `wrap` |
| `Grid` | `min` (column min width, auto-fit), `columns` (fixed count), `gap` |
| `Spacer`, `Divider` | `Divider({ vertical })` |
| `Card` | `padding` (`sm`, `md`, `lg`), `variant` (`raised`, `sunken`) |

## Pages

Build whole screens from these, not from your own CSS. They carry the spacing, type and surfaces, and collapse for phones.

| Component | Props |
| --- | --- |
| `AppShell` | `sidebar` (usually a `NavList`); children are the main area |
| `NavList` | `value` (signal), `items: [{ value, label, icon, badge, href } or { group }]`, `label`, `onSelect` |
| `Page` | `title`, `description`, `actions`, `width` (`sm`, `md`, `lg`, `full`) |
| `Section` | `title`, `description`, `actions`, `id`, `tone: "danger"`; children are rows inside one card |
| `SettingRow` | `label`, `description`; the child is the control (`Switch`, `Select`, `Input`, `Button`) |

See [RECIPES.md](https://docs.lucidui.dev/docs/RECIPES.md) for complete settings, dashboard and list pages.

## Text

| Component | Props |
| --- | --- |
| `Heading` | `level` 1–6, `size` (`xs` to `3xl`) |
| `Text` | `tone` (`muted`, `subtle`), `size`, `weight`, `mono`, `truncate`, `as` |
| `Kbd` | keys as arguments: `Kbd("mod", "K")` shows ⌘K on Mac and Ctrl K elsewhere |

## Actions and inputs

| Component | Props |
| --- | --- |
| `Button` | `variant` (`primary`, `secondary`, `ghost`, `accent`, `danger`), `size` (`xs`, `sm`, `md`, `lg`), `icon`, `iconRight`, `kbd`, `loading` |
| `Input` | `bind`, `icon`, `kbd`, `size`, `variant: "ghost"`, plus any input attribute |
| `Textarea` | `bind`, `rows`, `variant: "ghost"`; grows with its content |
| `Field` | `label`, `hint`, `error` or `field` (from `form`); wires the label, error and ARIA to the control inside it |
| `Checkbox`, `Switch` | `bind` or `checked`, `label` |
| `Segmented` | `value` (signal), `options: [{ value, label, icon }]`, `size`, `iconOnly` |
| `Select` | `value` (signal), `options: [{ value, label, icon, hint, keywords }]`, `multiple`, `searchable`, `placeholder`, `display`, `variant`, `size`, `onChange`, `onCreate` (offers “Create …” for unmatched searches; return the new value) |
| `DatePicker` | `value` (signal of a timestamp or `null`), `presets`, `min`, `max`, `placeholder`, `clearable`, `onChange` |

Never use the browser's own controls or dialogs: no `select`, no date or colour `input`, no `alert()`, `confirm()` or `prompt()`. Use `Select`, `DatePicker`, `Switch`, `toast()` and `await ask()`, so every menu and dialog is styled. Lucid UI reports each native one it sees.

An icon-only `Button` needs `aria: { label }`. Lucid UI reports `button-without-name` if it is missing.

## Forms

`form(spec)` holds a form's values and validation. Each field has a value signal, rules, and an error that appears once the field has been left or the form submitted.

```js
const invite = form({
  email: { value: "", rules: [required("Enter an email"), email()] },
  note: { value: "", rules: [maxLength(280)] }
});

const send = invite.submit(async values => { await api.invite(values); });

Field({ label: "Email", field: invite.fields.email }, Input({ bind: invite.fields.email.value }));
Button({ variant: "primary", loading: invite.submitting, onClick: send }, "Send");
```

- Rules: `required`, `minLength`, `maxLength`, `email`, `pattern`, `min`, `max`, or any `(value, allValues) => message | null`.
- `Field({ field })` shows the error, sets `aria-invalid` and `aria-describedby`, and marks the field touched when focus leaves it.
- `submit(handler)` shows every error, focuses the first invalid field, and only calls `handler` when the form is valid. `submitting`, `valid` and `dirty` are signals; `reset()` starts over.

## Undo

`createHistory(signal)` gives undo and redo for any state kept as immutable values.

```js
const history = createHistory(issues);
history.change("Move WEB-12 to Done", () => { issues.value = moved; });
history.undo();
history.redo();
```

`canUndo`, `canRedo`, `nextUndo` and `nextRedo` are signals, ready for menus and shortcuts. Undo is the alternative to "Are you sure?" prompts: let people act, then let them take it back.

## Long lists

`VirtualList({ each, key, itemHeight }, render)` renders only the rows in view, so a list of tens of thousands stays fast. `itemHeight` can be a number or `(item) => number` for mixed rows like headers. Arrow keys move between rows, and `scrollToIndex(i)` is available on the element.

## Overlays

| Component | Props |
| --- | --- |
| `Menu` | `trigger` (an element), `items: [{ label, icon, kbd, onSelect, checked, danger, disabled } \| { separator: true } \| { group }]` |
| `Tooltip` | `Tooltip({ label, kbd, placement }, trigger)` |
| `Dialog` | `open` (signal or function), `title`, `description`, `footer`, `size`, `variant: "sheet"`, `onClose` |
| `ask` | `await ask({ title, description, confirm, cancel, tone: "danger" })` opens a styled confirmation and resolves `true` or `false` |
| `CommandMenu` | `open`, `items: [{ group, label, icon, kbd, hint, keywords, searchOnly, run }]` |
| `toast(title, options)` | `description`, `tone` (`success`, `danger`, `info`), `action: { label, onClick }`, `duration` |

Menus, selects and tooltips use the browser's popover layer, so they are never clipped by a scrolling parent. Dialogs use the native modal dialog, so focus is trapped and Escape closes them. Every overlay animates in and out, and respects reduced motion.

## Identity

| Component | Props |
| --- | --- |
| `Avatar` | `name`, `src`, `size`; colour is derived from the name, so a person always looks the same |
| `AvatarStack` | avatars as children |
| `Badge` | `color` (adds a dot, such as `"var(--lucid-success)"`), `tone` (`accent`, `solid`), `size` |
| `Icon` | `name`, `size`, `stroke`; see Icons below |
| `EmptyState` | `icon`, `title`, `description`, `action` |

## Keyboard

`hotkey("mod+k", handler)` registers a shortcut and removes it when the component is removed. Plain-key shortcuts are ignored while the user is typing or a dialog is open.

## Icons

Every `icon` prop and `Icon({ name })` takes one of these names. Use only these; an unknown name draws a placeholder and reports `unknown-icon`.

`plus`, `x`, `check`, `chevron-down`, `chevron-right`, `chevron-left`, `chevrons-up-down`, `search`, `filter`, `list`, `board`, `inbox`, `user`, `users`, `layers`, `chart`, `sun`, `moon`, `monitor`, `calendar`, `tag`, `more`, `message`, `clock`, `command`, `table`, `sidebar`, `link`, `trash`, `hash`, `zap`, `target`, `bell`, `pen`, `copy`, `arrow-up`, `arrow-down`, `arrow-right`, `corner-down-left`, `trending-up`, `trending-down`, `hexagon`, `check-circle`, `alert-circle`, `info`, `sliders`, `menu`, `sparkles`, `lock`, `image`, `type`, `download`, `external`, `grip`, `home`, `settings`, `mail`, `star`, `heart`, `eye`, `maximize`, `minimize`

Common words also work: `close`, `add`, `edit`, `delete`, `gear`, `email`, `favorite`, `notification`, `warning`, `success`, `person`, `team`, `chat`, `analytics`, `share` and `grid` map to the icon you'd expect.

