# OG image service with HTML, CSS and headless Chromium

A small HTTP service that makes Open Graph images: the 1200 x 630 PNG that a
social network or a chat app shows for a link. The card is a normal HTML page
with CSS. Playwright opens it in one shared Chromium browser, with a new browser
context for each image, and takes a screenshot. The page loads its fonts from
memory and cannot load anything from the network. The service signs its URLs,
caches each image by a hash of its input and sends cache headers for a CDN. The
tutorial compares this service with the satori version in
[../nodejs-satori](../nodejs-satori):
[Build an OG Image Generator: satori vs Headless Chrome](https://apisk.com/blog/og-image-service/).

## Requirements

- Node.js 22 or later
- Chromium for Playwright 1.65 (the install step downloads it)
- The fonts in `fonts/` (Inter 4.1, SIL Open Font License 1.1, see
  `fonts/LICENSE.txt`). The service reads them from disk and loads no fonts
  from the internet.

## Install

```bash
npm ci
```

```bash
npx playwright install --only-shell chromium
```

On Linux, add `--with-deps` to the second command to install the system libraries.

## Run

```bash
OG_SECRET=change-me npm start
```

The service listens on port 3000. Set `PORT` to use a different port. If
`OG_SECRET` is not set, the service accepts URLs without a signature.

## Example request

Start the service without `OG_SECRET`, then run:

```bash
curl -D - -o card.png --get --data-urlencode "title=Build an OG image generator" --data-urlencode "subtitle=HTML and CSS in headless Chromium" --data-urlencode "v=1" http://localhost:3000/og.png
```

The answer is a 1200 x 630 PNG with the header
`Cache-Control: public, max-age=31536000, immutable`. The header `X-Cache`
is `MISS` for a new image and `HIT` for an image from the cache.

## Parameters of GET /og.png

| Parameter | Values | Default |
|---|---|---|
| `title` | Text, 1 to 120 characters | required |
| `subtitle` | Text, at most 200 characters | none |
| `v` | The template version (`TEMPLATE_VERSION` in `src/card.js`) | none |
| `sig` | The signature from `ogImageUrl()` in `src/links.js` | required when `OG_SECRET` is set |

Answers: 200 with the image, 304 when `If-None-Match` has the current ETag,
400 for bad input, 403 for a missing or wrong signature, 503 when too many
images are in progress. A URL without the current `v` gets a cache time of
one hour instead of one year.

## Make the URLs and meta tags for your pages

`src/links.js` has two functions for the site that shows the images:

- `ogImageUrl(serviceUrl, { title, subtitle }, secret)` returns the signed
  image URL with the template version.
- `metaTags({ pageUrl, title, description, imageUrl, imageAlt })` returns
  the `og:` and `twitter:card` meta tags for the `<head>` of the page.

## Environment variables

| Variable | Use |
|---|---|
| `PORT` | HTTP port, default 3000 |
| `OG_SECRET` | Secret for the URL signatures. Keep the same value in the site that makes the URLs. |
| `CACHE_DIR` | Folder for the cached images, default `cache` |
| `MAX_RENDERS` | Images that the service makes at the same time, default 4; more get status 503 |
| `RENDER_TIMEOUT_MS` | Time limit for one card, default 10000 |
| `CHROMIUM_SANDBOX` | `false` turns off the Chromium sandbox; do not use it in production |

## Test

```bash
npm test
```

The tests render real cards and check the PNG signature, the size, the cache
headers, the 304 answer, the HTML escape and the signatures. `test.sh` is the
CI script: it also starts the service with `npm start` and sends the example
request.
