import { test } from "node:test";
import assert from "node:assert/strict";
import { createElement, StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { act } from "react";
import { signal, h, onCleanup } from "../src/index.js";
import { Lucid } from "../src/react/index.js";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

test("Lucid mounts a Lucid app inside React, stays reactive and cleans up", async () => {
  const host = document.createElement("div");
  document.body.append(host);
  let cleaned = 0;
  const count = signal(0);
  const App = ({ label }) => {
    onCleanup(() => { cleaned++; });
    return h("button", { onClick: () => count.value++ }, label, ": ", count);
  };
  const root = createRoot(host);
  await act(async () => { root.render(createElement(StrictMode, null, createElement(Lucid, { app: App, props: { label: "Clicks" }, className: "card", id: "x" }))); });
  const box = host.querySelector("#x");
  assert.equal(box.className, "lucid-app card");
  assert.equal(box.querySelectorAll("button").length, 1);
  box.querySelector("button").click();
  assert.equal(box.textContent, "Clicks: 1");
  await act(async () => { root.unmount(); });
  assert.equal(host.childNodes.length, 0);
  assert.equal(cleaned, 2);
  host.remove();
});

test("the core bundle never pulls in React", async () => {
  const { bundle } = await import("../tools/bundle.js");
  assert.doesNotMatch(bundle(), /from\s*"react"|createElement\(as/);
});
