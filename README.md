# Lucid UI

A small, dependency-free UI runtime for the web, built for people and AI agents. Published on npm as `@lucidui-dev/core`. Not related to AppNexus/Xandr's React library `lucid-ui`.

[![npm](https://img.shields.io/npm/v/@lucidui-dev/core?color=111111&label=npm)](https://www.npmjs.com/package/@lucidui-dev/core)

```sh
npm i @lucidui-dev/core
```

```js
import { signal, tags, mount } from "@lucidui-dev/core";

const { button } = tags;

const Counter = () => {
  const count = signal(0);
  return button({ onClick: () => count.value++ }, "Clicked ", count, " times");
};

mount(Counter, "#app");
```

- **Fine-grained.** Components run once. A change updates only what depends on it.
- **Browser-native.** Plain DOM out, plain ES modules in. No build step required.
- **Small.** The whole API fits on [one page](docs/API.md).
- **Self-explaining.** Mistakes come with a stable code and a fix ([diagnostics](docs/DIAGNOSTICS.md)).

**Status:** early and experimental. APIs will change before 1.0.

## Build with your agent, live

[Builder](https://build.lucidui.dev) is a browser workbench for Lucid UI. Connect your coding agent with the [Lucid bridge](integrations/bridge) and it renders straight into Builder, reads every diagnostic and fixes its own mistakes. Full walkthrough: [docs/AGENTS.md](docs/AGENTS.md).

```sh
claude mcp add --scope user lucid -- npx -y @lucidui-dev/bridge
```

## Use it anywhere

Lucid UI also ships as one file, `bundle/lucid.js` (with `bundle/lucid.css`), which exports everything from `@lucidui-dev/core`, `@lucidui-dev/core/ui` and `@lucidui-dev/core/viz`. Drop it into any page that allows a script tag:

```html
<div id="app" class="lucid-app"></div>
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@lucidui-dev/core@0.3/bundle/lucid.css">
<script type="module">
  import { signal, mount, Button } from "https://cdn.jsdelivr.net/npm/@lucidui-dev/core@0.3/bundle/lucid.js";
  const count = signal(0);
  mount(() => Button({ onClick: () => count.value++ }, () => `Clicked ${count.value}`), "#app");
</script>
```

- **WordPress:** the plugin in [integrations/wordpress](integrations/wordpress/lucid-ui/readme.txt) adds a `[lucid app="..."]` shortcode and registers `@lucidui-dev/core`, `@lucidui-dev/core/ui` and `@lucidui-dev/core/viz` as script modules (WordPress 6.5+). Guide: [docs/WORDPRESS.md](docs/WORDPRESS.md).
- **Shopify:** upload `lucid.js` and `lucid.css` to your theme assets and import with `{{ 'lucid.js' | asset_url }}` in a section. Theme storefronts only; checkout does not allow custom scripts.
- **Squarespace:** paste the snippet above into a Code block or Code Injection (plans with custom code).

## Docs

- [API](docs/API.md): the core, on one page
- [Components](docs/UI.md): buttons, inputs, selects, menus, dialogs, command menu, toasts
- [Charts](docs/VIZ.md): Lucid UI's dot-based data visualisation
- [Diagnostics](docs/DIAGNOSTICS.md): every warning and error, with fixes
- [Vision](docs/VISION.md): what Lucid UI is for and where it is going
- [llms.txt](llms.txt): the entry point for AI agents

## Develop

```bash
npm install
npm test
npm run build
```

The repository holds every site Lucid UI runs on:

| Folder | Site |
| --- | --- |
| `sites/www` | lucidui.dev, the marketing site |
| `examples/tracker` and siblings | sandbox.lucidui.dev, the demo apps |

Both pages load Lucid straight from `/lucid/`, unminified. Locally, `tools/dev-router.php` maps `/lucid/` to `src/` (run it with `php -S`), and `npm run build` writes a ready-to-upload folder per site into `dist/`, plus the download zip.

## Maintainers

Lucid UI is maintained by Ezra ([@thisisezra](https://github.com/thisisezra) on GitHub, [@thisisez_](https://x.com/thisisez_) on X). Follow the project at [@lucidui_](https://x.com/lucidui_), or say hello at hello@lucidui.dev.

## License

MIT
