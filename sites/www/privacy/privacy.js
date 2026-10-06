import { tags } from "/lucid/index.js";
import { mountPage } from "/shared/chrome.js";
import { Doc, Part, Contact } from "/shared/doc.js";

const { p, ul, li, b } = tags;

mountPage({
  site: "privacy",
  main: L => Doc({
    eyebrow: "privacy",
    title: "We don't track you.",
    lead: "Lucid UI's websites have no accounts, no cookies, no analytics and no advertising. This page explains the little that does happen when you visit.",
    updated: "2 October 2026"
  },
  Part("What this covers",
    p("This notice covers lucidui.dev and its subdomains: sandbox.lucidui.dev, docs.lucidui.dev, changelog.lucidui.dev and build.lucidui.dev. It does not cover sites you build with Lucid UI, which are yours.")),
  Part("What we collect",
    p(b("Nothing through our code."), " The pages you see are built with Lucid UI and contain no tracking scripts, no analytics, no pixels and no cookies."),
    ul(
      li(b("Server logs. "), "Like every web server, ours records standard request details: IP address, browser, the page or file requested, and the time. These logs are used only to keep the sites running and secure, and are kept for a limited time by our hosting provider."),
      li(b("Your theme choice. "), "If you pick light or dark, that choice is saved in your own browser's local storage. It never leaves your device."),
      li(b("The sandbox. "), "The demo app's issues, people and changes are generated and kept in your browser. Nothing you do there is sent to us, and a refresh starts it over."))),
  Part("Third parties",
    p("Our pages load the Geist typeface from Google Fonts, so your browser contacts Google's servers and Google receives your IP address and browser details. Links to X and other sites take you to services with their own privacy policies.")),
  Part("Email",
    p("If you write to one of our addresses, we use your email address and message only to reply, and we don't add you to any list.")),
  Part("Your choices",
    p("You can block Google Fonts or clear your browser's local storage at any time, and the sites will keep working. Because we hold no account or profile about you, there is nothing for us to export or delete, but you're welcome to ask.")),
  Part("Changes",
    p("If this changes, we'll update this page and the date above. The source of this page is public, so every change is visible.")),
  Part("Questions",
    p("Anything about privacy, licensing or the Lucid UI name goes to the same place."),
    Contact({ email: "legal@lucidui.dev", label: "Legal and privacy" })))
});
