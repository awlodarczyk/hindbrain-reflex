/** A width/height pair in either logical points or device pixels. */
export type CaptureSize = { readonly width: number; readonly height: number };

/** Pixel count a captured JPEG is kept under so it stays well within `MAX_IMAGE_BYTES`. */
export const MAX_CAPTURE_PIXELS = 8_000_000;

/**
 * Scales `layout` (logical points) by `pixelRatio` into device pixels, then shrinks the
 * result (keeping aspect ratio) so its pixel count never exceeds `maxPixels`. Pure and
 * synchronous — pass `PixelRatio.get()` in rather than reading it here, so this stays testable.
 */
export function computeCaptureSize(layout: CaptureSize, pixelRatio: number, maxPixels: number): CaptureSize {
  const rawWidth = layout.width * pixelRatio;
  const rawHeight = layout.height * pixelRatio;
  const rawPixels = rawWidth * rawHeight;
  const scale = rawPixels > maxPixels && rawPixels > 0 ? Math.sqrt(maxPixels / rawPixels) : 1;
  return { width: Math.round(rawWidth * scale), height: Math.round(rawHeight * scale) };
}
