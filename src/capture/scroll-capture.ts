import { blobToDataUrl } from '../lib/base64.js';
import { CaptureFailedError } from '../lib/errors.js';
import { runInPage } from '../lib/inject.js';
import { measurePage, readScrollY, scrollToY } from './injected.js';
import type { CaptureResult, PageMetrics } from '../types.js';

// captureVisibleTab is quota-limited to roughly two calls per second; going
// faster makes it reject instead of returning an image.
const CAPTURE_INTERVAL_MS = 350;

// Time for sticky elements and scroll-linked animations to settle after a jump.
const SETTLE_MS = 120;

// 16384 x 16384. Past this the canvas allocation itself starts failing.
const MAX_CANVAS_PIXELS = 268_435_456;

let lastCaptureAt = 0;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

async function captureVisible(windowId: number): Promise<string> {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const wait = CAPTURE_INTERVAL_MS - (Date.now() - lastCaptureAt);
    if (wait > 0) await sleep(wait);
    try {
      const dataUrl = await chrome.tabs.captureVisibleTab(windowId, { format: 'png' });
      lastCaptureAt = Date.now();
      return dataUrl;
    } catch (cause) {
      lastCaptureAt = Date.now();
      if (attempt === 2) {
        throw new CaptureFailedError(`the browser refused to capture the tab: ${String(cause)}`);
      }
    }
  }
  throw new CaptureFailedError('the browser refused to capture the tab');
}

/**
 * Fallback path: scroll the page one viewport at a time, capture what is
 * visible, and stitch the strips together. Slower than the single-shot path and
 * it repeats any fixed-position element, but it works on pages of any height
 * and needs no debugger session.
 */
export async function captureByScrolling(
  tabId: number,
  windowId: number,
  known?: PageMetrics,
): Promise<CaptureResult> {
  const metrics = known ?? (await runInPage(tabId, measurePage, []));
  const ratio = metrics.devicePixelRatio > 0 ? metrics.devicePixelRatio : 1;

  const canvasWidth = Math.round(metrics.width * ratio);
  const canvasHeight = Math.round(metrics.height * ratio);
  if (canvasWidth < 1 || canvasHeight < 1) {
    throw new CaptureFailedError(`the page has no visible area (${canvasWidth}x${canvasHeight})`);
  }
  if (canvasWidth * canvasHeight > MAX_CANVAS_PIXELS) {
    throw new CaptureFailedError(
      `the page is ${canvasWidth}x${canvasHeight} device pixels, too large to assemble`,
    );
  }

  const canvas = new OffscreenCanvas(canvasWidth, canvasHeight);
  const context = canvas.getContext('2d');
  if (!context) {
    throw new CaptureFailedError('could not open a drawing surface');
  }

  const startedAt = await runInPage(tabId, readScrollY, []).catch(() => 0);
  const step = Math.max(1, metrics.viewportHeight);
  let previousY = -1;

  try {
    for (let y = 0; y < metrics.height; y += step) {
      const landedY = await runInPage(tabId, scrollToY, [y]);
      // The page stopped moving before we reached the bottom: nothing new to add.
      if (landedY === previousY) break;
      previousY = landedY;

      await sleep(SETTLE_MS);
      const strip = await captureVisible(windowId);
      const bitmap = await createImageBitmap(await (await fetch(strip)).blob());
      // Later strips overwrite earlier ones, so the clamped final scroll
      // position lands the last viewport exactly at the bottom edge.
      context.drawImage(bitmap, 0, Math.round(landedY * ratio));
      bitmap.close();

      if (landedY + metrics.viewportHeight >= metrics.height) break;
    }
  } finally {
    await runInPage(tabId, scrollToY, [startedAt]).catch(() => 0);
  }

  const blob = await canvas.convertToBlob({ type: 'image/png' });
  return {
    dataUrl: await blobToDataUrl(blob, 'image/png'),
    method: 'scroll',
    width: canvasWidth,
    height: canvasHeight,
  };
}
