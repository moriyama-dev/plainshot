// Renders the store listing images into store/images/ with Chrome for Testing:
//
//   screenshot-1.png  1280x800  what a capture looks like
//   screenshot-2.png  1280x800  privacy and the toolbar menu
//   promo-small.png    440x280  Chrome Web Store small promo tile
//   logo-300.png       300x300  Edge Add-ons store logo
//
// The example capture is a real full-page screenshot of a local demo page.

import { mkdirSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';

import { findChrome } from './chrome-path.mjs';
import { iconPng } from './make-icons.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'store', 'images');

const ICON = `data:image/png;base64,${iconPng(512).toString('base64')}`;
const FONT = `system-ui, -apple-system, "Segoe UI", Roboto, "Noto Sans", sans-serif`;

// A long article-like page, so the capture shows something worth seeing.
function demoPage() {
  const palette = ['#f6d6ad', '#c9e4de', '#c6def1', '#dbcdf0', '#f2c6de', '#faedcb'];
  const sections = palette
    .map(
      (color, i) => `
      <section>
        <h2>Section ${i + 1}</h2>
        <div class="figure" style="background:${color}"></div>
        <p class="line"></p><p class="line short"></p><p class="line"></p><p class="line shorter"></p>
      </section>`,
    )
    .join('');
  return `<!doctype html><meta charset="utf-8"><title>Field notes</title>
<style>
  body{margin:0;font-family:${FONT};background:#fff;color:#1d2733}
  header{position:sticky;top:0;background:#1b365d;color:#fff;padding:18px 40px;font-weight:700;font-size:22px}
  main{max-width:760px;margin:0 auto;padding:30px 40px 80px}
  h1{font-size:44px;margin:20px 0 10px}
  h2{font-size:26px;margin:44px 0 16px}
  .figure{height:260px;border-radius:14px}
  .line{height:14px;background:#e3e8ee;border-radius:7px;margin:14px 0}
  .short{width:80%}.shorter{width:55%}
</style>
<header>Field notes</header>
<main><h1>A very long page</h1><p class="line"></p><p class="line short"></p>${sections}</main>`;
}

function frame(width, height, body) {
  return `<!doctype html><meta charset="utf-8">
<style>
  *{box-sizing:border-box}
  html,body{margin:0;width:${width}px;height:${height}px;overflow:hidden}
  body{font-family:${FONT};background:linear-gradient(135deg,#0f2440,#1b365d 60%,#24497a);color:#fff}
</style>${body}`;
}

function browserWindow(inner) {
  return `<div style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 30px 60px rgba(0,0,0,.35)">
    <div style="height:44px;background:#e9edf2;display:flex;align-items:center;gap:8px;padding:0 14px">
      <span style="width:12px;height:12px;border-radius:50%;background:#ff5f57"></span>
      <span style="width:12px;height:12px;border-radius:50%;background:#febc2e"></span>
      <span style="width:12px;height:12px;border-radius:50%;background:#28c840"></span>
      <div style="flex:1;margin:0 14px;height:26px;border-radius:13px;background:#fff"></div>
      <img src="${ICON}" style="width:24px;height:24px;border-radius:5px;outline:3px solid #4c9aff;outline-offset:3px">
    </div>${inner}</div>`;
}

const server = createServer((_, res) => {
  res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
  res.end(demoPage());
});
await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
const url = `http://127.0.0.1:${server.address().port}/`;

const browser = await puppeteer.launch({
  executablePath: findChrome(),
  headless: true,
  pipe: true,
  args: process.env.E2E_NO_SANDBOX === '1' ? ['--no-sandbox'] : [],
});

try {
  const page = await browser.newPage();
  await page.setViewport({ width: 900, height: 560 });
  await page.goto(url, { waitUntil: 'load' });
  const viewport = `data:image/png;base64,${await page.screenshot({ encoding: 'base64' })}`;
  const full = `data:image/png;base64,${await page.screenshot({ encoding: 'base64', fullPage: true })}`;

  async function render(name, width, height, html) {
    await page.setViewport({ width, height });
    await page.setContent(html, { waitUntil: 'load' });
    const file = join(OUT, name);
    writeFileSync(file, await page.screenshot({ type: 'png' }));
    console.log(`store/images/${name}`);
  }

  mkdirSync(OUT, { recursive: true });

  await render(
    'screenshot-1.png',
    1280,
    800,
    frame(
      1280,
      800,
      `<div style="position:absolute;left:60px;top:60px;width:660px">
        <div style="font-size:50px;font-weight:800;line-height:1.1">The whole page.<br>One click.</div>
        <div style="font-size:22px;opacity:.85;margin-top:20px;line-height:1.5">Click the toolbar button or press Alt+Shift+P.<br>The page, top to bottom, saved as one PNG.</div>
      </div>
      <div style="position:absolute;left:60px;top:310px;width:620px">${browserWindow(
        `<img src="${viewport}" style="display:block;width:100%">`,
      )}</div>
      <div style="position:absolute;left:720px;top:70px;width:500px;height:690px;display:flex;flex-direction:column;align-items:center">
        <div style="font-size:16px;font-weight:600;opacity:.85;margin-bottom:14px;white-space:nowrap">Downloads/plainshot/example.com-20261106-142530.png</div>
        <div style="flex:1;display:flex;align-items:flex-start;justify-content:center;min-height:0">
          <img src="${full}" style="max-height:100%;max-width:100%;border-radius:8px;box-shadow:0 30px 60px rgba(0,0,0,.4)">
        </div>
      </div>`,
    ),
  );

  const bullet = (title, text) =>
    `<div style="margin-bottom:30px"><div style="font-size:28px;font-weight:700">${title}</div>
     <div style="font-size:20px;opacity:.8;margin-top:6px">${text}</div></div>`;

  await render(
    'screenshot-2.png',
    1280,
    800,
    frame(
      1280,
      800,
      `<div style="position:absolute;left:80px;top:90px;width:600px">
        <div style="font-size:48px;font-weight:800;margin-bottom:46px">Private by design</div>
        ${bullet('No upload, no account', 'The image is made in your browser and saved to your computer.')}
        ${bullet('No tracking', 'No analytics and no network requests of any kind.')}
        ${bullet('Only the tab you click', 'No access to any other site, ever.')}
        ${bullet('Open source', 'MIT licensed, on GitHub.')}
      </div>
      <div style="position:absolute;left:780px;top:220px;width:400px">
        <div style="display:flex;justify-content:flex-end;margin-bottom:12px">
          <img src="${ICON}" style="width:56px;height:56px;border-radius:12px;box-shadow:0 10px 30px rgba(0,0,0,.4)">
        </div>
        <div style="background:#fff;color:#1d2733;border-radius:12px;padding:10px 0;font-size:22px;box-shadow:0 30px 60px rgba(0,0,0,.35)">
          <div style="padding:14px 26px;font-weight:600">Plainshot — Full Page Screenshot</div>
          <div style="height:1px;background:#e3e8ee;margin:4px 0"></div>
          <div style="padding:14px 26px;background:#e8f0fe">Report a problem</div>
          <div style="padding:14px 26px">GitHub</div>
        </div>
        <div style="font-size:18px;opacity:.8;margin-top:16px;text-align:right">Right-click the toolbar button</div>
      </div>`,
    ),
  );

  await render(
    'promo-small.png',
    440,
    280,
    frame(
      440,
      280,
      `<div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;gap:14px">
        <img src="${ICON}" style="width:96px;height:96px">
        <div style="font-size:34px;font-weight:800">Plainshot</div>
        <div style="font-size:17px;opacity:.85">The whole page. One click.</div>
      </div>`,
    ),
  );

  mkdirSync(OUT, { recursive: true });
  writeFileSync(join(OUT, 'logo-300.png'), iconPng(300));
  console.log('store/images/logo-300.png');
} finally {
  await browser.close();
  server.close();
}
