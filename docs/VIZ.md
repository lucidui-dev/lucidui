# Lucid UI data visualisation

Lucid UI draws data with dots. Bars, lines and pies are replaced by forms built from one consistent mark, so every chart in a Lucid UI app reads as part of the same system, and none of them look like a default chart library.

```js
import { DotColumns, DotDumbbell, Waffle, UnitRows, DotCalendar, DotSparkline, StatTile, DotMeter, ChartCard } from "@lucidui/core/viz";
```

Every chart sizes itself to its container, re-renders when its data signals change, animates its dots in, and has a hover and keyboard tooltip.

## The forms

| Chart | Instead of | Data |
| --- | --- | --- |
| `DotColumns` | bar chart | `data: [{ label, value }]`, `unit`. Each dot is a fixed number of units, stated in a caption, against a faint grid of empty dots. A remainder shows as a smaller dot. |
| `DotDumbbell` | multi-line chart | `labels`, `series: [{ name, color, values }]` (two or more). Each period shows every value, joined by a stem from the lowest to the highest, so the spread is the story. The tooltip lists every series, and adds a net row when there are exactly two. |
| `Waffle` | pie or donut | `segments: [{ label, value, color, hollow }]`, `columns`, `rows`. Each dot is an equal share of the whole. |
| `UnitRows` | stacked bar | `rows: [{ label, avatar, counts }]`, `segments`. One dot per item, so small numbers stay countable. |
| `DotCalendar` | heatmap | `days: [{ date, value }]`. Dot size and shade both carry the value. |
| `DotSparkline` | sparkline | `data: number[]`. A trail of small dots with the latest value highlighted. |
| `StatTile` | KPI card | `label`, `value`, `unit`, `delta`, `deltaLabel`, `upIsGood` (`true`, `false` or `null` for neutral), `trend` |
| `DotMeter` | progress bar | `value`, `max`, `dots` |

`ChartCard({ title, subtitle, table }, chart)` frames a chart and adds a Chart and Table switch. Pass `table: () => ({ columns, rows })` so every value can be read without hovering.

## Rules the charts follow

- **Colour by job.** Series use the `--lucid-series-*` palette in a fixed order, checked for colour-blind separation in light and dark. Magnitude uses the one-hue `--lucid-seq-*` ramp. Colour is never the only signal: legends, labels and hollow dots back it up.
- **Text is never the series colour.** Values and labels use ink tokens, and a coloured key sits beside them.
- **One axis.** Two measures with different scales get two charts.
- **Label sparingly.** Values appear where they matter: column tops, the hovered point and the tooltip.
- **Tooltips enhance, never gate.** Everything in a tooltip is also in the table view.
