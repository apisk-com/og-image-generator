// The card layout for Chromium: an HTML page with normal CSS.
// Change TEMPLATE_VERSION when you change the layout: it is part of the image URL.
export const TEMPLATE_VERSION = '1';
export const WIDTH = 1200;
export const HEIGHT = 630;
const SITE_NAME = 'example.com';

// The title and subtitle come from the request. Escape them, or a title
// such as "<img src=...>" becomes HTML in the card.
function escapeHtml(text) {
  return text
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

export function cardHtml({ title, subtitle }) {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<style>
  @font-face { font-family: Inter; font-weight: 400; src: url(/fonts/Inter-Regular.ttf); }
  @font-face { font-family: Inter; font-weight: 700; src: url(/fonts/Inter-Bold.ttf); }
  * { box-sizing: border-box; margin: 0; }
  body {
    width: ${WIDTH}px; height: ${HEIGHT}px;
    display: flex; flex-direction: column; padding: 64px 72px;
    background: linear-gradient(135deg, #0f172a 0%, #1e3a8a 100%);
    color: #f8fafc; font-family: Inter;
  }
  .site { font-size: 28px; font-weight: 700; color: #93c5fd; }
  .title { margin-top: auto; font-size: 68px; font-weight: 700; line-height: 1.1; }
  .subtitle { margin-top: 24px; font-size: 32px; line-height: 1.35; color: #cbd5e1; }
  .title, .subtitle { display: -webkit-box; -webkit-box-orient: vertical; overflow: hidden; }
  .title { -webkit-line-clamp: 3; }
  .subtitle { -webkit-line-clamp: 2; }
  .bar { margin-top: 40px; width: 120px; height: 8px; border-radius: 4px; background: #38bdf8; flex: none; }
</style>
</head>
<body>
  <div class="site">${SITE_NAME}</div>
  <div class="title">${escapeHtml(title)}</div>
  ${subtitle ? `<div class="subtitle">${escapeHtml(subtitle)}</div>` : ''}
  <div class="bar"></div>
</body>
</html>`;
}
