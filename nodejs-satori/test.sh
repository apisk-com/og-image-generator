#!/usr/bin/env bash
# Test entry point: the tests, then the commands from the README and the tutorial.
set -euo pipefail
cd "$(dirname "$0")"

npm ci
npm test

# The tutorial downloads the fonts from the Inter release. They must be the files in fonts/.
fonts_check=$(mktemp -d)
(
  cd "$fonts_check"
  curl -LO https://github.com/rsms/inter/releases/download/v4.1/Inter-4.1.zip
  unzip -j Inter-4.1.zip extras/ttf/Inter-Regular.ttf extras/ttf/Inter-Bold.ttf LICENSE.txt -d fonts
)
for f in Inter-Regular.ttf Inter-Bold.ttf LICENSE.txt; do
  cmp "$fonts_check/fonts/$f" "fonts/$f"
done
rm -rf "$fonts_check"
echo "The fonts match the Inter 4.1 release."

# Start the service as the README says, and send the example request.
port=${PORT:-3000}
out=$(mktemp -d)
PORT=$port CACHE_DIR="$out/cache" npm start > "$out/server.log" 2>&1 &
server_pid=$!
cleanup() {
  kill "$server_pid" 2> /dev/null || true
  cat "$out/server.log"
  rm -rf "$out"
}
trap cleanup EXIT

for _ in $(seq 1 30); do
  if curl -fsS http://localhost:$port/health > /dev/null 2>&1; then
    break
  fi
  sleep 1
done

request() {
  curl -fsS -D "$out/headers.txt" -o "$out/card.png" --get \
    --data-urlencode "title=Build an OG image generator" \
    --data-urlencode "subtitle=satori and resvg-js, no browser" \
    --data-urlencode "v=1" \
    http://localhost:$port/og.png
  cat "$out/headers.txt"
}

request
file "$out/card.png" | grep -q 'PNG image data, 1200 x 630'
grep -qi '^cache-control: public, max-age=31536000, immutable' "$out/headers.txt"
grep -qi '^x-cache: MISS' "$out/headers.txt"

request
grep -qi '^x-cache: HIT' "$out/headers.txt"

echo "Smoke test passed."
