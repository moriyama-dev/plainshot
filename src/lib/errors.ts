/**
 * Raised when a strategy cannot handle the page. The caller is expected to fall
 * back to the next strategy rather than surface this to the user.
 */
export class CaptureUnavailableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CaptureUnavailableError';
  }
}

/** Raised when no strategy can handle the page. */
export class CaptureFailedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CaptureFailedError';
  }
}
