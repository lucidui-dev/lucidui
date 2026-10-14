#!/bin/sh
set -e
cd "$(dirname "$0")"
for app in tanstack lucid; do
  (
    cd "$app"
    npm install --ignore-scripts --no-audit --no-fund --loglevel=error >/dev/null
    npx vite build --logLevel error >/dev/null
    runtime=$(npm ls --omit=dev --all --parseable 2>/dev/null | tail -n +2 | wc -l | tr -d ' ')
    js=0; for f in dist/assets/*.js; do js=$((js + $(gzip -9 -c "$f" | wc -c))); done
    css=0; for f in dist/assets/*.css; do css=$((css + $(gzip -9 -c "$f" | wc -c))); done
    echo "$app: $runtime runtime packages, $js bytes of JS and $css bytes of CSS gzipped"
  )
done
