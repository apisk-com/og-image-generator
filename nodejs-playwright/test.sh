#!/usr/bin/env bash
# Test entry point: the tests, then the commands from the README and the tutorial.
set -euo pipefail
cd "$(dirname "$0")"

npm ci
# The service needs only the headless shell build of Chromium.
npx playwright install --with-deps --only-shell chromium
npm test

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
    --data-urlencode "subtitle=HTML and CSS in headless Chromium" \
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
