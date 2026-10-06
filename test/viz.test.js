import { test, beforeEach } from "node:test";
import { setTimeout as wait } from "node:timers/promises";
import assert from "node:assert/strict";
import { mount } from "../src/index.js";
import { DotDumbbell } from "../src/viz/index.js";

let app;

beforeEach(() => {
  document.body.innerHTML = '<div id="app"></div>';
  app = document.querySelector("#app");
  globalThis.ResizeObserver = class {
    constructor(callback) { this.callback = callback; }
    observe() { this.callback([{ contentRect: { width: 600 } }]); }
    disconnect() {}
  };
  globalThis.requestAnimationFrame = run => setTimeout(run, 0);
});

const tipText = hit => {
  hit.dispatchEvent(new PointerEvent("pointermove", { bubbles: true, clientX: 10, clientY: 10 }));
  return document.querySelector(".lucid-viz-tip").textContent;
};

test("DotDumbbell draws every series, stems from min to max, and nets only two", async () => {
  const series = [
    { name: "Opened", color: "red", values: [5, 2] },
    { name: "Closed", color: "blue", values: [9, 4] },
    { name: "Stale", color: "green", values: [1, 7] }
  ];
  mount(() => DotDumbbell({ labels: ["Mon", "Tue"], series }), app);
  await wait(5);
  assert.equal(app.querySelectorAll("circle.lucid-viz-dot").length, 6);
  const stems = [...app.querySelectorAll("line.lucid-viz-stem")];
  assert.equal(stems.length, 2);
  const ys = stems.map(line => [Number(line.getAttribute("y1")), Number(line.getAttribute("y2"))]);
  const dotY = color => [...app.querySelectorAll(`circle[fill="${color}"]`)].map(c => Number(c.getAttribute("cy")));
  assert.deepEqual(ys[0], [dotY("green")[0], dotY("blue")[0]]);
  assert.deepEqual(ys[1], [dotY("red")[1], dotY("green")[1]]);
  const hits = app.querySelectorAll(".lucid-viz-hit");
  assert.equal(hits[0].getAttribute("aria-label"), "Mon: Opened 5, Closed 9, Stale 1");
  const text = tipText(hits[0]);
  for (const name of ["Opened", "Closed", "Stale"]) assert.ok(text.includes(name));
  assert.ok(!text.includes("Net"));
});

test("DotDumbbell keeps the net row for exactly two series", async () => {
  const series = [
    { name: "Opened", color: "red", values: [5] },
    { name: "Closed", color: "blue", values: [9] }
  ];
  mount(() => DotDumbbell({ labels: ["Mon"], series }), app);
  await wait(5);
  assert.ok(tipText(app.querySelector(".lucid-viz-hit")).includes("-4Net opened"));
});
