// Renders the same card many times with one renderer and prints the timings.
// bench.js starts this file once for each renderer and measures its memory.
//   node run.js satori|chromium
import { mkdirSync, writeFileSync } from 'node:fs';

const renderer = process.argv[2];
const folders = { satori: '../nodejs-satori', chromium: '../nodejs-playwright' };
if (!folders[renderer]) {
  console.error('Usage: node run.js satori|chromium');
  process.exit(2);
}

const CARD = {
  title: 'Build an OG image generator with satori and headless Chrome',
  subtitle: 'Same card, two renderers: render time, memory and the CSS each one supports.',
};
const WARM_UP = 5;
const SEQUENTIAL = 50;
const PARALLEL = 50;
const AT_ONCE = 4;

// bench.js reads these lines to know the current phase.
function report(data) {
  console.log(JSON.stringify(data));
}

report({ phase: 'cold' });
let started = performance.now();
// The cold start includes the module import, the fonts and (for Chromium) the browser launch.
const { renderCard, closeRenderer } = await import(`${folders[renderer]}/src/render.js`);
const first = await renderCard(CARD);
const coldMs = performance.now() - started;
mkdirSync(new URL('./out/', import.meta.url), { recursive: true });
writeFileSync(new URL(`./out/${renderer}.png`, import.meta.url), first);

for (let i = 0; i < WARM_UP; i++) await renderCard(CARD);
report({ phase: 'idle' });
await new Promise((resolve) => setTimeout(resolve, 500));

report({ phase: 'sequential' });
const times = [];
for (let i = 0; i < SEQUENTIAL; i++) {
  started = performance.now();
  await renderCard(CARD);
  times.push(performance.now() - started);
}

report({ phase: 'parallel' });
started = performance.now();
for (let done = 0; done < PARALLEL; done += AT_ONCE) {
  await Promise.all(Array.from({ length: AT_ONCE }, () => renderCard(CARD)));
}
const parallelSeconds = (performance.now() - started) / 1000;

times.sort((a, b) => a - b);
const percentile = (p) => times[Math.min(times.length - 1, Math.ceil((p / 100) * times.length) - 1)];
report({
  phase: 'done',
  renderer,
  coldMs: Math.round(coldMs),
  medianMs: Number(percentile(50).toFixed(1)),
  p95Ms: Number(percentile(95).toFixed(1)),
  imagesPerSecond: Number((PARALLEL / parallelSeconds).toFixed(1)),
  pngBytes: first.length,
});
await closeRenderer();
