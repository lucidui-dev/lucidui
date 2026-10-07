# Diagnostics

Every problem Lucid UI detects has a stable code. Codes never change meaning once released, so people, tests and AI agents can rely on them.

`warn` diagnostics are reported and rendering continues. `error` diagnostics are thrown as a `LucidError` whose `code` matches.

## button-without-name

**warn.** A button has no text, `aria-label`, `aria-labelledby` or `title`, so screen readers announce it as just "button".

Fix: give it visible text, or for an icon-only button pass `aria: { label: "Close" }`.

## img-without-alt

**warn.** An image has no `alt` attribute.

Fix: describe what the image shows with `alt: "..."`. If it is purely decorative, pass `alt: ""` so screen readers skip it.

## click-on-static-element

**warn.** An `onClick` is attached to an element such as a `div` or `span`. Keyboard users cannot reach it and screen readers do not announce it as an action.

Fix: use `button` for actions or `a` for navigation. If you really need a custom element, give it a `role` and a `tabindex` and handle the keyboard yourself.

## native-select

**warn.** A native `select` was used. Its option list is drawn by the browser, so it can't match the rest of the app. Inside a `lucid-app`, browsers that allow it get a styled list as a fallback; others show the plain browser menu.

Fix: use `Select({ value, options })` from the components.

## native-picker

**warn.** An `input` with type `date`, `datetime-local`, `month`, `week`, `time` or `color` was used. Its picker is drawn by the browser.

Fix: use `DatePicker` for dates. For other values, use `Select` or `Input`.

## native-dialog

**warn.** `alert()`, `confirm()` or `prompt()` was called. Lucid UI never shows browser dialogs: `alert()` is turned into a styled toast, and the other two are reported because they block the page.

Fix: use `toast("Saved")` for messages, and `if (await ask({ title: "Delete workspace?", confirm: "Delete", tone: "danger" })) { ... }` for confirmations.

## invalid-event-handler

**error.** An `on...` prop received something other than a function, often a string like `"save()"`.

Fix: pass a function, for example `onClick: () => save()`. `null` and `undefined` are allowed and mean no handler.

## invalid-child

**warn.** A plain object was passed as a child. Only the first argument may be a plain object, and it is read as props.

Fix: pass text, numbers, elements, arrays, signals or functions as children. If you meant props, move them to the first argument.

## duplicate-key

**warn.** `For` received two items that produce the same key. Both rows render, but they cannot be tracked reliably when the list changes.

Fix: make `key` return something unique per item, such as an id.

## effect-cycle

**error.** Effects kept triggering each other and Lucid UI stopped them after 1000 rounds. Usually an effect writes to a signal it also reads.

Fix: read the signal with `untrack()`, derive the value with `computed()` instead, or move the write into an event handler.

## mount-target-missing

**error.** `mount()` could not find the element it was given.

Fix: check the selector, and make sure the script runs after the element exists (`type="module"` scripts already wait for the page to parse).

## cleanup-outside-scope

**warn.** `onCleanup()` was called somewhere that is never removed, so the cleanup would never run.

Fix: call it inside a component rendered by `mount()`, inside an `effect()`, or inside `root()`.
