import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import { cardHtml } from '../src/card.js';
import { closeRenderer, renderCard } from '../src/render.js';

after(() => closeRenderer());

test('escapes the text, so a title cannot add HTML', () => {
  const html = cardHtml({ title: '<img src=x onerror="alert(1)">', subtitle: "Tom's & Jerry's" });
  assert.ok(html.includes('&lt;img src=x onerror=&quot;alert(1)&quot;&gt;'));
  assert.ok(html.includes('Tom&#39;s &amp; Jerry&#39;s'));
  assert.ok(!html.includes('<img'));
});

test('leaves out the subtitle element when there is no subtitle', () => {
  assert.ok(!cardHtml({ title: 'Only a title', subtitle: '' }).includes('class="subtitle"'));
});

test('the same input gives the same image', async () => {
  const input = { title: 'Same input', subtitle: 'Same output' };
  assert.deepEqual(await renderCard(input), await renderCard(input));
});
