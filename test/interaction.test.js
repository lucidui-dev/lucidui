import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { signal, mount, h } from "../src/index.js";
import {
  form, required, email, minLength, maxLength, createHistory, VirtualList, Field, Input,
  startOfDay, addDays, formatDate, datePresets, hotkey
} from "../src/ui/index.js";

let app;

beforeEach(() => {
  document.body.innerHTML = '<div id="app"></div>';
  app = document.querySelector("#app");
});

test("form validates, hides errors until touched or submitted, and submits values", async () => {
  const f = form({
    email: { value: "", rules: [required("Enter an email"), email()] },
    name: { value: "Ada", rules: [minLength(2), maxLength(5)] }
  });
  assert.equal(f.valid.value, false);
  assert.equal(f.fields.email.error.value, null);
  let sent = null;
  const ok = await f.submit(values => { sent = values; })();
  assert.equal(ok, false);
  assert.equal(sent, null);
  assert.equal(f.fields.email.error.value, "Enter an email");
  f.fields.email.value.value = "ada@example";
  assert.equal(f.fields.email.error.value, "Enter a valid email address");
  f.fields.email.value.value = "ada@example.com";
  assert.equal(f.valid.value, true);
  assert.equal(await f.submit(values => { sent = values; })(), true);
  assert.deepEqual(sent, { email: "ada@example.com", name: "Ada" });
  assert.equal(f.dirty.value, true);
  f.reset();
  assert.equal(f.fields.email.value.value, "");
  assert.equal(f.fields.email.error.value, null);
});

test("rules can read other fields", () => {
  const f = form({
    password: { value: "secret1" },
    confirm: { value: "secret2", rules: [(value, all) => (value !== all.password ? "Passwords do not match" : null)] }
  });
  assert.equal(f.fields.confirm.problem.value, "Passwords do not match");
  f.fields.confirm.value.value = "secret1";
  assert.equal(f.fields.confirm.problem.value, null);
});

test("Field shows a field's error and marks the control invalid", async () => {
  const f = form({ email: { value: "", rules: [required("Enter an email")] } });
  mount(() => Field({ label: "Email", field: f.fields.email }, Input({ bind: f.fields.email.value })), app);
  const input = app.querySelector("input");
  assert.equal(input.getAttribute("aria-invalid"), "false");
  await f.submit(() => {})();
  assert.equal(input.getAttribute("aria-invalid"), "true");
  assert.match(app.querySelector(".lucid-field-error").textContent, /Enter an email/);
  assert.equal(input.getAttribute("aria-describedby"), app.querySelector(".lucid-field-error").id);
  assert.equal(app.querySelector("label").getAttribute("for"), input.id);
});

test("history undoes and redoes changes to a signal", () => {
  const list = signal([1]);
  const history = createHistory(list);
  history.change("Add 2", () => { list.value = [...list.value, 2]; });
  history.change("Add 3", () => { list.value = [...list.value, 3]; });
  history.change("Nothing", () => {});
  assert.equal(history.nextUndo.value, "Add 3");
  assert.equal(history.undo(), "Add 3");
  assert.deepEqual(list.value, [1, 2]);
  assert.equal(history.canRedo.value, true);
  assert.equal(history.redo(), "Add 3");
  assert.deepEqual(list.value, [1, 2, 3]);
  history.undo();
  history.change("Add 4", () => { list.value = [...list.value, 4]; });
  assert.equal(history.canRedo.value, false);
  assert.deepEqual(list.value, [1, 2, 4]);
});

test("VirtualList renders only a window of rows and keeps them keyed", () => {
  const items = signal(Array.from({ length: 1000 }, (_, i) => ({ id: i, name: `Row ${i}` })));
  let builds = 0;
  mount(() => VirtualList({ each: items, key: item => item.id, itemHeight: 40, overscan: 2, style: { height: "200px" } }, item => {
    builds++;
    return h("div", item.name);
  }), app);
  const rows = app.querySelectorAll(".lucid-virtual-row");
  assert.ok(rows.length > 0 && rows.length < 60, `rendered ${rows.length} rows`);
  assert.equal(app.querySelector(".lucid-virtual-inner").style.height, "40000px");
  assert.equal(rows[0].getAttribute("aria-setsize"), "1000");
  const before = builds;
  items.value = [...items.value];
  assert.equal(builds, before);
});

test("date helpers", () => {
  const today = startOfDay(Date.now());
  assert.equal(formatDate(today), "Today");
  assert.equal(formatDate(addDays(today, 1)), "Tomorrow");
  assert.equal(formatDate(addDays(today, -1)), "Yesterday");
  assert.equal(formatDate(null), "");
  assert.equal(new Date(addDays(today, 31)).getHours(), 0);
  const presets = datePresets();
  assert.equal(presets[0].value, today);
  assert.equal((new Date(presets[2].value).getDay() + 6) % 7, 0);
});

test("hotkeys ignore typing in fields unless allowed", () => {
  let hits = 0;
  let anywhere = 0;
  const offA = hotkey("c", () => hits++);
  const offB = hotkey("mod+k", () => anywhere++, { inputs: true });
  const input = document.createElement("input");
  document.body.append(input);
  input.dispatchEvent(new KeyboardEvent("keydown", { key: "c", bubbles: true }));
  document.body.dispatchEvent(new KeyboardEvent("keydown", { key: "c", bubbles: true }));
  input.dispatchEvent(new KeyboardEvent("keydown", { key: "k", ctrlKey: true, metaKey: true, bubbles: true }));
  offA();
  offB();
  assert.equal(hits, 1);
  assert.equal(anywhere, 1);
});
