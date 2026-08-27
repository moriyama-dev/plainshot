import { CaptureUnavailableError } from '../lib/errors.js';
import type { CaptureResult } from '../types.js';

const PROTOCOL_VERSION = '1.3';

// captureBeyondViewport renders the whole page into one compositor texture, so
// it stops working past the GPU's maximum texture size. Taller pages have to go
// through the scrolling fallback.
const MAX_DIMENSION = 16384;

interface ContentSize {
  width: number;
  height: number;
}

interface LayoutMetrics {
  cssContentSize?: ContentSize;
  contentSize?: ContentSize;
}

interface Screenshot {
  data?: string;
}

async function send<T>(
  target: chrome.debugger.Debuggee,
  method: string,
  params?: Record<string, unknown>,
): Promise<T> {
  const response = await chrome.debugger.sendCommand(target, method, params);
  return response as unknown as T;
}

/**
 * Captures the page in a single pass over the DevTools protocol. There are no
 * seams and no repeated sticky headers, but the browser shows its "being
 * debugged" bar for the duration.
 */
export async function captureWithDebugger(tabId: number): Promise<CaptureResult> {
  const target: chrome.debugger.Debuggee = { tabId };

  try {
    await chrome.debugger.attach(target, PROTOCOL_VERSION);
  } catch (cause) {
    // Another client (an open DevTools window, or another extension) already
    // owns this tab.
    throw new CaptureUnavailableError(`could not attach the debugger: ${String(cause)}`);
  }

  try {
    await send(target, 'Page.enable');

    const metrics = await send<LayoutMetrics>(target, 'Page.getLayoutMetrics');
    const size = metrics.cssContentSize ?? metrics.contentSize;
    if (!size) {
      throw new CaptureUnavailableError('the page reported no content size');
    }

    const width = Math.ceil(size.width);
    const height = Math.ceil(size.height);
    if (width < 1 || height < 1) {
      throw new CaptureUnavailableError(`the page reported an empty area (${width}x${height})`);
    }
    if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
      throw new CaptureUnavailableError(
        `the page is ${width}x${height}, larger than the ${MAX_DIMENSION}px single-shot limit`,
      );
    }

    const shot = await send<Screenshot>(target, 'Page.captureScreenshot', {
      format: 'png',
      captureBeyondViewport: true,
      clip: { x: 0, y: 0, width, height, scale: 1 },
    });
    if (!shot.data) {
      throw new CaptureUnavailableError('the browser returned an empty screenshot');
    }

    return { dataUrl: `data:image/png;base64,${shot.data}`, method: 'cdp', width, height };
  } catch (cause) {
    if (cause instanceof CaptureUnavailableError) throw cause;
    throw new CaptureUnavailableError(`single-shot capture failed: ${String(cause)}`);
  } finally {
    await chrome.debugger.detach(target).catch(() => undefined);
  }
}
