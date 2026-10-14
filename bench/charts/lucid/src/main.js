import "@lucidui-dev/core/ui.css";
import { mount } from "@lucidui-dev/core";
import { ChartCard, DotColumns } from "@lucidui-dev/core/viz";

const orders = [
  { label: "Mon", value: 12 },
  { label: "Tue", value: 18 },
  { label: "Wed", value: 15 },
  { label: "Thu", value: 22 },
  { label: "Fri", value: 19 },
  { label: "Sat", value: 26 },
  { label: "Sun", value: 21 }
];

mount(() => ChartCard({ title: "Orders by day", table: () => ({ columns: ["Day", "Orders"], rows: orders.map(o => [o.label, o.value]) }) },
  DotColumns({ data: orders, height: 240, unit: "orders", label: "Orders by day" })), "#chart");
