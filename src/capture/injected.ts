import type { PageMetrics } from '../types.js';

// Everything in this file is serialised with Function.prototype.toString() and
// evaluated inside the page, so each function must be entirely self-contained:
// no imports, no module-level constants, no closures. Type-only imports are
// erased at build time and are therefore safe.

export function measurePage(): PageMetrics {
  const doc = document.documentElement;
  const body = document.body;
  const height = Math.max(
    doc.scrollHeight,
    doc.offsetHeight,
    doc.clientHeight,
    body ? body.scrollHeight : 0,
    body ? body.offsetHeight : 0,
  );
  return {
    // clientWidth excludes the vertical scrollbar, which we do not want in the
    // stitched image.
    width: doc.clientWidth,
    height,
    viewportHeight: doc.clientHeight,
    devicePixelRatio: window.devicePixelRatio,
  };
}

/** Scrolls to `y` and reports where the page actually landed. */
export function scrollToY(y: number): number {
  const doc = document.documentElement;
  const previous = doc.style.scrollBehavior;
  doc.style.scrollBehavior = 'auto';
  window.scrollTo(0, y);
  doc.style.scrollBehavior = previous;
  return window.scrollY;
}

/**
 * Walks the page once so lazy loaders fill in, then returns to where the user
 * was. Only the scroll position is changed; sticky elements are left alone.
 */
export async function preloadLazyContent(
  stepDelayMs: number,
  maxSteps: number,
): Promise<PageMetrics> {
  const doc = document.documentElement;
  const originalX = window.scrollX;
  const originalY = window.scrollY;
  const originalBehavior = doc.style.scrollBehavior;
  doc.style.scrollBehavior = 'auto';

  // Native lazy images start fetching the moment the attribute flips to eager.
  document.querySelectorAll('img[loading="lazy"]').forEach((img) => {
    (img as HTMLImageElement).loading = 'eager';
  });

  const sleep = (ms: number): Promise<void> =>
    new Promise((resolve) => {
      setTimeout(resolve, ms);
    });

  const pageHeight = (): number =>
    Math.max(doc.scrollHeight, doc.offsetHeight, document.body ? document.body.scrollHeight : 0);

  // Script-driven lazy loaders only react to real scrolling, so walk the page
  // once. maxSteps stops infinite-scroll pages from running forever.
  const step = Math.max(1, doc.clientHeight);
  let steps = 0;
  for (let y = 0; y < pageHeight() && steps < maxSteps; y += step) {
    window.scrollTo(0, y);
    await sleep(stepDelayMs);
    steps += 1;
  }
  window.scrollTo(0, pageHeight());
  await sleep(stepDelayMs);

  // Give decoding a chance to finish before we start capturing.
  await Promise.all(
    Array.from(document.images)
      .filter((img) => !img.complete)
      .slice(0, 200)
      .map((img) => img.decode().catch(() => undefined)),
  );

  window.scrollTo(originalX, originalY);
  await sleep(80);
  doc.style.scrollBehavior = originalBehavior;

  const height = pageHeight();
  return {
    width: doc.clientWidth,
    height,
    viewportHeight: doc.clientHeight,
    devicePixelRatio: window.devicePixelRatio,
  };
}

/** Current vertical scroll offset, so it can be restored after capturing. */
export function readScrollY(): number {
  return window.scrollY;
}
