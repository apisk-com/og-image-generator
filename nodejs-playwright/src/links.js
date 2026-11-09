// For the site that shows the image: the image URL and the meta tags.
import { HEIGHT, TEMPLATE_VERSION, WIDTH } from './card.js';
import { parseCardInput, sign } from './input.js';

// Builds the signed, versioned image URL for one page.
export function ogImageUrl(serviceUrl, card, secret) {
  // The same clean-up as the service, so that the signature matches.
  const input = parseCardInput(card);
  const url = new URL('/og.png', serviceUrl);
  url.searchParams.set('title', input.title);
  if (input.subtitle) url.searchParams.set('subtitle', input.subtitle);
  url.searchParams.set('v', TEMPLATE_VERSION);
  if (secret) url.searchParams.set('sig', sign(input, secret));
  return url.href;
}

function escapeAttribute(text) {
  return text.replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
}

// The tags for the <head> of the page.
export function metaTags({ pageUrl, title, description, imageUrl, imageAlt }) {
  const tags = [
    ['property', 'og:type', 'article'],
    ['property', 'og:url', pageUrl],
    ['property', 'og:title', title],
    ['property', 'og:description', description],
    ['property', 'og:image', imageUrl],
    ['property', 'og:image:type', 'image/png'],
    ['property', 'og:image:width', String(WIDTH)],
    ['property', 'og:image:height', String(HEIGHT)],
    ['property', 'og:image:alt', imageAlt],
    ['name', 'twitter:card', 'summary_large_image'],
  ];
  return tags
    .map(([attribute, key, value]) => `<meta ${attribute}="${key}" content="${escapeAttribute(value)}">`)
    .join('\n');
}
