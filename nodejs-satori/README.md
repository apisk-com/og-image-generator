# OG image service with satori and resvg-js

A small HTTP service that makes Open Graph images: the 1200 x 630 PNG that a
social network or a chat app shows for a link. satori turns a card layout and
the page title into SVG, and resvg-js turns the SVG into PNG. No browser is
needed. The service signs its URLs, caches each image by a hash of its input
and sends cache headers for a CDN. The tutorial explains each file and compares
this service with the headless Chrome version in
[../nodejs-playwright](../nodejs-playwright):
[Build an OG Image Generator: satori vs Headless Chrome](https://apisk.com/blog/og-image-service/).

## Requirements

- Node.js 22 or later
- The fonts in `fonts/` (Inter 4.1, SIL Open Font License 1.1, see
  `fonts/LICENSE.txt`). The service reads them from disk and loads no fonts
  from the internet.

## Install

```bash
npm ci
```

## Run

```bash
OG_SECRET=change-me npm start
```

The service listens on port 3000. Set `PORT` to use a different port. If
`OG_SECRET` is not set, the service accepts URLs without a signature.

## Example request

Start the service without `OG_SECRET`, then run:

```bash
curl -D - -o card.png --get --data-urlencode "title=Build an OG image generator" --data-urlencode "subtitle=satori and resvg-js, no browser" --data-urlencode "v=1" http://localhost:3000/og.png
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

## Test

```bash
npm test
```

The tests render real cards and check the PNG signature, the size, the cache
headers, the 304 answer and the signatures. `test.sh` is the CI script: it
also starts the service with `npm start` and sends the example request.
