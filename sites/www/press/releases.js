export const RELEASES = [
  {
    slug: "2026-11-launch",
    date: "2026-11-12",
    pdf: "lucidui-press-release-2026-11.pdf",
    kicker: "Press release",
    immediate: "For immediate release",
    place: "TORONTO, ON",
    headline: "The UI layer your AI agent can learn in one read",
    sub: "Lucid UI is a free, open-source UI runtime for the web, built for coding agents. Its whole API reference is about 1,140 tokens, its core is 6.2 KB with no dependencies, and every mistake comes back with a code and a fix.",
    lead: "Lucid UI today launched a free, open-source UI runtime built for the way software is now written: largely by AI coding agents. Its complete API reference is about 1,140 tokens, small enough for an agent to read before it writes a line. Its components and charts come finished, and its 6.2 KB core needs no dependencies and no build step.",
    body: [
      "AI agents now write a large share of new interfaces, usually on a stack of many parts held together by a build. Lucid UI measured that cost in public. It built the same app twice: once with React 19, Tailwind CSS 4 and shadcn/ui, and once with Lucid UI, using the same Vite build. The first runs on 33 packages and ships 94.4 KB; the Lucid UI version runs on one and ships 18.5 KB. The code in the project went from 181 lines in 8 files to 30 lines in one.",
      "Lucid UI is a handful of readable JavaScript modules. Signals update exactly what changed, and a full set of components is designed together and wired for keyboards and screen readers. Dot-based charts come built in. It runs from a single script tag, from npm, or inside React and Next.js with one component, so app builders such as v0, Lovable and Bolt can use it too. A WordPress plugin, and snippets for Shopify and Squarespace, cover existing sites. The docs come as one file an agent can read whole, with a brief written for 27 coding agents.",
      "When an agent gets something wrong, Lucid UI says so in words it can act on: each of its 14 diagnostics has a stable code, a plain message and the fix. Builder, Lucid UI's free in-browser workbench, takes that further. Through the Lucid bridge, an agent connected over the Model Context Protocol renders straight into Builder, reads every diagnostic, and repairs its own work."
    ],
    quote: "Much of the interface code written today comes from an AI agent, and an agent is only as good as what it can hold in its head. I wanted a UI layer it could learn in one read, that tells it exactly what went wrong and how to fix it, and that still looks finished when it's done.",
    quoteBy: "Ezra, who designed and built Lucid UI",
    availabilityTitle: "Availability",
    availability: "Lucid UI is available today, free under the MIT license. It's on npm as @lucidui-dev/core and on the jsDelivr CDN, with the source at github.com/lucidui-dev/lucidui. Builder, the docs and a sandbox of live demo apps are free at lucidui.dev, with no account. The Lucid bridge for MCP-capable agents is on npm as @lucidui-dev/bridge. Lucid Editions, eight finished apps built only with Lucid UI, can be previewed at editions.lucidui.dev.",
    factsTitle: "At a glance",
    facts: [
      ["What", "A free, open-source UI runtime for the web: signals, components and charts"],
      ["Core", "6.2 KB gzipped, no dependencies"],
      ["Everything", "About 38 KB with every component, chart and style"],
      ["API reference", "About 1,140 tokens"],
      ["Components", "54 live examples in 10 sets"],
      ["Works with", "Any web page, React and Next.js, WordPress, Shopify, Squarespace"],
      ["For agents", "A brief for 27 coding agents, plus MCP through the Lucid bridge"],
      ["License", "MIT · version 0.3.11, an early release"],
      ["Try it", "build.lucidui.dev, no account"],
      ["Based in", "Toronto, ON, Canada"]
    ],
    aboutTitle: "About Lucid UI",
    about: "Lucid UI is a free, open-source UI runtime for the web, built for people and the AI agents that now write much of their code. It pairs fine-grained signals with finished, accessible components and built-in charts in a few kilobytes with no build step, and it is based in Toronto, ON.",
    contactTitle: "Media contact",
    contact: "press@lucidui.dev · lucidui.dev/press",
    weighIn: {
      title: "Same app, two stacks",
      note: "One dot per kilobyte shipped, gzipped. Measured on 13 October 2026; the benchmark is in the Lucid UI repository.",
      rows: [
        { label: "React + Tailwind + shadcn/ui", kb: 94.4, packages: 33 },
        { label: "Lucid UI", kb: 18.5, packages: 1, lucid: true }
      ]
    }
  }
];

export const CODE = /@lucidui-dev\/core|@lucidui-dev\/bridge/g;

export const releaseFor = slug => RELEASES.find(r => r.slug === slug);

export const releaseDate = iso => new Intl.DateTimeFormat("en-US", { dateStyle: "long", timeZone: "UTC" }).format(new Date(`${iso}T12:00:00Z`));

export const releasePath = r => `/press/${r.slug}/`;

export function releaseText(r) {
  return [
    r.immediate.toUpperCase(),
    "",
    r.headline,
    "",
    r.sub,
    "",
    `${r.place}, ${releaseDate(r.date)}. ${r.lead}`,
    "",
    ...r.body.flatMap(p => [p, ""]),
    `“${r.quote}”`,
    `${r.quoteBy}`,
    "",
    r.availabilityTitle.toUpperCase(),
    r.availability,
    "",
    r.factsTitle.toUpperCase(),
    ...r.facts.map(([a, b]) => `${a}: ${b}`),
    "",
    "-".repeat(60),
    r.aboutTitle.toUpperCase(),
    r.about,
    "",
    r.contactTitle.toUpperCase(),
    r.contact,
    "",
    "###",
    ""
  ].join("\n");
}
