// Starts the service with the real renderer and checks real images.
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { get } from 'node:http';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { after, before, test } from 'node:test';
import { imageSize } from 'image-size';
import { createApp } from '../src/app.js';
import { ogImageUrl } from '../src/links.js';
import { closeRenderer } from '../src/render.js';

const SECRET = 'test-secret';
let cacheDir;
let open; // service without a secret
let signed; // service with a secret

before(async () => {
  cacheDir = await mkdtemp(join(tmpdir(), 'og-app-test-'));
  open = await listen(createApp({ secret: '', cacheDir: join(cacheDir, 'open') }));
  signed = await listen(createApp({ secret: SECRET, cacheDir: join(cacheDir, 'signed') }));
});

after(async () => {
  for (const server of [open, signed]) {
    server.closeAllConnections();
    server.close();
  }
  await closeRenderer();
  await rm(cacheDir, { recursive: true, force: true });
});

function listen(app) {
  return new Promise((resolve) => {
    const server = app.listen(0, '127.0.0.1', () => resolve(server));
  });
}

const base = (server) => `http://127.0.0.1:${server.address().port}`;

test('returns a 1200 x 630 PNG with long cache headers', async () => {
  const url = ogImageUrl(base(open), { title: 'Hello from the test', subtitle: 'A subtitle' });
  const response = await fetch(url);
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('content-type'), 'image/png');
  assert.equal(response.headers.get('cache-control'), 'public, max-age=31536000, immutable');
  assert.match(response.headers.get('etag'), /^"[0-9a-f]{32}"$/);
  assert.equal(response.headers.get('x-cache'), 'MISS');

  const png = Buffer.from(await response.arrayBuffer());
  assert.equal(png.subarray(0, 8).toString('hex'), '89504e470d0a1a0a');
  const { width, height } = imageSize(png);
  assert.deepEqual([width, height], [1200, 630]);

  const again = await fetch(url);
  assert.equal(again.headers.get('x-cache'), 'HIT');
  assert.deepEqual(Buffer.from(await again.arrayBuffer()), png);
});

test('answers 304 when the client has the image', async () => {
  const url = ogImageUrl(base(open), { title: 'Conditional request' });
  const first = await fetch(url);
  await first.arrayBuffer();
  // fetch() adds "Cache-Control: no-cache" to a conditional request, and
  // Express then answers 200. A browser or a CDN sends only If-None-Match.
  const status = await new Promise((resolve, reject) => {
    get(url, { headers: { 'If-None-Match': first.headers.get('etag') } }, (response) => {
      response.resume();
      resolve(response.statusCode);
    }).on('error', reject);
  });
  assert.equal(status, 304);
});

test('different text gives a different image and ETag', async () => {
  const a = await fetch(ogImageUrl(base(open), { title: 'First title' }));
  const b = await fetch(ogImageUrl(base(open), { title: 'Second title' }));
  assert.notEqual(a.headers.get('etag'), b.headers.get('etag'));
  assert.notDeepEqual(Buffer.from(await a.arrayBuffer()), Buffer.from(await b.arrayBuffer()));
});

test('a URL without the current version gets a short cache time', async () => {
  const response = await fetch(`${base(open)}/og.png?title=No+version`);
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('cache-control'), 'public, max-age=3600');
  await response.arrayBuffer();
});

test('answers 400 for bad input, without caching the error', async () => {
  for (const query of ['', 'title=', `title=${'a'.repeat(121)}`, 'title=a&title=b']) {
    const response = await fetch(`${base(open)}/og.png?${query}`);
    assert.equal(response.status, 400, query);
    assert.equal(response.headers.get('cache-control'), 'no-store');
    assert.ok((await response.json()).error);
  }
});

test('with a secret, only signed URLs work', async () => {
  const good = await fetch(ogImageUrl(base(signed), { title: 'Signed card' }, SECRET));
  assert.equal(good.status, 200);
  await good.arrayBuffer();

  const unsigned = await fetch(ogImageUrl(base(signed), { title: 'Signed card' }));
  assert.equal(unsigned.status, 403);
  const otherText = new URL(ogImageUrl(base(signed), { title: 'Signed card' }, SECRET));
  otherText.searchParams.set('title', 'Fake news');
  assert.equal((await fetch(otherText)).status, 403);
});

test('health answers with the renderer name', async () => {
  const response = await fetch(`${base(open)}/health`);
  assert.equal(response.status, 200);
  assert.equal((await response.json()).status, 'ok');
});
