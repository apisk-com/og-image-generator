// Shows where the render time goes, step by step, for the same card.
//   node steps.js
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';

const RUNS = 30;
const CARD = {
  title: 'Build an OG image generator with satori and headless Chrome',
  subtitle: 'Same card, two renderers: render time, memory and the CSS each one supports.',
};

// Load the packages from the two service folders.
const fromSatori = createRequire(new URL('../nodejs-satori/package.json', import.meta.url));
const fromPlaywright = createRequire(new URL('../nodejs-playwright/package.json', import.meta.url));
const { default: satori } = await import('../nodejs-satori/node_modules/satori/dist/index.js');
const { renderAsync } = fromSatori('@resvg/resvg-js');
const { chromium } = fromPlaywright('playwright');
const { cardElement } = await import('../nodejs-satori/src/card.js');
const { cardHtml } = await import('../nodejs-playwright/src/card.js');

const median = (values) => {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)];
};

// Runs steps() RUNS times after 3 warm-up runs. steps() returns { step: ms }.
async function medians(steps) {
  for (let i = 0; i < 3; i++) await steps();
  const all = {};
  for (let i = 0; i < RUNS; i++) {
    for (const [name, ms] of Object.entries(await steps())) (all[name] ??= []).push(ms);
  }
  return Object.fromEntries(Object.entries(all).map(([name, values]) => [name, Number(median(values).toFixed(1))]));
}

async function timed(fn) {
  const started = performance.now();
  const value = await fn();
  return [value, performance.now() - started];
}

// satori: layout to SVG, draw the SVG, encode the PNG.
const fontDir = new URL('../nodejs-satori/fonts/', import.meta.url);
const fonts = [
  { name: 'Inter', weight: 400, style: 'normal', data: await readFile(new URL('Inter-Regular.ttf', fontDir)) },
  { name: 'Inter', weight: 700, style: 'normal', data: await readFile(new URL('Inter-Bold.ttf', fontDir)) },
];
const satoriSteps = await medians(async () => {
  const [svg, layout] = await timed(() => satori(cardElement(CARD), { width: 1200, height: 630, fonts }));
  const [image, draw] = await timed(() => renderAsync(svg, { font: { loadSystemFonts: false } }));
  const [, encode] = await timed(() => image.asPng());
  return { 'satori: layout to SVG': layout, 'resvg: draw (worker thread)': draw, 'resvg: PNG encode (main thread)': encode };
});

// Chromium: the same steps as renderCard() in nodejs-playwright/src/render.js.
const ORIGIN = 'https://og-card.invalid';
const chromiumFontDir = new URL('../nodejs-playwright/fonts/', import.meta.url);
const fontFiles = new Map([
  ['/fonts/Inter-Regular.ttf', await readFile(new URL('Inter-Regular.ttf', chromiumFontDir))],
  ['/fonts/Inter-Bold.ttf', await readFile(new URL('Inter-Bold.ttf', chromiumFontDir))],
]);
const browser = await chromium.launch({ chromiumSandbox: true });

async function openCard() {
  const context = await browser.newContext({ viewport: { width: 1200, height: 630 } });
  const html = cardHtml(CARD);
  await context.route('**/*', (route) => {
    const url = new URL(route.request().url());
    if (url.origin !== ORIGIN) return route.abort();
    if (url.pathname === '/card.html') return route.fulfill({ body: html, contentType: 'text/html; charset=utf-8' });
    const font = fontFiles.get(url.pathname);
    return font ? route.fulfill({ body: font, contentType: 'font/ttf' }) : route.fulfill({ status: 404 });
  });
  const page = await context.newPage();
  return { context, page };
}

const chromiumSteps = await medians(async () => {
  const [{ context, page }, open] = await timed(openCard);
  const [, load] = await timed(async () => {
    await page.goto(`${ORIGIN}/card.html`);
    await page.evaluate(() => document.fonts.ready);
  });
  const [, shot] = await timed(() => page.screenshot({ type: 'png' }));
  const [, close] = await timed(() => context.close());
  return {
    'new context, route, new page': open,
    'load card and fonts': load,
    'screenshot (PNG)': shot,
    'close context': close,
  };
});

// The same page, captured as PNG, JPEG and WebP.
const { context, page } = await openCard();
await page.goto(`${ORIGIN}/card.html`);
await page.evaluate(() => document.fonts.ready);
const types = {};
for (const [label, options] of [
  ['PNG', { type: 'png' }],
  ['JPEG, quality 90', { type: 'jpeg', quality: 90 }],
  ['WebP, quality 90', { type: 'webp', quality: 90 }],
]) {
  let bytes = 0;
  types[label] = await medians(async () => {
    const [image, ms] = await timed(() => page.screenshot(options));
    bytes = image.length;
    return { ms };
  });
  types[label].bytes = bytes;
}
await context.close();
await browser.close();

console.log('\n| satori step | Median (ms) |\n|---|---|');
for (const [step, ms] of Object.entries(satoriSteps)) console.log(`| ${step} | ${ms} |`);
console.log('\n| Chromium step | Median (ms) |\n|---|---|');
for (const [step, ms] of Object.entries(chromiumSteps)) console.log(`| ${step} | ${ms} |`);
console.log('\n| Chromium screenshot type | Median (ms) | Bytes |\n|---|---|---|');
for (const [label, { ms, bytes }] of Object.entries(types)) console.log(`| ${label} | ${ms} | ${bytes} |`);
