export const TEMPLATES = [
  {
    value: "counter",
    label: "Counter",
    icon: "plus",
    note: "Signals, computed values and a button",
    code: `import { signal, computed, h, mount } from "@lucidui/core";
import { Button, Badge, Row, Stack } from "@lucidui/core/ui";

function Counter() {
  const count = signal(0);
  const parity = computed(() => (count.value % 2 ? "odd" : "even"));

  return Stack({ gap: 4, align: "flex-start" },
    h("h1", { class: "demo-title" }, () => count.value),
    Row({ gap: 2 },
      Button({ icon: "plus", variant: "primary", onClick: () => count.value++ }, "Add one"),
      Button({ onClick: () => { count.value = 0; } }, "Reset"),
      Badge(() => parity.value)));
}

mount(Counter, "#app");
console.log("Counter mounted");
`
  },
  {
    value: "form",
    label: "Sign-up form",
    icon: "pen",
    note: "Fields, rules and inline errors",
    code: `import { h, mount } from "@lucidui/core";
import { form, required, email, minLength, Field, Input, Button, Stack, toast } from "@lucidui/core/ui";

function SignUp() {
  const f = form({
    name: { value: "", rules: [required("Tell us your name")] },
    mail: { value: "", rules: [required("Email is required"), email()] },
    pass: { value: "", rules: [minLength(8, "Use at least 8 characters")] }
  });

  const submit = f.submit(values => {
    toast("Welcome aboard", { tone: "success", description: values.mail });
    console.log("Submitted", values);
  });

  return h("form", { class: "demo-card", onSubmit: submit, novalidate: true },
    Stack({ gap: 4 },
      h("h2", { class: "demo-title" }, "Create an account"),
      Field({ label: "Name", field: f.fields.name }, Input({ bind: f.fields.name.value, placeholder: "Ada Lovelace" })),
      Field({ label: "Email", field: f.fields.mail }, Input({ bind: f.fields.mail.value, type: "email", placeholder: "ada@example.com" })),
      Field({ label: "Password", field: f.fields.pass, hint: "8 characters or more" }, Input({ bind: f.fields.pass.value, type: "password" })),
      Button({ type: "submit", variant: "primary" }, "Create account")));
}

mount(SignUp, "#app");
`
  },
  {
    value: "chart",
    label: "Dot chart",
    icon: "chart",
    note: "A live dot chart from the viz kit",
    code: `import { signal, h, mount } from "@lucidui/core";
import { Segmented, Row, Stack } from "@lucidui/core/ui";
import { DotColumns, ChartCard } from "@lucidui/core/viz";

const DATA = {
  week: [4, 9, 14, 11, 6, 3],
  month: [18, 32, 41, 27, 15, 9]
};

function Chart() {
  const range = signal("week");
  const labels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  return Stack({ gap: 4 },
    Row(Segmented({
      value: range,
      size: "sm",
      aria: { label: "Range" },
      options: [{ value: "week", label: "Week" }, { value: "month", label: "Month" }]
    })),
    ChartCard({ title: "Issues closed", subtitle: "By weekday" },
      DotColumns({
        data: () => DATA[range.value].map((value, i) => ({ label: labels[i], value })),
        height: 200,
        unit: "issues",
        label: "Issues closed by weekday"
      })));
}

mount(Chart, "#app");
`
  },
  {
    value: "diagnostics",
    label: "Diagnostics",
    icon: "alert-circle",
    note: "See how Lucid explains mistakes",
    code: `import { signal, h, mount, For } from "@lucidui/core";
import { Button, Stack } from "@lucidui/core/ui";

function Broken() {
  const items = signal([{ id: 1, name: "Alpha" }, { id: 1, name: "Beta" }]);

  return Stack({ gap: 3 },
    h("p", "Lucid reports mistakes with a code and a fix. Check the console below."),
    Button({ icon: "trash" }),
    h("img", { src: "/media/logo/lucidui-icon.svg", width: 32 }),
    h("ul", For({ each: items, key: item => item.id }, item => h("li", item.name))));
}

mount(Broken, "#app");
`
  }
];
