import assert from 'node:assert/strict';
import { test } from 'node:test';
import { hasValidSignature, parseCardInput } from '../src/input.js';
import { metaTags, ogImageUrl } from '../src/links.js';

test('builds a versioned, signed image URL that the service accepts', () => {
  const href = ogImageUrl('https://og.example.com', { title: ' Fast  OG images ', subtitle: 'satori & Chrome' }, 's3cret');
  const url = new URL(href);
  assert.equal(url.origin + url.pathname, 'https://og.example.com/og.png');
  assert.equal(url.searchParams.get('title'), 'Fast OG images');
  assert.equal(url.searchParams.get('subtitle'), 'satori & Chrome');
  assert.equal(url.searchParams.get('v'), '1');

  const query = Object.fromEntries(url.searchParams);
  assert.equal(hasValidSignature(query, parseCardInput(query), 's3cret'), true);
});

test('leaves out the signature without a secret', () => {
  const url = new URL(ogImageUrl('http://localhost:3000', { title: 'Hello' }));
  assert.equal(url.searchParams.has('sig'), false);
  assert.equal(url.searchParams.has('subtitle'), false);
});

test('writes escaped meta tags with the image size', () => {
  const html = metaTags({
    pageUrl: 'https://example.com/blog/a/',
    title: 'Tom "the cat" & <friends>',
    description: 'A page',
    imageUrl: 'https://og.example.com/og.png?title=a&v=1',
    imageAlt: 'Card with the title of the page',
  });
  assert.match(html, /<meta property="og:image" content="https:\/\/og\.example\.com\/og\.png\?title=a&amp;v=1">/);
  assert.match(html, /<meta property="og:image:width" content="1200">/);
  assert.match(html, /<meta property="og:image:height" content="630">/);
  assert.match(html, /<meta name="twitter:card" content="summary_large_image">/);
  assert.match(html, /content="Tom &quot;the cat&quot; &amp; &lt;friends&gt;"/);
});
