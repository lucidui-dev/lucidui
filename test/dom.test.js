import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { signal, computed, h, tags, mount, Show, For, onCleanup } from "../src/index.js";
import { onDiagnostic } from "../src/diagnostics.js";

let app;

beforeEach(() => {
  document.body.innerHTML = '<div id="app"></div>';
  app = document.querySelector("#app");
});

const collect = () => {
  const found = [];
  const off = onDiagnostic(d => found.push(d.code));
  return { found, off };
};

test("h builds elements with props and children", () => {
  const node = h("section", { id: "intro", class: "lead" }, h("p", "Hello ", "world"), 42);
  assert.equal(node.outerHTML, '<section id="intro" class="lead"><p>Hello world</p>42</section>');
});

test("props are optional", () => {
  assert.equal(h("p", "Just text").outerHTML, "<p>Just text</p>");
});

test("tags gives every element as a function", () => {
  const { ul, li } = tags;
  assert.equal(ul(li("a"), li("b")).outerHTML, "<ul><li>a</li><li>b</li></ul>");
});

test("signals as children update the text in place", () => {
  const name = signal("Ada");
  mount(() => h("p", "Hi ", name), app);
  const text = app.querySelector("p");
  assert.equal(text.textContent, "Hi Ada");
  name.value = "Grace";
  assert.equal(text.textContent, "Hi Grace");
});

test("functions as children are reactive expressions", () => {
  const count = signal(2);
  mount(() => h("p", () => count.value * 2), app);
  assert.equal(app.textContent, "4");
  count.value = 5;
  assert.equal(app.textContent, "10");
});

test("reactive attributes, classes and styles", () => {
  const busy = signal(false);
  const width = signal(10);
  mount(() => h("div", {
    class: ["box", { busy }],
    style: { width, "--tone": "dark" },
    aria: { busy },
    hidden: busy
  }), app);
  const box = app.firstElementChild;
  assert.equal(box.getAttribute("class"), "box");
  assert.equal(box.getAttribute("aria-busy"), "false");
  assert.equal(box.hasAttribute("hidden"), false);
  assert.equal(box.style.width, "10px");
  assert.equal(box.style.getPropertyValue("--tone"), "dark");
  busy.value = true;
  width.value = 20;
  assert.equal(box.getAttribute("class"), "box busy");
  assert.equal(box.getAttribute("aria-busy"), "true");
  assert.equal(box.hasAttribute("hidden"), true);
  assert.equal(box.style.width, "20px");
});

test("event handlers", () => {
  const count = signal(0);
  mount(() => h("button", { onClick: () => count.value++ }, "Add ", count), app);
  const button = app.querySelector("button");
  button.click();
  button.click();
  assert.equal(button.textContent, "Add 2");
});

test("bind keeps an input and a signal in sync", () => {
  const name = signal("Ada");
  const agreed = signal(false);
  mount(() => [
    h("input", { bind: name }),
    h("input", { type: "checkbox", bind: agreed })
  ], app);
  const [text, box] = app.querySelectorAll("input");
  assert.equal(text.value, "Ada");
  text.value = "Grace";
  text.dispatchEvent(new Event("input"));
  assert.equal(name.value, "Grace");
  name.value = "Linus";
  assert.equal(text.value, "Linus");
  box.checked = true;
  box.dispatchEvent(new Event("change"));
  assert.equal(agreed.value, true);
});

test("components are plain functions and run once", () => {
  let runs = 0;
  const count = signal(0);
  const Counter = ({ label }) => {
    runs++;
    return h("p", label, ": ", count);
  };
  mount(() => h(Counter, { label: "Clicks" }), app);
  count.value = 3;
  assert.equal(app.textContent, "Clicks: 3");
  assert.equal(runs, 1);
});

test("Show swaps content and disposes the hidden branch", () => {
  const open = signal(false);
  const ticks = signal(0);
  let cleaned = 0;
  const Panel = () => {
    onCleanup(() => cleaned++);
    return h("p", "Panel ", ticks);
  };
  mount(() => h("div", Show({ when: open, fallback: () => h("em", "Closed") }, () => h(Panel))), app);
  assert.equal(app.textContent, "Closed");
  open.value = true;
  assert.equal(app.textContent, "Panel 0");
  ticks.value = 1;
  assert.equal(app.textContent, "Panel 1");
  open.value = false;
  assert.equal(app.textContent, "Closed");
  assert.equal(cleaned, 1);
});

