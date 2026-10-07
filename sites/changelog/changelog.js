import { h, version } from "/lucid/index.js";
import { Badge } from "/lucid/ui/index.js";
import { mountPage, SectionHead } from "/shared/chrome.js";

const UPDATES = [
  { date: "7 October 2026", area: "Site", kind: "Improved", title: "A new recording: Claude builds a wind farm dashboard", text: "The homepage video now shows Claude building Vane, a fleet dashboard for 84 turbines, live in Builder: output, charts, a wind rose, alerts with Undo and a site filter, in 47 seconds with new chapters." },
  { date: "7 October 2026", area: "Builder", kind: "New", title: "Full screen, and take your build with you", text: "A full-screen button on the preview shows your build at nearly the whole window (Shift Cmd F). A new Export menu also opens it in its own tab, or downloads it as an index.html that runs anywhere with Lucid UI from the CDN, or as app.js." },
  { date: "7 October 2026", area: "Builder", kind: "Improved", title: "Seven new starter templates", text: "A dashboard, a settings page, a task list with undo, a sign-up form with a success state, dialogs and toasts, a counter with a live trend, and a diagnostics tour where you break things on purpose and flip a switch to apply each fix." },
  { date: "7 October 2026", area: "Site", kind: "New", title: "Watch Claude build live", text: "A new section on the homepage plays a 70-second recording of Claude rethinking the X feed inside Builder, with chapters to jump between moments. The Builder guide and the agent guide link to it." },
  { date: "7 October 2026", area: "Builder", kind: "Fixed", title: "The one-file import works in Builder", text: "Code that imports @lucidui-dev/core/bundle, as the docs suggest for plain pages, now runs in Builder's preview too." },
  { date: "7 October 2026", area: "Site", kind: "New", title: "A guide to building with an agent", text: "One page on connecting Claude Code, Cursor or any MCP agent to Builder: setup, pairing, the render-and-fix loop and troubleshooting, plus the brief for agents without tools." },
  { date: "7 October 2026", area: "Builder", kind: "Fixed", title: "The preview always uses the current Lucid UI", text: "Builder's preview now asks for the exact version of Lucid UI's files, so a browser can't keep an older stylesheet that's missing new components." },
  { date: "7 October 2026", area: "Builder", kind: "New", title: "Connect your coding agent to Builder", text: "Add the Lucid bridge to Claude Code, Cursor or any MCP agent with one command. Your agent renders straight into Builder, gets every error and diagnostic back with its fix, and repairs its own code until the page is clean. It runs on your computer; nothing is uploaded." },
  { date: "7 October 2026", area: "Builder", kind: "Improved", title: "A welcome guide, and a way out", text: "Builder now explains itself on your first visit: three ways to use it and the shortcuts worth knowing, reopenable from the help button. A Leave button takes you back to lucidui.dev, with your draft saved." },
  { date: "6 October 2026", area: "Site", kind: "New", title: "The Lucid UI manifesto", text: "Nine things Lucid UI believes, from small is a feature to never the browser's grey box, and why a designer built it for the community. Read it at lucidui.dev/manifesto." },
  { date: "6 October 2026", area: "Sandbox", kind: "Improved", title: "Orbitry has its own address, and the sandbox opens on the picker", text: "Orbitry now lives at sandbox.lucidui.dev/tracker/ like every other demo, and sandbox.lucidui.dev opens the demo picker." },
  { date: "6 October 2026", area: "Sandbox", kind: "Improved", title: "Every demo has its own layout, and more to explore", text: "Maison is now a storefront with a collection and showroom booking. Race Center reads like a newsroom, with an election-night count. Stride gets workouts, sleep and trends. Dotwave gets a mixer and a pattern library. Headway becomes a control room with lines, alerts and ridership. Celadon adds your trips and live departures, Juniper adds messages, and every side panel now collapses." },
  { date: "6 October 2026", area: "Sandbox", kind: "New", title: "Five demos on the way", text: "Coming to the sandbox: Tally for personal finance, Harbor for shipping, Kiln for deploys, Folio for writing, and Tablekeep for restaurants." },
  { date: "6 October 2026", area: "Site", kind: "New", title: "A 404 page worth getting lost on", text: "Every Lucid UI site now has its own 404: a dot graph gets chomped away until only the error is left, with links to the site, the Builder, the sandbox, the docs and the changelog." },
  { date: "6 October 2026", area: "Site", kind: "New", title: "Start in 60 seconds, and answers to common questions", text: "The docs open with a copy-and-open HTML file, a real screen built from components, and the agent brief. A questions section covers licensing, browsers, agents, theming and how this Lucid UI differs from AppNexus's lucid-ui." },
  { date: "6 October 2026", area: "Site", kind: "New", title: "Works with every coding agent", text: "The homepage now lists 27 coding agents that can build with Lucid UI, from Claude Code and Cursor to Qwen Code and DeepSeek, and any agent that can read a web page." },
  { date: "6 October 2026", area: "Site", kind: "New", title: "Downloads are open, and the docs are public", text: "Download Lucid UI and the WordPress plugin from every site, read the full guides on docs.lucidui.dev, and copy a one-line brief from the homepage to point your AI agent at llms.txt." },
  { date: "6 October 2026", area: "Library", kind: "New", title: "Lucid UI is on npm", text: "Install it with npm i @lucidui-dev/core. The package includes the source modules, the one-file bundle and the docs." },
  { date: "6 October 2026", area: "Site", kind: "New", title: "New logo, icons and press page", text: "A new navy icon and wordmark across every site, sandbox demo and the Builder, with fresh favicons, app icons and a share image. The press page lists every file and size, and the hero dots now glow a quieter grey." },
  { date: "6 October 2026", area: "Site", kind: "Improved", title: "A new palette: obsidian and champagne", text: "The burgundy and tangerine are gone. Every site, the sandbox picker and the Builder now use deep obsidian with a soft champagne accent, and the decorative dot backgrounds have been removed for a calmer page." },
  { date: "6 October 2026", area: "Site", kind: "Improved", title: "One home for the brand: media.lucidui.dev", text: "Logos, icons and the press kit now live in one place, used by every Lucid UI site and sandbox demo instead of a copy in each." },
  { date: "6 October 2026", area: "Site", kind: "Improved", title: "Meet the maintainer", text: "The footer credits Ezra with links to GitHub and X, and the repository lists its maintainer and code owner." },
  { date: "6 October 2026", area: "Site", kind: "New", title: "Lucid UI is on GitHub", text: "The source now lives at github.com/lucidui-dev/lucidui, with tests and a full build running on every push. Social links point to @lucidui_ on X and u/lucidui_ on Reddit." },
  { date: "3 October 2026", area: "Sandbox", kind: "New", title: "Demo: Juniper Clinic", text: "A calm clinic console in a new layout: icon rail, list sidebar, tabs, detail panel and status bar. Three screens: today's queue and rooms, a clinician day planner, and patient charts with vitals and labs." },
  { date: "3 October 2026", area: "Sandbox", kind: "Improved", title: "Leaving a demo returns you to the picker", text: "Every demo's Leave the sandbox button now lands on the sandbox picker with the demo you just left highlighted, and the picker has its own Exit sandbox button." },
  { date: "3 October 2026", area: "Sandbox", kind: "New", title: "Demo: Maison sofa configurator", text: "A furniture store's product page: size, fabric and legs redraw the sofa live, the price follows, and a cart sheet holds the sofa and free swatches." },
  { date: "3 October 2026", area: "Sandbox", kind: "Improved", title: "A new way to pick a demo", text: "The sandbox picker shows the highlighted demo on the left and every demo in a searchable, filterable list on the right. Arrow keys browse, Enter opens." },
  { date: "3 October 2026", area: "Sandbox", kind: "Improved", title: "The playground is now the sandbox", text: "Same demos, clearer name, new home at sandbox.lucidui.dev." },
  { date: "3 October 2026", area: "Site", kind: "Improved", title: "The Case for Lucid in the footer", text: "The footer now links to The Case for Lucid by name." },
  { date: "3 October 2026", area: "Sandbox", kind: "New", title: "Demo: Dotwave step sequencer", text: "Sixteen steps, six instruments synthesised live with the Web Audio API, swing, presets, mute and solo, and a dot visualiser that dances to the sound." },
  { date: "3 October 2026", area: "Site", kind: "New", title: "Find us on Reddit and Discord", text: "Reddit and Discord join X, GitHub and npm in the footer and the command menu, and the footer credits the maintainer." },
  { date: "3 October 2026", area: "Site", kind: "Improved", title: "A cleaner changelog and a shorter menu", text: "Updates are grouped by day, matching the release notes below them. Press and Changelog moved out of the top menu and live in the footer." },
  { date: "3 October 2026", area: "Site", kind: "Fixed", title: "Pages never mix old and new files", text: "Every release now stamps its stylesheets and scripts with the version, so browsers and servers can't serve a stale stylesheet against new code." },
  { date: "3 October 2026", area: "Sandbox", kind: "New", title: "Demo: Stride fitness tracker", text: "Activity rings, steps, heart rate and 12 weeks of training, all in dots. Sync a watch and a 3D watch spins into view beside live readouts, then hands its data to today." },
  { date: "3 October 2026", area: "Sandbox", kind: "Improved", title: "Headway: a clear way out of a zoomed station", text: "A Zoom out button sits in the map's corner whenever you're zoomed in, next to Recenter. Esc still works." },
  { date: "3 October 2026", area: "Sandbox", kind: "Fixed", title: "Headway: crisp lines and labels when zoomed", text: "The zoom and the tilt are now drawn as part of the map itself, instead of enlarging and tilting a picture of it, so text and lines stay sharp at any zoom." },
  { date: "3 October 2026", area: "Sandbox", kind: "New", title: "Headway: drag the map", text: "Grab and pan, zoomed out or zoomed in. A drag never counts as a click on a station." },
  { date: "3 October 2026", area: "Sandbox", kind: "New", title: "Headway: zoom into a station", text: "Click a station and the map glides in with a gentle tilt. Only the lines through it stay lit, and every station on them is labelled." },
  { date: "3 October 2026", area: "Sandbox", kind: "Improved", title: "Flight check-in: the seat map fits on one screen", text: "The cabin is drawn sideways like a fuselage seen from above, so choosing seats needs no scrolling." },
  { date: "3 October 2026", area: "Sandbox", kind: "New", title: "Flight check-in: the plane flies the route", text: "A small plane eases from Incheon to Los Angeles along the route arc, banking with the curve, and loops." },
  { date: "3 October 2026", area: "Library", kind: "Fixed", title: "Closed tooltips are fully hidden", text: "A closed tooltip stayed rendered but invisible, which could widen the page on phones. It's now removed until it opens, and still animates in and out." },
  { date: "3 October 2026", area: "Library", kind: "Improved", title: "DotDumbbell takes any number of series", text: "It used to draw nothing, with no warning, unless given exactly two. Now every series is drawn, joined by a stem from lowest to highest." },
  { date: "3 October 2026", area: "Sandbox", kind: "New", title: "Demo: Flight check-in", text: "A calm check-in concierge for a fictional airline, Celadon Air: seats, bags, a boarding pass, and a rail that collapses to icons." },
  { date: "3 October 2026", area: "Sandbox", kind: "New", title: "Demo: Race Center", text: "A fictional newsroom's campaign tracker, custom-branded through Lucid's tokens: polls, a forecast slider and a county dot map." },
  { date: "2 October 2026", area: "Sandbox", kind: "New", title: "Demo: Headway transit control", text: "A live subway service desk on Toronto's map: moving trains, platform crowding and service alerts, drawn in dots." },
  { date: "2 October 2026", area: "Sandbox", kind: "New", title: "Pick a demo, and leave when you like", text: "lucidui.dev opens a demo picker. Every demo has its own Leave the sandbox button, with a two-step confirm." },
  { date: "2 October 2026", area: "Builder", kind: "New", title: "Lucid UI Builder, preview", text: "Write Lucid in the browser at build.lucidui.dev and watch it run, with a console that explains every diagnostic." },
  { date: "2 October 2026", area: "Library", kind: "New", title: "One file, works anywhere", text: "lucidui/bundle is the whole library in a single module, for pages without a bundler, including Shopify themes and Squarespace." },
  { date: "2 October 2026", area: "Library", kind: "Fixed", title: "Menus near the right edge open in view", text: "Popovers now position themselves again once visible, so right-aligned menus no longer open off-screen." },
  { date: "2 October 2026", area: "Site", kind: "New", title: "The Case for Lucid", text: "How Lucid UI compares with React, Tailwind CSS, shadcn/ui, Svelte and plain HTML and CSS, including where it loses." },
  { date: "2 October 2026", area: "Site", kind: "New", title: "Press kit", text: "Logos, colours and the Rubik wordmark type at lucidui.dev/press." }
];

