import { Dimensions, PixelRatio } from 'react-native';
import { canAdd, MAX_IMAGE_BYTES, toFileUri, type LocalAttachment } from './attachments';
import { computeCaptureSize, MAX_CAPTURE_PIXELS, type CaptureSize } from './capture-size';
import { uuidV4 } from './installation';
import type { ImagePicker, PickedAsset, ViewShot } from './optional';

/** Development builds log why a capture failed; production stays quiet. */
const devWarn = (message: string, err: unknown): void => {
  if ((globalThis as { __DEV__?: boolean }).__DEV__) console.warn(`[hindbrain] ${message}`, err);
};

/** Size of a local file in bytes, read through fetch(file://); 0 when unknown. */
async function fileSize(uri: string): Promise<number> {
  try {
    const res = await fetch(toFileUri(uri));
    return (await res.blob()).size;
  } catch {
    return 0;
  }
}

/** Renders `view` to a JPEG temp file; null when view-shot is missing, the view is gone, or capture fails. */
export async function flattenView(
  viewShot: ViewShot | null,
  view: unknown,
  quality = 0.8,
  size?: CaptureSize,
): Promise<{ uri: string; bytes: number } | null> {
  if (!viewShot || !view) return null;
  try {
    const uri = toFileUri(await viewShot.captureRef(view, { format: 'jpg', quality, result: 'tmpfile', ...size }));
    const bytes = await fileSize(uri);
    if (bytes <= 0) devWarn('capture produced an empty file', uri);
    return bytes > 0 ? { uri, bytes } : null;
  } catch (err) {
    devWarn('capture failed', err);
    return null;
  }
}

/** Output pixel size for a full-screen capture: the window's logical size scaled by the device's pixel ratio, capped at `MAX_CAPTURE_PIXELS`. */
function screenCaptureSize(): CaptureSize {
  const { width, height } = Dimensions.get('window');
  return computeCaptureSize({ width, height }, PixelRatio.get(), MAX_CAPTURE_PIXELS);
}

/** JPEG of `view` (a ref object, node handle or instance — whatever view-shot accepts) taken before the sheet opens; null when view-shot is missing or fails. */
export async function captureScreenshot(viewShot: ViewShot | null, view: unknown): Promise<LocalAttachment | null> {
  const highRes = await flattenView(viewShot, view, 0.9, screenCaptureSize());
  // A pathologically large screen can still overflow the upload limit even after the pixel cap; fall back to the old, smaller-file behaviour instead of returning something the uploader will reject.
  const file = highRes && highRes.bytes > MAX_IMAGE_BYTES ? await flattenView(viewShot, view) : highRes;
  return file ? { clientId: uuidV4(), kind: 'screenshot', mime: 'image/jpeg', ...file } : null;
}

function fromAsset(asset: PickedAsset, bytes: number): LocalAttachment {
  const video = asset.type === 'video' || asset.mimeType?.startsWith('video/') === true;
  return {
    clientId: uuidV4(),
    kind: video ? 'video' : 'image',
    mime: asset.mimeType ?? (video ? 'video/mp4' : 'image/jpeg'),
    bytes,
    uri: asset.uri,
    ...(asset.width ? { width: Math.round(asset.width) } : {}),
    ...(asset.height ? { height: Math.round(asset.height) } : {}),
    ...(video && asset.duration ? { durationMs: Math.round(asset.duration) } : {}),
  };
}

/**
 * Lets the user pick photos/videos from the library and returns the ones that still fit
 * the report limits next to `current` (5 images, 1 video, 5 MB / 50 MB).
 */
export async function pickMedia(picker: ImagePicker | null, current: readonly LocalAttachment[]): Promise<LocalAttachment[]> {
  if (!picker) return [];
  const result = await picker.launchImageLibraryAsync({ mediaTypes: ['images', 'videos'], allowsMultipleSelection: true, selectionLimit: 5, quality: 0.8 });
  if (result.canceled || !result.assets) return [];
  const added: LocalAttachment[] = [];
  for (const asset of result.assets) {
    const candidate = fromAsset(asset, asset.fileSize ?? (await fileSize(asset.uri)));
    if (candidate.bytes > 0 && canAdd([...current, ...added], candidate)) added.push(candidate);
  }
  return added;
}