test("Show does not rebuild when truthiness is unchanged", () => {
  const count = signal(1);
  let builds = 0;
  mount(() => h("div", Show({ when: count }, () => { builds++; return h("p", "on"); })), app);
  count.value = 2;
  count.value = 3;
  assert.equal(builds, 1);
});

test("For renders, reorders and removes keyed rows without rebuilding them", () => {
  const items = signal([{ id: 1, name: "a" }, { id: 2, name: "b" }, { id: 3, name: "c" }]);
  let builds = 0;
  mount(() => h("ul", For({ each: items, key: item => item.id }, (item, index) => {
    builds++;
    return h("li", () => index.value, ":", item.name);
  })), app);
  const text = () => [...app.querySelectorAll("li")].map(li => li.textContent).join(" ");
  assert.equal(text(), "0:a 1:b 2:c");
  const first = app.querySelector("li");
  const [a, b, c] = items.value;
  items.value = [c, a, b];
  assert.equal(text(), "0:c 1:a 2:b");
  assert.equal(builds, 3);
  assert.equal(app.querySelectorAll("li")[1], first);
  items.value = [a];
  assert.equal(text(), "0:a");
  items.value = [a, { id: 4, name: "d" }];
  assert.equal(text(), "0:a 1:d");
  assert.equal(builds, 4);
});

test("For rebuilds a row when its item is replaced under the same key", () => {
  const items = signal([{ id: 1, done: false }]);
  mount(() => h("ul", For({ each: items, key: item => item.id }, item => h("li", item.done ? "done" : "open"))), app);
  items.value = [{ id: 1, done: true }];
  assert.equal(app.textContent, "done");
});

test("For handles rows with several nodes and nested reactivity", () => {
  const items = signal(["x", "y"]);
  const suffix = signal("!");
  mount(() => h("div", For({ each: items }, item => [h("b", item), suffix])), app);
  assert.equal(app.textContent, "x!y!");
  items.value = ["y", "x"];
  assert.equal(app.textContent, "y!x!");
  suffix.value = "?";
  assert.equal(app.textContent, "y?x?");
});

test("For warns on duplicate keys and still renders", () => {
  const { found, off } = collect();
  mount(() => h("ul", For({ each: ["a", "a"] }, item => h("li", item))), app);
  off();
  assert.equal(app.querySelectorAll("li").length, 2);
  assert.deepEqual(found, ["duplicate-key"]);
});

test("mount returns a dispose that stops updates and empties the target", () => {
  const count = signal(0);
  let runs = 0;
  const label = computed(() => { runs++; return `n${count.value}`; });
  const dispose = mount(() => h("p", label), app);
  dispose();
  count.value = 1;
  assert.equal(app.innerHTML, "");
  assert.equal(runs, 1);
});

test("mount throws a coded error when the target is missing", () => {
  assert.throws(() => mount(h("p", "x"), "#nowhere"), error => error.code === "mount-target-missing");
});

test("invalid handlers throw a coded error", () => {
  assert.throws(() => h("button", { onClick: "save()" }, "Save"), error => error.code === "invalid-event-handler");
});

test("accessibility diagnostics", () => {
  const { found, off } = collect();
  h("button", {});
  h("button", { aria: { label: "Close" } });
  h("img", { src: "a.png" });
  h("img", { src: "a.png", alt: "" });
  h("div", { onClick: () => {} }, "Fake button");
  off();
  assert.deepEqual(found, ["button-without-name", "img-without-alt", "click-on-static-element"]);
});

test("svg elements get the svg namespace", () => {
  const icon = h("svg", { viewBox: "0 0 10 10" }, h("path", { d: "M0 0L10 10" }));
  assert.equal(icon.namespaceURI, "http://www.w3.org/2000/svg");
  assert.equal(icon.firstChild.namespaceURI, "http://www.w3.org/2000/svg");
});

test("aria-* props keep boolean values as strings", () => {
  const open = signal(false);
  const node = h("button", { "aria-expanded": open, "aria-hidden": true }, "Menu");
  assert.equal(node.getAttribute("aria-expanded"), "false");
  assert.equal(node.getAttribute("aria-hidden"), "true");
  open.value = true;
  assert.equal(node.getAttribute("aria-expanded"), "true");
});
