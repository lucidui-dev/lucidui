# Same app, two stacks

The numbers in the comparison on lucidui.dev come from this folder. It holds one small app, a team directory with 1,000 people, search, and an Add dialog, built twice:

- `react/`: React 19, Tailwind CSS 4 and shadcn/ui (Button, Input and Dialog, copied in as shadcn does), on Vite 8. It's the smallest setup shadcn/ui needs: plain JavaScript, no TypeScript or ESLint.
- `lucid/`: Lucid UI on Vite 8.

Both build with the same tool and settings. To measure them yourself:

```sh
./measure.sh
```

It installs each app, builds it, counts the packages it runs on, and gzips what it ships. Results measured on 13 October 2026, where 1 KB is 1,024 bytes:

| | React + Tailwind + shadcn/ui | Lucid UI |
| --- | --- | --- |
| Runtime packages | 33 | 1 |
| JavaScript, gzipped | 90.5 KB | 10.3 KB |
| CSS, gzipped | 3.9 KB | 8.2 KB |
| Everything shipped | 94.4 KB | 18.5 KB |
| Code in your repo | 181 lines in 8 files | 30 lines in 1 file |

Tailwind ships less CSS, because it keeps only the classes you use. Lucid ships its whole stylesheet.
