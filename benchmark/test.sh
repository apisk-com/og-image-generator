#!/usr/bin/env bash
# CI entry point: installs both renderers and runs the benchmark.
set -euo pipefail
cd "$(dirname "$0")"

(cd ../nodejs-satori && npm ci)
(cd ../nodejs-playwright && npm ci && npx playwright install --with-deps --only-shell chromium)

node bench.js
node steps.js

# Both renderers must give a 1200 x 630 PNG.
file out/satori.png out/chromium.png
sha256sum out/satori.png out/chromium.png
file out/satori.png | grep -q 'PNG image data, 1200 x 630'
file out/chromium.png | grep -q 'PNG image data, 1200 x 630'
echo "Benchmark finished."
