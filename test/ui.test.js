import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { signal, mount, h } from "../src/index.js";
import { Button, Badge, Avatar, Stack, Row, Segmented, Kbd, Checkbox, ask } from "../src/ui/index.js";
import { DotMeter } from "../src/viz/index.js";
import { onDiagnostic } from "../src/diagnostics.js";

let app;

beforeEach(() => {
  document.body.innerHTML = '<div id="app"></div>';
  app = document.querySelector("#app");
});

test("Button renders variant, size and icon", () => {
  const button = Button({ variant: "primary", size: "sm", icon: "plus" }, "New issue");
  assert.equal(button.dataset.variant, "primary");
  assert.equal(button.dataset.size, "sm");
  assert.equal(button.querySelector("svg").getAttribute("class"), "lucid-icon");
  assert.equal(button.textContent, "New issue");
  assert.equal(button.getAttribute("type"), "button");
});

test("icon-only buttons without a label are flagged", () => {
  const found = [];
  const off = onDiagnostic(d => found.push(d.code));
  Button({ icon: "x" });
  Button({ icon: "x", aria: { label: "Close" } });
  off();
  assert.deepEqual(found, ["button-without-name"]);
});

test("layout primitives map gap tokens", () => {
  const stack = Stack({ gap: 4 }, h("p", "a"));
  const row = Row(h("span", "b"));
  assert.equal(stack.style.getPropertyValue("--gap"), "var(--lucid-space-4)");
  assert.equal(row.getAttribute("class"), "lucid-row");
  assert.equal(row.textContent, "b");
});

test("Segmented is a radio group bound to a signal", () => {
  const value = signal("list");
  mount(() => Segmented({ value, aria: { label: "Layout" }, options: [{ value: "list", label: "List" }, { value: "board", label: "Board" }] }), app);
  const [list, board] = app.querySelectorAll("[role=radio]");
  assert.equal(list.getAttribute("aria-checked"), "true");
  board.click();
  assert.equal(value.value, "board");
  assert.equal(board.getAttribute("aria-checked"), "true");
  assert.equal(list.getAttribute("aria-checked"), "false");
});

test("Checkbox binds", () => {
  const done = signal(false);
  mount(() => Checkbox({ bind: done, label: "Done" }), app);
  const input = app.querySelector("input");
  input.checked = true;
  input.dispatchEvent(new Event("change"));
  assert.equal(done.value, true);
});

test("Badge, Avatar and Kbd", () => {
  assert.equal(Badge({ color: "red" }, "Bug").querySelector(".lucid-dot").style.getPropertyValue("--c"), "red");
  assert.equal(Avatar({ name: "Ada Lovelace" }).textContent, "AL");
  assert.ok(Avatar({}).hasAttribute("data-empty"));
  assert.equal(Kbd("shift", "K").querySelectorAll("kbd").length, 2);
});

test("DotMeter fills proportionally", () => {
  const value = signal(50);
  mount(() => DotMeter({ value, max: 100, dots: 10, color: "blue", label: "Progress" }), app);
  const filled = () => [...app.querySelectorAll("circle")].filter(c => c.getAttribute("fill") === "blue").length;
  assert.equal(filled(), 5);
  value.value = 80;
  assert.equal(filled(), 8);
});

test("native controls and browser dialogs are reported", () => {
  const found = [];
  const off = onDiagnostic(d => found.push(d.code));
  h("select", null, h("option", null, "One"));
  h("input", { type: "date" });
  h("input", { type: "text" });
  window.alert("Saved");
  off();
  assert.deepEqual(found, ["native-select", "native-picker", "native-dialog"]);
  assert.match(document.querySelector(".lucid-toaster")?.textContent ?? "", /Saved/);
});

test("ask opens a styled dialog and resolves with the choice", async () => {
  const answer = ask({ title: "Delete workspace?", confirm: "Delete", tone: "danger" });
  const dialog = document.querySelector(".lucid-dialog");
  assert.equal(dialog.querySelector(".lucid-dialog-title").textContent, "Delete workspace?");
  const confirm = [...dialog.querySelectorAll("button")].find(b => b.textContent === "Delete");
  assert.equal(confirm.dataset.variant, "danger");
  confirm.click();
  assert.equal(await answer, true);
});
