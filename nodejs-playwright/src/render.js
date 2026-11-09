import { readFile } from 'node:fs/promises';
import { chromium } from 'playwright';
import { cardHtml, HEIGHT, WIDTH } from './card.js';

export const RENDERER = 'chromium';
const RENDER_TIMEOUT_MS = Number(process.env.RENDER_TIMEOUT_MS ?? 10_000);

// Chromium opens the card at this address. The .invalid domain never resolves,
// and the route handler answers every request from memory.
const ORIGIN = 'https://og-card.invalid';
const fontDir = new URL('../fonts/', import.meta.url);
const fontFiles = new Map([
  ['/fonts/Inter-Regular.ttf', await readFile(new URL('Inter-Regular.ttf', fontDir))],
  ['/fonts/Inter-Bold.ttf', await readFile(new URL('Inter-Bold.ttf', fontDir))],
]);

let browserPromise;

// One Chromium process for the whole service, as in the screenshot API.
export function getBrowser() {
  browserPromise ??= launchBrowser();
  return browserPromise;
}

async function launchBrowser() {
  try {
    const browser = await chromium.launch({
      // Playwright turns the sandbox off by default. The card shows text from
      // requests, so keep the sandbox on.
      chromiumSandbox: process.env.CHROMIUM_SANDBOX !== 'false',
    });
    browser.on('disconnected', () => {
      browserPromise = undefined;
    });
    return browser;
  } catch (error) {
    browserPromise = undefined;
    throw error;
  }
}

export async function closeRenderer() {
  const browser = await browserPromise;
  await browser?.close();
}

// Returns the card as a PNG Buffer.
export async function renderCard(input) {
  const browser = await getBrowser();
  // A new context for each card: no cache or storage from other requests.
  const context = await browser.newContext({ viewport: { width: WIDTH, height: HEIGHT } });
  try {
    context.setDefaultTimeout(RENDER_TIMEOUT_MS);
    const html = cardHtml(input);
    // Answer the page and font requests from memory. Block all other requests.
    await context.route('**/*', (route) => {
      const url = new URL(route.request().url());
      if (url.origin !== ORIGIN) return route.abort();
      if (url.pathname === '/card.html') {
        return route.fulfill({ body: html, contentType: 'text/html; charset=utf-8' });
      }
      const font = fontFiles.get(url.pathname);
      if (font) return route.fulfill({ body: font, contentType: 'font/ttf' });
      return route.fulfill({ status: 404 });
    });

    const page = await context.newPage();
    await page.goto(`${ORIGIN}/card.html`);
    // Wait until the web fonts are ready. Without this wait, the image can
    // show a fallback font.
    await page.evaluate(() => document.fonts.ready);
    return await page.screenshot({ type: 'png' });
  } finally {
    await context.close().catch(() => {});
  }
}
