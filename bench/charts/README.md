# A bar chart, two libraries

The chart comparison on lucidui.dev comes from this folder: the smallest real page each library needs for a bar chart with a tooltip, built with Vite 8 and measured the same way.

- `tanstack/`: TanStack Charts 1.1.0 with its own compact scales, matching the "interactive" tier of TanStack's own comparison: one series, axes, grid, a legend and a pointer tooltip.
- `lucid/`: Lucid UI 0.3.9, a DotColumns chart in a ChartCard: value labels, a pointer and keyboard tooltip, and a table view.

```sh
./measure.sh
```

Measured on 14 October 2026, where 1 KB is 1,024 bytes:

| Gzipped | TanStack Charts | Lucid UI |
| --- | --- | --- |
| JavaScript | 40.2 KB | 11.2 KB |
| CSS | inline | 8.2 KB |
| Everything shipped | 40.2 KB | 19.4 KB |

These are not identical charts. TanStack Charts draws axes and gridlines and is a full chart grammar with many more chart types; Lucid UI's charts are opinionated dot charts with value labels and a table view. Lucid's CSS is its whole stylesheet, covering every component, not just the chart. TanStack's own comparison, which includes its test harness and d3-scale, records 48.2 KB for this tier.
