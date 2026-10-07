# Lucid UI API

The whole API on one page. This file is also the reference AI agents read, so it stays short on purpose.

```js
import { signal, computed, effect, h, tags, mount, Show, For } from "@lucidui-dev/core";
```

## State

| Call | What it does |
| --- | --- |
| `signal(value)` | A value that can change. Read and write with `.value`. `.peek()` reads without subscribing. `.update(fn)` sets it from the old value. |
| `signal(value, { equals: false })` | Notifies on every write, even the same value. Use it when you mutate an array or object in place. |
| `computed(() => ...)` | A value derived from other signals. Lazy, cached, and only recalculates when something it read changes. |
| `effect(() => ...)` | Runs now and again whenever a signal it read changes. Return a function to clean up before the next run. Returns `stop()`. |
| `batch(() => ...)` | Makes several writes and updates the page once at the end. |
| `untrack(() => ...)` | Reads signals without subscribing to them. |
| `onCleanup(fn)` | Runs `fn` when the current component, effect or root is removed. |
| `root(dispose => ...)` | Starts an independent scope. Calling `dispose()` stops everything created inside it. |

```js
const count = signal(0);
const double = computed(() => count.value * 2);
effect(() => console.log(double.value));
count.value++;
```

## Elements

`h(tag, props?, ...children)` creates an element. Props are optional and always come first, as the only plain object.

```js
h("p", "Hello");
h("a", { href: "/docs" }, "Read the docs");
```

SVG elements get the SVG namespace automatically. Prefix a tag with `svg:` to force it, for example `h("svg:a")`.

`tags` gives every element as a function:

```js
const { section, h2, p, button } = tags;
section(h2("Title"), p("Body"));
```

### Children

| Child | Result |
| --- | --- |
| text, number | text |
| element | inserted as is |
| array | each item, in order |
| signal | text or content that updates in place |
| `() => ...` | a live expression; re-evaluates when signals inside it change |
| `null`, `false`, `true`, `undefined` | nothing |

```js
p("Clicked ", count, " times");
p(() => (count.value > 9 ? "Lots" : "A few"));
```

### Props

| Prop | Example |
| --- | --- |
| attributes | `{ id: "main", disabled: busy }` (any prop can be a signal or function) |
| events | `{ onClick: () => count.value++ }`, `{ onInput: e => ... }` |
| `class` | `"card"`, `["card", "wide"]`, `{ active: isActive }`, or a mix |
| `style` | `{ width: 120, opacity: fade, "--accent": "teal" }` (numbers get `px` where CSS needs a unit) |
| `aria` | `{ label: "Close", expanded: open }` becomes `aria-label`, `aria-expanded` |
| `data` | `{ userId: 7 }` becomes `data-user-id` |
| `bind` | `{ bind: name }` keeps an input, checkbox, radio, select or textarea in sync with a signal |
| `ref` | `{ ref: el => ... }` gets the element after it is created |

## Components

A component is a function that returns elements. It runs once. Signals inside it keep the page up to date.

```js
const Counter = ({ label }) => {
  const count = signal(0);
  return button({ onClick: () => count.value++ }, label, ": ", count);
};

h(Counter, { label: "Clicks" });
```

## Control flow

`Show` renders one branch or the other and fully removes the hidden one. Pass branches as functions so they are only built when shown.

```js
Show({ when: loggedIn, fallback: () => p("Please sign in") }, () => h(Dashboard));
```

`For` renders a list and keeps rows when the list changes. `key` identifies each item; without it, the item itself is the key. `index` is a signal.

```js
ul(For({ each: todos, key: todo => todo.id }, (todo, index) =>
  li(() => index.value + 1, ". ", todo.title)
));
```

Replacing an item with a new object under the same key rebuilds that row only.

## Mounting

```js
const stop = mount(() => h(App), "#app");
stop();
```

`mount(view, target)` takes a component function or an element, and a selector or element. It returns a function that removes everything and stops all updates.

## Components and charts

Styled components live in `@lucidui-dev/core/ui` ([UI.md](UI.md)) and dot-based charts in `@lucidui-dev/core/viz` ([VIZ.md](VIZ.md)).

## Diagnostics

Lucid UI explains mistakes with a stable code, a message and a fix. See [DIAGNOSTICS.md](DIAGNOSTICS.md).

```js
import { onDiagnostic, configure } from "@lucidui-dev/core";

onDiagnostic(d => report(d));
configure({ console: false });
```

Each diagnostic is a plain object: `{ code, level, message, fix, docs, ...context }`. Thrown errors are `LucidError` with the same `code`.
