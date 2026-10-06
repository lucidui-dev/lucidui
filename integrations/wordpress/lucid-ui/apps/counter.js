import { signal, h } from "lucidui";
import { Button, Badge, Row, Stack } from "lucidui/ui";

export default function Counter({ start = 0, label = "Clicks" }) {
  const count = signal(Number(start) || 0);
  return Stack({ gap: 3, align: "flex-start" },
    Row({ gap: 2 },
      h("strong", { style: { fontSize: "28px", fontVariantNumeric: "tabular-nums" } }, () => count.value),
      Badge(label)),
    Row({ gap: 2 },
      Button({ variant: "primary", icon: "plus", onClick: () => count.value++ }, "Add one"),
      Button({ onClick: () => { count.value = Number(start) || 0; } }, "Reset")));
}
