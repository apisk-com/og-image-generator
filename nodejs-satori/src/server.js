import { createApp } from './app.js';
import { closeRenderer, renderCard, RENDERER } from './render.js';

const port = Number(process.env.PORT ?? 3000);

if (!process.env.OG_SECRET) {
  console.warn('OG_SECRET is not set: anybody can make images with any text.');
}

// Make one card before the first request. A missing font or browser stops the service here.
await renderCard({ title: 'Start', subtitle: '' });

const server = createApp().listen(port, (error) => {
  if (error) throw error;
  console.log(`OG image service (${RENDERER}) on http://localhost:${port}`);
});

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.once(signal, () => {
    server.close(async () => {
      await closeRenderer();
      process.exit(0);
    });
  });
}