const RELEASES = [
  {
    version: "0.3.5",
    date: "7 October 2026",
    title: "Icons agents can guess",
    summary: "Watching an agent build in Builder showed it reaching for icons that didn't exist. Now the common ones do, and the rest explain themselves.",
    items: [
      ["New", "Six icons agents reach for: home, settings, mail, star, heart and eye."],
      ["New", "Common words map to the right icon: close, add, edit, delete, gear, email and more."],
      ["New", "An unknown icon name reports unknown-icon with the fix, instead of quietly drawing a placeholder."],
      ["Improved", "Every icon name is listed in the component guide."]
    ]
  },
  {
    version: "0.3.4",
    date: "6 October 2026",
    title: "Agents always find the right Lucid",
    summary: "Another, unrelated project is also called Lucid UI. Agents that searched the web could land on it and write the wrong code. Now every path leads here.",
    items: [
      ["Improved", "The agent brief names the exact package, gives a mirror link, tells the agent not to search the web, and to ask rather than guess."],
      ["Improved", "llms.txt, the API reference and the README say plainly which project this is and how to tell the other one apart."],
      ["New", "llms-full.txt ships in the npm package and the GitHub repository, so it can be read from jsDelivr or GitHub when lucidui.dev can't be reached."]
    ]
  },
  {
    version: "0.3.3",
    date: "6 October 2026",
    title: "Whole pages, crafted by default",
    summary: "Ask an agent for a settings page and get a finished one. Lucid now ships the building blocks for whole screens, and recipes agents start from.",
    items: [
      ["New", "AppShell, NavList, Page, Section and SettingRow: sidebars, page headers, grouped cards and label-and-control rows, in light and dark, and collapsing for phones."],
      ["New", "Recipes: complete settings, dashboard and list pages, built only from Lucid components, in the docs and in llms-full.txt."],
      ["Improved", "The rules agents read now say to build from components, write no CSS for colours or type, and mount once."]
    ]
  },
  {
    version: "0.3.2",
    date: "6 October 2026",
    title: "No browser dialogs, ever",
    summary: "Every menu and dialog in a Lucid UI app is styled, even when an AI agent reaches for the browser's own.",
    items: [
      ["New", "ask() opens a styled confirmation and resolves true or false: if (await ask({ title, confirm, tone: \"danger\" })) { ... }"],
      ["New", "alert() shows a styled toast instead of a browser dialog, and alert, confirm and prompt are reported with the fix."],
      ["New", "Diagnostics for native selects and date, time and colour pickers, each pointing to the Lucid component to use."],
      ["Improved", "A plain select inside a Lucid UI app gets a styled menu in browsers that support it."],
      ["Fixed", "Dialogs with no body content no longer leave a gap above the buttons."]
    ]
  },
  {
    version: "0.3.1",
    date: "6 October 2026",
    title: "Friendlier charts for people and agents",
    summary: "We asked AI agents to build a dashboard from the docs alone and fixed everything they tripped on.",
    items: [
      ["Improved", "Series and segments without a colour now take the next colour of the palette instead of rendering black."],
      ["Improved", "StatTile accepts a delta written as text, such as \"+15%\", as well as a number."],
      ["Fixed", "DotColumns no longer crashes when unit is given as a number."],
      ["Improved", "The docs show how to start in a plain HTML page from a CDN, and spell out every chart prop's type."]
    ]
  },
  {
    version: "0.3.0",
    date: "2 October 2026",
    title: "Forms, dates, undo and virtual lists",
    summary: "The interaction layer. Everything you need to build real forms and long, fast lists, and to let people take things back instead of confirming them first.",
    items: [
      ["New", "form() with rules for required, length, email, pattern and number ranges, plus your own. Errors appear once a field is left or the form is submitted."],
      ["New", "DatePicker with quick picks, a full-keyboard calendar, min and max dates, and a sliding month transition."],
      ["New", "Select can create options: unmatched searches offer “Create …”."],
      ["New", "VirtualList renders only the rows in view, with fixed or per-row heights."],
      ["New", "createHistory() adds undo and redo to any signal."],
      ["Improved", "Dialogs focus their first field on open. Shortcuts leave text fields alone, so ⌘Z keeps undoing your typing."],
      ["Improved", "Text colours follow a clear hierarchy: navy headings, slate body copy, lighter labels on data."],
      ["Fixed", "Segmented controls sit exactly 3px from every edge, measured, in every state."]
    ]
  },
  {
    version: "0.2.0",
    date: "2 October 2026",
    title: "The design language, components and dot charts",
    summary: "The look arrives: one set of tokens for light and dark, a full set of components, and charts drawn entirely with dots.",
    items: [
      ["New", "Design tokens on CSS light-dark(), scoped to .lucid-app so Lucid never styles the page around it."],
      ["New", "Components: layout, type, buttons, inputs, select, menu, tooltip, dialog and sheet, command menu, toasts, avatars and badges."],
      ["New", "Charts made of dots: columns, dumbbells, waffles, unit rows, calendars, sparklines and stat tiles, each with a table view."],
      ["New", "The sandbox: an issue tracker with list and board views, drag and drop, and an Insights dashboard."],
      ["Fixed", "aria-* attributes keep their true and false values."]
    ]
  },
  {
    version: "0.1.0",
    date: "2 October 2026",
    title: "The runtime",
    summary: "Fine-grained signals and a tiny DOM runtime, built so an AI agent can learn the whole thing in one read.",
    items: [
      ["New", "signal, computed, effect, batch and untrack, with cleanup scopes."],
      ["New", "h, tags, mount, Show and For. Components run once, and only what changed is touched."],
      ["New", "Diagnostics with stable codes and fixes, delivered as data, including accessibility checks."],
      ["New", "A size budget enforced by tests, and an API reference kept short enough for an agent's context."]
    ]
  }
];

