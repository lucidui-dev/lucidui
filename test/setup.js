import { GlobalRegistrator } from "@happy-dom/global-registrator";

GlobalRegistrator.register();

for (const name of ["showPopover", "hidePopover", "togglePopover"]) {
  if (!HTMLElement.prototype[name]) HTMLElement.prototype[name] = function () {};
}
