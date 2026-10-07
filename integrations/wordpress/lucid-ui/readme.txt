=== Lucid UI ===
Contributors: lucidui
Tags: ui, components, javascript, charts, shortcode
Requires at least: 6.5
Tested up to: 6.8
Requires PHP: 7.4
Stable tag: 0.3.0
License: MIT
License URI: https://opensource.org/license/mit

Interactive interfaces with taste, in a few kilobytes. Mount Lucid UI apps anywhere with one shortcode.

== Description ==

Lucid UI is a small, dependency-free UI runtime: signals, components, a UI kit and dot charts. This plugin makes it available to your whole site.

* Add `[lucid app="counter"]` to any post, page or Shortcode block to see it work.
* Write your own apps as plain JavaScript files. No build step, no npm.
* Any script module can import `lucidui`, `lucidui/ui` and `lucidui/viz` by declaring them as dependencies.

== Writing an app ==

1. Create a `lucid` folder in your theme (or child theme).
2. Add a file, for example `lucid/pricing.js`, that exports a component as its default export:

    import { signal, h } from "@lucidui/core";
    import { Button } from "@lucidui/core/ui";

    export default function Pricing({ plan = "pro" }) {
      const yearly = signal(false);
      return h("div",
        Button({ onClick: () => { yearly.value = !yearly.value; } }, () => (yearly.value ? "Yearly" : "Monthly")),
        h("p", () => (yearly.value ? "$90 a year" : "$9 a month")));
    }

3. Use it: `[lucid app="pricing" plan="team"]`

Every attribute other than `app` and `theme` is passed to your component as a prop. WordPress lowercases attribute names, so use lowercase prop names.

Apps are only loaded from the `lucid` folder of the active theme, its parent theme, or this plugin's own `apps` folder, so post authors cannot load scripts from anywhere else.

== Using Lucid UI from your own scripts ==

    wp_enqueue_script_module('my-widget', get_theme_file_uri('js/widget.js'), ['@lucidui/core', '@lucidui/core/ui']);
    wp_enqueue_style('@lucidui/core');

== Themes ==

`theme="light"` (default), `theme="dark"`, or `theme="auto"` to follow the visitor's system setting.

Lucid UI keeps its styles in a low-priority CSS layer so your theme stays in charge. If your theme styles bare elements such as `button` or `input` heavily, those rules can show through inside an app.

== Changelog ==

= 0.3.0 =
* First release: the [lucid] shortcode, script modules for @lucidui/core, @lucidui/core/ui and @lucidui/core/viz, and a counter example.
