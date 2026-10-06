import { mount } from "lucidui";

const start = async element => {
  if (element.dataset.lucidMounted) return;
  element.dataset.lucidMounted = "true";
  try {
    const module = await import(element.dataset.lucidApp);
    const App = module.default;
    if (typeof App !== "function") throw new TypeError("The app file must export a component as its default export.");
    const props = JSON.parse(element.dataset.lucidProps || "{}");
    mount(() => App(props), element);
  } catch (error) {
    console.error(`[lucid] Could not start ${element.dataset.lucidApp}`, error);
  }
};

document.querySelectorAll("[data-lucid-app]").forEach(start);
