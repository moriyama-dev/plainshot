/** Geometry of the page being captured, measured in CSS pixels. */
export interface PageMetrics {
  width: number;
  height: number;
  viewportHeight: number;
  devicePixelRatio: number;
}

/** Which strategy produced an image. */
export type CaptureMethod = 'cdp' | 'scroll';

export interface CaptureResult {
  dataUrl: string;
  method: CaptureMethod;
  width: number;
  height: number;
}
