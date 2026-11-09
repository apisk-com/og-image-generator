// A file cache for the rendered images. The file name is a hash of the input.
import { createHash } from 'node:crypto';
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

export function cacheKey(text) {
  return createHash('sha256').update(text).digest('hex').slice(0, 32);
}

export function createCache(dir) {
  // Renders in progress, by key. Crawlers often ask for a new image several
  // times at once: the requests share one render.
  const pending = new Map();

  async function renderAndSave(file, render) {
    const image = await render();
    await mkdir(dir, { recursive: true });
    // Write to a temporary file, then rename it: no reader sees half a file.
    const temp = `${file}.${process.pid}.tmp`;
    await writeFile(temp, image);
    await rename(temp, file);
    return image;
  }

  return {
    // Returns { image, hit }. Calls render() only on a cache miss.
    async get(key, render) {
      const file = join(dir, `${key}.png`);
      try {
        return { image: await readFile(file), hit: true };
      } catch (error) {
        if (error.code !== 'ENOENT') throw error;
      }
      let promise = pending.get(key);
      if (!promise) {
        promise = renderAndSave(file, render).finally(() => pending.delete(key));
        pending.set(key, promise);
      }
      return { image: await promise, hit: false };
    },
  };
}
