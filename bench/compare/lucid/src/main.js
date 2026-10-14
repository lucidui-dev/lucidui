import "@lucidui-dev/core/ui.css";
import { signal, computed, h, mount, For } from "@lucidui-dev/core";
import { Button, Input, Dialog, Field, Page, Row, Text } from "@lucidui-dev/core/ui";
import { people as seed } from "./people.js";

const people = signal(seed);
const query = signal("");
const name = signal("");
const open = signal(false);
const shown = computed(() => {
  const q = query.value.trim().toLowerCase();
  return q ? people.value.filter(p => p.name.toLowerCase().includes(q)) : people.value;
});
const add = () => {
  if (!name.value.trim()) return;
  people.value = [{ id: Date.now(), name: name.value.trim(), role: "New", city: "Remote" }, ...people.value];
  name.value = "";
  open.value = false;
};

mount(() => Page({ width: "md" },
  Row({ gap: 2 },
    Input({ bind: query, placeholder: "Search people", aria: { label: "Search people" }, style: { flex: 1 } }),
    Button({ variant: "primary", icon: "plus", onClick: () => { open.value = true; } }, "Add")),
  Text({ size: "sm", tone: "muted" }, () => `${shown.value.length} people`),
  h("ul", { class: "people" }, For({ each: shown, key: p => p.id }, p =>
    h("li", h("span", p.name), Text({ tone: "muted", size: "sm" }, `${p.role} · ${p.city}`)))),
  Dialog({ open, title: "Add a person", description: "They join the top of the list.",
    footer: [Button({ variant: "ghost", onClick: () => { open.value = false; } }, "Cancel"), Button({ variant: "primary", onClick: add }, "Save")] },
    Field({ label: "Name" }, Input({ bind: name })))), "#app");
