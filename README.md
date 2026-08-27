# Plainshot

Capture an entire web page as a single image, in one click.

Plainshot takes the whole page — not just what fits on screen — and saves it
straight to your downloads folder. Nothing is uploaded, nothing is tracked, and
the extension makes no network requests of any kind.

## How it works

Plainshot captures in one pass through the browser's own rendering pipeline, so
there are no stitching seams and fixed headers appear exactly once. On pages too
tall for a single pass it falls back to scrolling and stitching automatically.

Before capturing, it walks the page once so that lazily loaded images have a
chance to appear in the result.

## Usage

Click the toolbar button, or press <kbd>Alt</kbd>+<kbd>Shift</kbd>+<kbd>P</kbd>.
The image is written to `Downloads/plainshot/`.

## Building from source

Requires Node.js 20 or newer.

```bash
npm install
npm run build
```

The unpacked extension is written to `dist/`. To load it, open `edge://extensions`
(or `chrome://extensions`), turn on developer mode, and choose **Load unpacked**.

```bash
npm run typecheck   # TypeScript, strict mode
npm run lint        # ESLint
npm run zip         # release/plainshot-<version>.zip
```

## Permissions

| Permission | Why it is needed |
| --- | --- |
| `activeTab` | Read the tab you invoked Plainshot on, and nothing else |
| `scripting` | Measure and scroll the page while capturing |
| `debugger` | Render the full page in a single pass |
| `downloads` | Save the finished image |
| `storage` | Remember your settings locally |

There are no host permissions, so Plainshot has no standing access to any site.

## License

MIT
