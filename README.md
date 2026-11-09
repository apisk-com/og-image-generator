# OG image generator

Working code that makes Open Graph images (the 1200 x 630 social preview images for links) from HTML and data, with
satori and with headless Chrome. Each folder is one complete example: one language and tool, or one problem. The
[APISK tutorials](https://apisk.com/blog/) explain the code step by step.

## Examples

### By language and tool

| Folder | Language and tools | What it does | Tutorial |
|---|---|---|---|
| [nodejs-satori](nodejs-satori/) | Node.js, satori, resvg-js | OG images from JSX-like objects without a browser, with caching | [Build an OG Image Generator: satori vs Headless Chrome](https://apisk.com/blog/og-image-service/), 19 January 2027 |
| [nodejs-playwright](nodejs-playwright/) | Node.js, Playwright | OG images from HTML and CSS with headless Chrome | [Build an OG Image Generator: satori vs Headless Chrome](https://apisk.com/blog/og-image-service/), 19 January 2027 |

### By problem

| Folder | Language and tools | What it does | Tutorial |
|---|---|---|---|
| [benchmark](benchmark/) | Node.js, satori, Playwright | Render time and memory of both renderers for the same card | [Build an OG Image Generator: satori vs Headless Chrome](https://apisk.com/blog/og-image-service/), 19 January 2027 |

Each folder runs on its own: open its `README.md` for the commands.

## Add an example

Examples for other languages and tools are welcome. Put each one in its own
folder. Name the folder `<language>-<tool>`, for example
`java-openhtmltopdf`, or name it after the problem that it solves. Add a
`test.sh` file that installs what the example needs on Ubuntu 24.04 and runs
its tests. The test workflow runs `test.sh` for each folder that a push or a
pull request changes.

## License

MIT. See [LICENSE](LICENSE).
