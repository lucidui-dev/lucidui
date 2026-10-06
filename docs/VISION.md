# Lucid UI Vision

Lucid UI is a free, open-source UI runtime for the web. Interfaces are described by what they are, not assembled from framework plumbing. People should find it elegant, AI agents should find it predictable, and browsers should find its output ordinary.

Lucid UI was developed under the working name AcmeUI. Home: [lucidui.dev](https://lucidui.dev).

## The bet

More and more interface code is written by AI agents. They are trained on React and Tailwind and have never seen Lucid UI. We can't win on training data, so we win on size and clarity:

- **The whole framework fits in the prompt.** The complete API reference ([API.md](API.md)) stays small enough that an agent can read all of it before writing a line. An agent that knows the whole system makes fewer mistakes than one that half-remembers a large one.
- **Mistakes explain themselves.** Every problem has a stable code, a plain message and a concrete fix, delivered as data as well as text. An agent can generate, run, read the diagnostic, repair and run again.
- **Correct by default.** Accessibility checks and sensible defaults live inside the primitives, so the easiest way to write Lucid UI is also the right way.

The same qualities make it pleasant for people. Small, clear and self-explaining is good design for anyone.

## The look

Lucid UI's defaults have to be the reason people try it. The bar is that nothing looks dated, nothing looks like a default, and every detail survives a close look.

- **Monochrome with one sharp accent.** Ink-black or white primary actions, warm neutral surfaces, and a single blue accent kept for focus, selection and data.
- **Materials, not decoration.** Hairline borders, soft layered shadows, a faint top highlight on raised surfaces, and frosted glass only on floating layers like menus.
- **Precise type.** Geist at tight, deliberate sizes, with Geist Mono for IDs and shortcuts.
- **Physical motion.** Springs for things that move, quick fades for things that appear, and nothing that moves without a reason. Reduced motion is respected everywhere.
- **Dots as the data signature.** Charts are built from dots, not bars and lines ([VIZ.md](VIZ.md)). A dot chart is countable, calm and recognisably Lucid UI.
- **Light and dark from the same tokens**, using CSS `light-dark()`, so a theme is one short list.

### Where Lucid UI sits

Headless libraries such as Base UI and Radix get behaviour and accessibility right and leave the look to you. Styled kits give you a look that is the same as everyone else's. Lucid UI ships both halves together: behaviour you can trust, and a design language with a point of view, in a runtime small enough for an agent to learn in one read.

## Principles

1. **Browser-native.** Output is ordinary DOM. No virtual DOM, no proprietary renderer, nothing the browser doesn't already understand.
2. **No dependencies, no build step.** The core is plain ES modules you can load directly in a page. Tooling is always optional.
3. **Small by contract.** The core has a size budget enforced by a test. New features must earn their bytes.
4. **Semantic before decorative.** Primitives say what something is (a stack, a surface, an action) before how it looks.
5. **Accessibility is structural.** It lives in the primitives and their checks, not in a final audit.
6. **Beautiful by default, never trapped.** The defaults should have a recognisable point of view, but everything can be themed. Lucid UI never styles the host page.
7. **Fine-grained updates.** A change updates exactly the text, attribute or list row that depends on it. Components run once.
8. **Constrained first.** Nothing enters the core until a real app needs it.
9. **Free and open.** MIT licensed. No paid tier, no hosted dependency, no lock-in. The name and marks are kept separately from the code.

## Architecture

| Layer | Role | Status |
| --- | --- | --- |
| Reactive core | `signal`, `computed`, `effect`, `batch`, scopes and cleanup | Built (0.1.0) |
| DOM runtime | `h`, `tags`, `mount`, `Show`, `For`, props, events, `bind` | Built (0.1.0) |
| Diagnostics | Coded, machine-readable warnings and errors, including accessibility checks | Built (0.1.0) |
| Components | Layout, type, buttons, inputs, select, menu, tooltip, dialog, sheet, command menu, toast, avatar, badge | Built (0.2.0) |
| Design language | Tokens for space, type, colour, radius, depth and motion; light and dark | Built (0.2.0) |
| Data visualisation | Dot-based charts with tooltips, legends and table views | Built (0.2.0) |
| Interaction depth | Forms and validation, date picker, creatable select, virtual lists, undo and redo | Built (0.3.0) |
| Agent layer | `llms.txt`, API reference, canonical examples, agent benchmark | Started |
| CLI and devtools | Project setup, validation, inspection | Later |
| UI language and compiler | Only if it proves easier than plain function calls for people and agents | Experiment, later |

### Why signals

The update model decides what a UI runtime is. Lucid UI uses fine-grained signals:

- Components run once, so there is no re-render to reason about and no hook rules to learn.
- A change touches only the DOM that depends on it, which is fast without a virtual DOM.
- The model is small enough to explain in a paragraph, which matters for agents.

Computed values only notify their dependents when their result actually changes, so a derived `true` staying `true` does no work downstream.

## Validation

A real app decides which abstractions survive. The plan:

1. Build a separate demo app entirely in Lucid UI, with real forms, lists, state and responsive layout. The app is an issue tracker with an Insights dashboard (`examples/tracker`).
2. Every time the app needs something the system lacks, that is evidence. Add it, or record why not.
3. Track how much custom CSS the app still needs. Less over time means the primitives are working.
4. Give agents the API reference and a set of screens to build. Count diagnostics, failures and repair rounds per release. Regressions block a release.

Later, the agent tests can grow into a public benchmark (UIBench) comparing how well different UI systems let people and agents build the same interfaces.

## Distribution

- **The Lucid UI website**, hosted on our own servers: marketing page, docs, and a download button for the package.
- **npm and a public GitHub repo** as well, because that is where developers and agents look for packages and where contributors arrive. The website stays the home.
- **A single drop-in file** for people who want no tooling at all.

## Community and governance

Lucid UI is MIT licensed and built in the open, so anyone can use it, fork it and contribute. Openness needs a clear way to decide what goes in:

- **Contributions** arrive as pull requests on GitHub (github.com/lucidui-dev/lucidui).
- **Every change** is held to the same bar as the core: the size budget, the test suite, the one-page API reference and the design language.
- **API changes** go through a short written proposal before code, so agents and people can rely on the API staying small and stable.
- **Maintainers** review and merge; how maintainers are chosen, and how decisions are made when people disagree, will be published as a governance document before 1.0.

## Not now

- A giant component catalogue
- A visual drag-and-drop builder
- A hosted platform anything depends on
- Adapters for other frameworks
- A design-token management product
- A compiler before the runtime has proven its primitives

## Roadmap

| Version | Focus |
| --- | --- |
| 0.1 | Reactive core, DOM runtime, diagnostics, agent-sized API reference |
| 0.2 | Design language, components, dot charts, and the issue tracker demo |
| 0.3 | Forms and interaction depth: validation, date picker, creatable select, virtual lists, undo |
| 0.4 | First agent benchmark run against the tracker's screens |
| 0.5 | Website built in Lucid UI; public release on the website, npm and GitHub |
| Before 1.0 | Contribution guide, proposal process and governance document |
| Later | CLI, devtools, UIBench, and the UI-language experiment if it earns its place |
