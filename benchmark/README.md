# Benchmark: satori and Chromium on the same card

This script renders the same 1200 x 630 Open Graph card with the two services
in [../nodejs-satori](../nodejs-satori) and
[../nodejs-playwright](../nodejs-playwright). It measures:

- the cold start: the time from the module import to the first image (for
  Chromium, this includes the browser launch);
- the median and the 95th percentile render time of 50 images, one after
  the other;
- the images per second when 4 images render at the same time (50 images);
- the PNG size;
- the memory of the process and all its child processes. RSS counts shared
  pages (libraries) once in each process. On Linux, the script also reports
  PSS, which divides shared pages between the processes that share them.

The tutorial shows the results from GitHub Actions:
[Build an OG Image Generator: satori vs Headless Chrome](https://apisk.com/blog/og-image-service/).

## Run

The benchmark uses the packages of the two service folders. Install them first:

```bash
(cd ../nodejs-satori && npm ci)
```

```bash
(cd ../nodejs-playwright && npm ci && npx playwright install --only-shell chromium)
```

Then run the benchmark:

```bash
node bench.js
```

It prints the machine, the versions and a Markdown table, and writes
`out/results.json`, `out/satori.png` and `out/chromium.png`. Timings change
with the machine and its load. Run it on a computer that does no other work,
and compare only results from the same machine.
