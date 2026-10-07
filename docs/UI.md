# Lucid UI components

Styled, accessible components built on the core runtime. Include the stylesheet and put `lucid-app` on the element that hosts your app. Lucid UI never styles anything outside it.

```html
<link rel="stylesheet" href="node_modules/@lucidui/core/src/ui/lucid.css">
<body class="lucid-app">
```

```js
import { Button, Select, Dialog, toast } from "@lucidui/core/ui";
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
| `CommandMenu` | `open`, `items: [{ group, label, icon, kbd, hint, keywords, searchOnly, run }]` |
| `toast(title, options)` | `description`, `tone` (`success`, `danger`, `info`), `action: { label, onClick }`, `duration` |

Menus, selects and tooltips use the browser's popover layer, so they are never clipped by a scrolling parent. Dialogs use the native modal dialog, so focus is trapped and Escape closes them. Every overlay animates in and out, and respects reduced motion.

## Identity

| Component | Props |
| --- | --- |
| `Avatar` | `name`, `src`, `size`; colour is derived from the name, so a person always looks the same |
| `AvatarStack` | avatars as children |
| `Badge` | `color` (adds a dot), `tone`, `size` |
| `Icon` | `name`, `size`, `stroke`; names are listed in `iconNames` |
| `EmptyState` | `icon`, `title`, `description`, `action` |

## Keyboard

`hotkey("mod+k", handler)` registers a shortcut and removes it when the component is removed. Plain-key shortcuts are ignored while the user is typing or a dialog is open.