const tone = { New: "accent", Improved: "solid", Fixed: undefined };

const DAYS = UPDATES.reduce((days, update) => {
  const last = days[days.length - 1];
  if (last && last.date === update.date) last.items.push(update);
  else days.push({ date: update.date, items: [update] });
  return days;
}, []);

mountPage({
  site: "changelog",
  main: () => h("div", { class: "site-wrap changelog" },
    SectionHead({
      eyebrow: "changelog",
      title: "What's new in Lucid UI.",
      lead: `Every release, what changed and why. The current version is ${version}.`,
      level: 1
    }),
    h("section", { class: "updates", aria: { label: "Latest updates" } },
      h("header", { class: "updates-head" },
        h("h2", { class: "updates-title" }, "Latest updates"),
        h("p", { class: "updates-lead" }, "Every change as it lands, newest first. Library changes roll into the next numbered release.")),
      h("ol", { class: "update-days" }, DAYS.map(day => h("li", { class: "update-day" },
        h("div", { class: "update-day-meta" },
          h("time", { class: "update-day-date" }, day.date),
          h("span", { class: "update-day-count" }, `${day.items.length} ${day.items.length === 1 ? "change" : "changes"}`)),
        h("ul", { class: "update-items" }, day.items.map(u => h("li", { class: "update-item" },
          h("div", { class: "update-tags" }, Badge({ tone: tone[u.kind], size: "sm" }, u.kind), h("span", { class: "update-area" }, u.area)),
          h("h3", { class: "update-title" }, u.title),
          h("p", { class: "update-text" }, u.text)))))))),
    h("h2", { class: "updates-title releases-title" }, "Releases"),
    h("ol", { class: "releases" },
      RELEASES.map(release => h("li", { class: "release", id: `v${release.version}` },
        h("div", { class: "release-meta" },
          h("a", { class: "release-version", href: `#v${release.version}` }, `v${release.version}`),
          h("time", release.date)),
        h("div", { class: "release-body" },
          h("h2", { class: "release-title" }, release.title),
          h("p", { class: "release-summary" }, release.summary),
          h("ul", { class: "release-items" },
            release.items.map(([kind, text]) => h("li",
              Badge({ tone: tone[kind], size: "sm" }, kind),
              h("span", text)))))))))
});
