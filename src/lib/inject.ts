import { CaptureFailedError } from './errors.js';

/**
 * Runs one of the self-contained functions from capture/injected.ts inside the
 * page and returns its value. Arguments must be JSON-serialisable.
 */
export async function runInPage<A extends unknown[], R>(
  tabId: number,
  func: (...args: A) => R | Promise<R>,
  args: A,
): Promise<R> {
  const [injection] = await chrome.scripting.executeScript({
    target: { tabId },
    func: func as (...injected: unknown[]) => unknown,
    args,
  });
  if (!injection || injection.result === undefined || injection.result === null) {
    throw new CaptureFailedError('the page returned no result for an injected script');
  }
  return injection.result as R;
}
