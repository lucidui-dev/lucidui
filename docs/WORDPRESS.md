# Lucid UI in WordPress

The Lucid UI plugin puts interactive apps anywhere a shortcode works: posts, pages, widgets, the block editor and most page builders. Apps are plain JavaScript files in your theme. There's no build step and no npm, and nothing loads on pages that don't use an app.

Needs WordPress 6.5 or later, for script modules.

## 1. Install the plugin

1. Download `lucid-ui-wordpress-VERSION.zip` from the [latest release](https://github.com/lucidui-dev/lucidui/releases/latest).
2. In WordPress, go to **Plugins → Add New Plugin → Upload Plugin**, choose the zip and select **Install Now**, then **Activate**.
3. Add a **Shortcode** block to any page with `[lucid app="counter"]` and preview it. You should see a counter with two buttons.

The plugin carries its own copy of Lucid UI, so it never depends on a CDN.

## 2. Write your first app

Create a `lucid` folder in your theme, or better, in a child theme so updates don't remove it. Each app is one file whose default export is a component. Save this as `lucid/pricing.js`:

```js
import { signal, h } from "@lucidui-dev/core";
import { Card, Stack, Row, Heading, Text, Segmented, Button } from "@lucidui-dev/core/ui";

export default function Pricing({ plan = "Pro", monthly = "9", currency = "$" }) {
  const period = signal("month");
  const price = () => (period.value === "month" ? Number(monthly) : Number(monthly) * 10);
  return Card({ padding: "lg" },
    Stack({ gap: 4 },
      Row({ justify: "space-between", align: "center" },
        Heading({ level: 3 }, plan),
        Segmented({ value: period, options: [{ value: "month", label: "Monthly" }, { value: "year", label: "Yearly" }] })),
      Heading({ level: 2, size: "3xl" }, () => `${currency}${price()}`),
      Text({ tone: "muted" }, () => (period.value === "year" ? "Billed yearly. Two months free." : "Billed monthly. Cancel anytime.")),
      Button({ variant: "primary", href: "/checkout" }, `Start ${plan}`)));
}
```

Use it on any page:

```text
[lucid app="pricing" plan="Team" monthly="29" currency="€"]
```

Apps can live in subfolders too: `lucid/shop/cart.js` is `[lucid app="shop/cart"]`.

## Props

Every shortcode attribute except `app` and `theme` is passed to your component as a prop.

- Values arrive as strings. Convert them yourself, for example `Number(monthly)` or `featured === "yes"`.
- WordPress lowercases attribute names, so use lowercase prop names: `startdate`, not `startDate`.
- Give every prop a default, so the app still works when an editor leaves one out.

## Light and dark

| Attribute | Result |
| --- | --- |
| `theme="light"` | The default |
| `theme="dark"` | Dark, on its own dark panel |
| `theme="auto"` | Follows the visitor's system setting |

Lucid UI keeps its styles in a low-priority CSS layer, so your theme stays in charge of the page. If your theme styles bare elements such as `button` or `input` heavily, those rules can show through inside an app; see Troubleshooting.

## Use WordPress content

Apps run in the visitor's browser, so they can read anything public from the WordPress REST API. Save this as `lucid/latest.js` to list your latest posts with a live filter:

```js
import { signal, computed, h, For, Show } from "@lucidui-dev/core";
import { Stack, Input, Card, Text } from "@lucidui-dev/core/ui";

const plain = html => new DOMParser().parseFromString(html, "text/html").body.textContent;

export default function Latest({ count = "6" }) {
  const posts = signal(null);
  const query = signal("");
  fetch(`/wp-json/wp/v2/posts?per_page=${Number(count)}&_fields=id,link,title,date`)
    .then(r => r.json())
    .then(list => { posts.value = list; })
    .catch(() => { posts.value = []; });
  const shown = computed(() => (posts.value ?? []).filter(p => plain(p.title.rendered).toLowerCase().includes(query.value.toLowerCase())));
  return Stack({ gap: 3 },
    Input({ bind: query, icon: "search", placeholder: "Filter posts", aria: { label: "Filter posts" } }),
    Show({ when: () => posts.value !== null, fallback: () => Text({ tone: "muted" }, "Loading…") },
      () => For({ each: shown, key: p => p.id }, p =>
        Card({ padding: "sm" },
          h("a", { href: p.link }, plain(p.title.rendered)),
          Text({ tone: "muted", size: "sm" }, new Date(p.date).toLocaleDateString())))));
}
```

```text
[lucid app="latest" count="10"]
```

Reading public data needs no login or nonce. To change data, write a REST route in PHP and check permissions there; never trust the browser.

## Build it in Builder, then bring it home

[Builder](https://build.lucidui.dev) is the fastest place to design an app, by hand or with an AI agent ([Build with an agent](https://docs.lucidui.dev/docs/AGENTS.md)). Builder code ends with a `mount` call. To use it in WordPress:

1. Copy the code into `lucid/your-app.js`.
2. Delete the `mount(...)` line and `mount` from the import.
3. Put `export default` in front of the main component.

In Builder:

```js
function App() { ... }
mount(App, "#app");
```

In WordPress:

```js
export default function App() { ... }
```

When you ask an agent for a WordPress app directly, tell it: "Write a Lucid UI app for the WordPress plugin: one file whose default export is a component, with no mount call."

## Use Lucid UI from your own scripts

The plugin registers `@lucidui-dev/core`, `@lucidui-dev/core/ui` and `@lucidui-dev/core/viz` as script modules, and the stylesheet as `@lucidui-dev/core`. Any theme or plugin script module can depend on them:

```php
add_action('wp_enqueue_scripts', function () {
    wp_enqueue_script_module('my-widget', get_theme_file_uri('js/widget.js'), ['@lucidui-dev/core', '@lucidui-dev/core/ui']);
    wp_enqueue_style('@lucidui-dev/core');
});
```

Inside `widget.js`, import from `@lucidui-dev/core` as usual and call `mount` yourself. Add `class="lucid-app"` to the element you mount into, so it picks up Lucid UI's surface and type.

## Where apps can load from

The shortcode only loads files from three places, in this order:

1. The active theme's `lucid` folder (your child theme)
2. The parent theme's `lucid` folder
3. The plugin's own `apps` folder, which holds the `counter` example

App names may only use letters, numbers, dashes, underscores and slashes, so a post author can't point the shortcode at a script anywhere else. Each file's URL carries its modified time, so browsers and caching plugins pick up your edits straight away.

## Troubleshooting

- **Nothing appears.** Signed-in editors see a note where the app should be, such as `no app called "pricing"`. Check the file name and that it's in the active theme's `lucid` folder. Visitors see nothing.
- **The app is blank but the note doesn't appear.** Open the browser console. `[lucid] Could not start …` is followed by the reason, most often a typo or a missing `export default`.
- **Buttons or inputs look like your theme's.** The theme styles bare elements. Scope those rules to your content, for example `.entry-content button`, or exclude `.lucid-app`.
- **It worked, then stopped after enabling an optimisation plugin.** Some plugins merge or defer scripts and break script modules and import maps. Exclude `lucid.js` and `mount.js` from combining and deferral.
- **WordPress older than 6.5.** Script modules arrived in 6.5. Update WordPress, or use the one-file build from a Custom HTML block, as on any plain page.
- **Page builders.** Elementor, Divi, Beaver Builder and others work with their shortcode widget or module.
- **Apps never use browser dialogs.** Use `toast()` and `await ask()`; Lucid UI reports `alert()`, `confirm()` and `prompt()` with the fix.
