import { barY, colorLegend, defineChart, mountChart } from "@tanstack/charts";
import { scaleBand } from "@tanstack/charts/scales/band";
import { scaleLinear } from "@tanstack/charts/scales/linear";
import { scaleOrdinal } from "@tanstack/charts/scales/ordinal";
import { tooltip } from "@tanstack/charts/tooltip";

const orders = [
  { day: "Mon", orders: 12, series: "Orders" },
  { day: "Tue", orders: 18, series: "Orders" },
  { day: "Wed", orders: 15, series: "Orders" },
  { day: "Thu", orders: 22, series: "Orders" },
  { day: "Fri", orders: 19, series: "Orders" },
  { day: "Sat", orders: 26, series: "Orders" },
  { day: "Sun", orders: 21, series: "Orders" }
];

const chart = defineChart({
  marks: [barY(orders, { x: "day", y: "orders", z: "series", key: "day" })],
  scales: {
    x: { scale: () => scaleBand().padding(0.1), grid: true },
    y: { scale: scaleLinear, nice: true, grid: true, axis: { ticks: { count: 5 } } }
  },
  color: { scale: scaleOrdinal(["#2563eb"]), legend: colorLegend({ label: "Series" }) },
  keyboard: true,
  tooltip
});

mountChart(document.getElementById("chart"), { definition: chart, height: 280, initialWidth: 640, ariaLabel: "Orders by day" });
