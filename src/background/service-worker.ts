import { captureWithDebugger } from '../capture/cdp-capture.js';
import { preloadLazyContent } from '../capture/injected.js';
import { captureByScrolling } from '../capture/scroll-capture.js';
import { buildFilename } from '../lib/filename.js';
import { runInPage } from '../lib/inject.js';
import type { CaptureResult, PageMetrics } from '../types.js';

const CAPTURE_COMMAND = 'capture-full-page';

// Browser-owned pages never allow script injection or tab capture.
const RESTRICTED_SCHEME = /^(chrome|edge|about|devtools|view-source|chrome-extension):/i;
const RESTRICTED_HOSTS = new Set(['chromewebstore.google.com', 'microsoftedge.microsoft.com']);

const LAZY_STEP_DELAY_MS = 120;
const LAZY_MAX_STEPS = 40;
const BADGE_CLEAR_MS = 2500;

function isRestricted(url: string | undefined): boolean {
  if (!url) return true;
  if (RESTRICTED_SCHEME.test(url)) return true;
  try {
    return RESTRICTED_HOSTS.has(new URL(url).hostname);
  } catch {
    return true;
  }
}

async function setBadge(text: string, color: string): Promise<void> {
  await chrome.action.setBadgeText({ text });
  await chrome.action.setBadgeBackgroundColor({ color });
}

function clearBadgeLater(): void {
  setTimeout(() => {
    void chrome.action.setBadgeText({ text: '' });
  }, BADGE_CLEAR_MS);
}

async function capture(tab: chrome.tabs.Tab): Promise<void> {
  const tabId = tab.id;
  if (tabId === undefined) return;

  if (isRestricted(tab.url)) {
    console.warn(`Plainshot: ${chrome.i18n.getMessage('errRestrictedPage')} (${tab.url ?? ''})`);
    await setBadge('!', '#c62828');
    clearBadgeLater();
    return;
  }

  await setBadge('...', '#3b6fd4');

  try {
    // Walking the page first gives lazy loaders a chance to fill in, and hands
    // the fallback path its geometry for free.
    let metrics: PageMetrics | undefined;
    try {
      metrics = await runInPage(tabId, preloadLazyContent, [LAZY_STEP_DELAY_MS, LAZY_MAX_STEPS]);
    } catch (cause) {
      console.warn('Plainshot: skipped the lazy-load pass', cause);
    }

    let result: CaptureResult;
    try {
      result = await captureWithDebugger(tabId);
    } catch (cause) {
      console.warn('Plainshot: falling back to scroll-and-stitch', cause);
      result = await captureByScrolling(tabId, tab.windowId, metrics);
    }

    await chrome.downloads.download({
      url: result.dataUrl,
      filename: buildFilename(tab.url, new Date(), 'png'),
      saveAs: false,
    });

    console.warn(`Plainshot: captured ${result.width}x${result.height} via ${result.method}`);
    await setBadge('OK', '#2e7d32');
  } catch (cause) {
    console.error(`Plainshot: ${chrome.i18n.getMessage('errCaptureFailed')}`, cause);
    await setBadge('!', '#c62828');
  }

  clearBadgeLater();
}

chrome.action.onClicked.addListener((tab) => {
  void capture(tab);
});

chrome.commands.onCommand.addListener((command, tab) => {
  if (command !== CAPTURE_COMMAND) return;
  if (tab) {
    void capture(tab);
    return;
  }
  void chrome.tabs.query({ active: true, currentWindow: true }).then(([active]) => {
    if (active) void capture(active);
  });
});
