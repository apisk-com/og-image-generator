import assert from 'node:assert/strict';
import { mkdtemp, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { after, test } from 'node:test';
import { cacheKey, createCache } from '../src/cache.js';

const dir = await mkdtemp(join(tmpdir(), 'og-cache-test-'));
after(() => rm(dir, { recursive: true, force: true }));

test('the key is a hex hash of the text', () => {
  assert.match(cacheKey('a'), /^[0-9a-f]{32}$/);
  assert.equal(cacheKey('a'), cacheKey('a'));
  assert.notEqual(cacheKey('a'), cacheKey('b'));
});

test('renders once, then reads the file', async () => {
  const cache = createCache(dir);
  let calls = 0;
  const render = async () => {
    calls++;
    return Buffer.from('image bytes');
  };
  const first = await cache.get('k1', render);
  const second = await cache.get('k1', render);
  assert.equal(first.hit, false);
  assert.equal(second.hit, true);
  assert.equal(second.image.toString(), 'image bytes');
  assert.equal(calls, 1);
  assert.deepEqual(await readdir(dir), ['k1.png']);
});

test('requests for the same new key share one render', async () => {
  const cache = createCache(dir);
  let calls = 0;
  const render = async () => {
    calls++;
    await new Promise((resolve) => setTimeout(resolve, 50));
    return Buffer.from('slow image');
  };
  const results = await Promise.all([1, 2, 3, 4].map(() => cache.get('k2', render)));
  assert.equal(calls, 1);
  assert.ok(results.every((result) => result.image.toString() === 'slow image'));
});

test('a failed render is not cached', async () => {
  const cache = createCache(dir);
  await assert.rejects(cache.get('k3', async () => {
    throw new Error('render failed');
  }));
  const { hit } = await cache.get('k3', async () => Buffer.from('ok'));
  assert.equal(hit, false);
});
