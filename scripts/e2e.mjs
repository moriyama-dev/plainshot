// End-to-end check: load dist/ into a real Chrome, click the toolbar button on
// a local test page, and confirm a PNG of the full page lands in Downloads.
//
//   npm run build && npm run e2e
//
// The browser comes from CHROME_PATH, or from .cache/browsers (see README).
// Runs entirely offline against a page served from 127.0.0.1.

import { readFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';

import { findChrome } from './chrome-path.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const DIST = join(ROOT, 'dist');
const VIEWPORT = { width: 1280, height: 800 };

function page(height) {
  // A sticky header plus bands of colour, so a stitched image would show seams.
  const bands = Array.from(
    { length: Math.ceil(height / 500) },
    (_, i) =>
      `<section style="height:500px;background:hsl(${(i * 37) % 360} 60% 70%)">${i}</section>`,
  ).join('');
  return `<!doctype html><meta charset="utf-8"><title>${height}</title>
<style>body{margin:0;font:40px sans-serif}header{position:sticky;top:0;height:60px;background:#222;color:#fff}</style>
<header>Plainshot test</header><main style="height:${height - 60}px;overflow:hidden">${bands}</main>`;
}

function pngSize(path) {
  const bytes = readFileSync(path);
  if (bytes.toString('latin1', 1, 4) !== 'PNG') throw new Error(`${path} is not a PNG`);
  return { width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20) };
}

/** Waits for the extension's next finished download and returns its path. */
async function waitForDownload(worker, seen, timeoutMs) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const items = await worker.evaluate(() =>
      chrome.downloads.search({ filenameRegex: 'plainshot', state: 'complete' }),
    );
    const fresh = items.find((item) => !seen.has(item.id));
    if (fresh) {
      seen.add(fresh.id);
      return fresh;
    }
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  throw new Error(`no screenshot was saved within ${timeoutMs} ms`);
}

const server = createServer((req, res) => {
  const height = Number(new URL(req.url, 'http://x').searchParams.get('h') ?? 3000);
  res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
  res.end(page(height));
});
await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
const base = `http://127.0.0.1:${server.address().port}/`;

const browser = await puppeteer.launch({
  executablePath: findChrome(),
  headless: true,
  pipe: true,
  dumpio: process.env.E2E_DUMPIO === '1',
  enableExtensions: true,
  defaultViewport: VIEWPORT,
  args: [
    `--window-size=${VIEWPORT.width},${VIEWPORT.height}`,
    // Ubuntu 23.10+ blocks Chrome's sandbox via AppArmor. Only the local test
    // page is ever opened, so it is acceptable to opt out there explicitly.
    ...(process.env.E2E_NO_SANDBOX === '1' ? ['--no-sandbox'] : []),
  ],
});

const errors = [];
let failed = false;

try {
  const id = await browser.installExtension(DIST);
  const extension = (await browser.extensions()).get(id);
  if (!extension) throw new Error('the extension did not load');
  console.log(`loaded ${extension.name} ${extension.version}`);

  // The worker registers a moment after the install call returns.
  let worker;
  for (let attempt = 0; attempt < 50 && !worker; attempt += 1) {
    [worker] = await extension.workers();
    if (!worker) await new Promise((resolve) => setTimeout(resolve, 200));
  }
  if (!worker) throw new Error('the service worker did not start');
  worker.on('console', (message) => {
    console.log(`  [worker ${message.type()}] ${message.text()}`);
    if (message.type() === 'error') errors.push(message.text());
  });

  // The menu entries are created on install; an invalid id or a missing
  // permission would leave chrome.runtime.lastError set and nothing else.
  const menuCheck = await worker.evaluate(
    () =>
      new Promise((resolve) => {
        chrome.contextMenus.update('report-problem', {}, () =>
          resolve(chrome.runtime.lastError?.message ?? 'ok'),
        );
      }),
  );
  if (menuCheck !== 'ok') throw new Error(`context menu missing: ${menuCheck}`);
  console.log('context menu entries present');

  const seen = new Set();

  // 3000px goes through the single-shot path; 20000px is past the single-shot
  // limit and has to be stitched.
  for (const height of [3000, 20000]) {
    const tab = await browser.newPage();
    await tab.goto(`${base}?h=${height}`, { waitUntil: 'load' });
    await tab.bringToFront();
    await tab.triggerExtensionAction(extension);

    const download = await waitForDownload(worker, seen, 60_000);
    const size = pngSize(download.filename);
    console.log(`page ${height}px -> ${size.width}x${size.height} PNG`);
    if (size.height !== height) {
      throw new Error(`expected a ${height}px tall image, got ${size.height}px`);
    }
    if (size.width < VIEWPORT.width - 40 || size.width > VIEWPORT.width) {
      throw new Error(`unexpected image width ${size.width}`);
    }
    await tab.close();
    await worker.evaluate((id) => chrome.downloads.removeFile(id), download.id);
  }

  if (errors.length > 0) throw new Error(`the worker logged errors:\n${errors.join('\n')}`);
  console.log('e2e: all checks passed');
} catch (cause) {
  failed = true;
  console.error(`e2e: FAILED - ${cause instanceof Error ? cause.message : String(cause)}`);
} finally {
  await browser.close();
  server.close();
}

process.exit(failed ? 1 : 0);
