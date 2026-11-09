import assert from 'node:assert/strict';
import { test } from 'node:test';
import { cardElement } from '../src/card.js';
import { renderCard } from '../src/render.js';

test('the card is a tree of plain objects with the text as children', () => {
  const card = cardElement({ title: '<b>Not HTML</b>', subtitle: '' });
  assert.equal(card.type, 'div');
  const [site, title, subtitle] = card.props.children;
  assert.equal(site.props.children[0], 'example.com');
  // satori draws strings as text. It never reads them as HTML.
  assert.equal(title.props.children[0], '<b>Not HTML</b>');
  assert.equal(subtitle, null);
});

test('the same input gives the same bytes', async () => {
  const input = { title: 'Same input', subtitle: 'Same output' };
  assert.deepEqual(await renderCard(input), await renderCard(input));
});

test('an emoji does not stop the render', async () => {
  // Inter has no emoji. satori draws the font's empty-glyph box instead.
  const png = await renderCard({ title: 'Launch day 🚀', subtitle: '' });
  assert.equal(png.subarray(0, 4).toString('hex'), '89504e47');
});
