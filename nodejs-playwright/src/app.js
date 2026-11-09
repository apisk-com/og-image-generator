import express from 'express';
import { cacheKey, createCache } from './cache.js';
import { TEMPLATE_VERSION } from './card.js';
import { canonical, hasValidSignature, httpError, parseCardInput } from './input.js';
import { renderCard, RENDERER } from './render.js';

const ONE_YEAR = 31_536_000; // seconds
const MAX_RENDERS = Number(process.env.MAX_RENDERS ?? 4);

export function createApp({ secret = process.env.OG_SECRET, cacheDir = process.env.CACHE_DIR ?? 'cache' } = {}) {
  const app = express();
  app.disable('x-powered-by');
  const cache = createCache(cacheDir);
  let renders = 0;

  app.get('/health', (req, res) => {
    res.json({ status: 'ok', renderer: RENDERER });
  });

  app.get('/og.png', async (req, res) => {
    const input = parseCardInput(req.query);
    if (secret && !hasValidSignature(req.query, input, secret)) {
      throw httpError(403, 'The signature is missing or wrong.');
    }

    const key = cacheKey(`${RENDERER} ${canonical(input)}`);
    // The URL holds all input and the template version, so the image for a
    // URL never changes. A URL with an old or no version gets one hour.
    const current = req.query.v === TEMPLATE_VERSION;
    res.set('Cache-Control', current ? `public, max-age=${ONE_YEAR}, immutable` : 'public, max-age=3600');
    res.set('ETag', `"${key}"`);
    // The client has this image already: 304 Not Modified, no render.
    if (req.fresh) return res.status(304).end();

    const { image, hit } = await cache.get(key, async () => {
      if (renders >= MAX_RENDERS) {
        throw httpError(503, 'Too many images in progress. Try again later.');
      }
      renders++;
      try {
        return await renderCard(input);
      } finally {
        renders--;
      }
    });
    res.set('X-Cache', hit ? 'HIT' : 'MISS');
    res.type('png').send(image);
  });

  // Express 5 sends errors from async handlers here.
  app.use((error, req, res, next) => {
    // A CDN must not keep an error for a year.
    res.set('Cache-Control', 'no-store');
    res.removeHeader('ETag');
    if (error.status === 503) res.set('Retry-After', '5');
    if (!error.expose) console.error(error);
    res.status(error.status ?? 500).json({ error: error.expose ? error.message : 'The image could not be made.' });
  });

  return app;
}
