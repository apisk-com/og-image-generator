import { readFile } from 'node:fs/promises';
import { renderAsync } from '@resvg/resvg-js';
import satori from 'satori';
import { cardElement, HEIGHT, WIDTH } from './card.js';

export const RENDERER = 'satori';

// satori draws only with the fonts that you give it. Read them once at start
// and pass the same array to every call: satori keeps the parsed fonts.
const fontDir = new URL('../fonts/', import.meta.url);
const fonts = [
  { name: 'Inter', weight: 400, style: 'normal', data: await readFile(new URL('Inter-Regular.ttf', fontDir)) },
  { name: 'Inter', weight: 700, style: 'normal', data: await readFile(new URL('Inter-Bold.ttf', fontDir)) },
];

// Returns the card as a PNG Buffer.
export async function renderCard(input) {
  // satori lays out the elements and returns an SVG string. Text becomes paths.
  const svg = await satori(cardElement(input), { width: WIDTH, height: HEIGHT, fonts });
  // renderAsync draws the SVG in a worker thread. The SVG has no text
  // elements, so resvg needs no fonts.
  const image = await renderAsync(svg, { font: { loadSystemFonts: false } });
  // asPng() encodes the PNG on the main thread.
  return image.asPng();
}

// The satori route has no browser to stop.
export async function closeRenderer() {}
