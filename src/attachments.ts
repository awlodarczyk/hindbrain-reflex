import type { Api } from './api';

/** A file picked or captured on the device, before upload. */
export type LocalAttachment = {
  readonly clientId: string;
  readonly kind: 'screenshot' | 'image' | 'video' | 'recording';
  readonly mime: string;
  readonly bytes: number;
  readonly uri: string;
  readonly width?: number;
  readonly height?: number;
  readonly durationMs?: number;
  readonly annotated?: boolean;
};

/** What the offline queue keeps to retry an upload. */
export type AttachmentFile = { readonly clientId: string; readonly uri: string; readonly mime: string };

/** A signed upload slot returned by ingest for one declared attachment. */
export type Upload = { readonly clientId: string; readonly attachmentId: string; readonly url: string; readonly expiresAt: string };

export type AttachmentDeclaration = Omit<LocalAttachment, 'uri'>;

export const MAX_IMAGES = 5;
export const MAX_VIDEOS = 1;
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
export const MAX_VIDEO_BYTES = 50 * 1024 * 1024;

export const isVideo = (a: Pick<LocalAttachment, 'kind'>): boolean => a.kind === 'video' || a.kind === 'recording';

export function toDeclaration({ uri: _uri, ...declaration }: LocalAttachment): AttachmentDeclaration {
  return declaration;
}

/**
 * Local files must be fetched as file:// URIs. Some native modules (react-native-view-shot)
 * return a bare path, which fetch would resolve against the bundle URL instead.
 */
export const toFileUri = (uri: string): string => (uri.startsWith('/') ? `file://${uri}` : uri);

export const toFile = (a: LocalAttachment): AttachmentFile => ({ clientId: a.clientId, uri: a.uri, mime: a.mime });

/** Whether `next` still fits the per-report limits (5 images, 1 video, size caps). */
export function canAdd(current: readonly LocalAttachment[], next: LocalAttachment): boolean {
  const video = isVideo(next);
  if (next.bytes > (video ? MAX_VIDEO_BYTES : MAX_IMAGE_BYTES)) return false;
  const count = current.filter((a) => isVideo(a) === video).length;
  return count < (video ? MAX_VIDEOS : MAX_IMAGES);
}

/**
 * Uploads each file to its signed URL and confirms it with ingest. Returns true only when
 * every upload is confirmed `ready`; files without a slot were already uploaded earlier.
 */
export async function uploadAll(
  api: Pick<Api, 'uploadFile' | 'attachmentDone'>,
  submissionId: string,
  uploads: readonly Upload[],
  files: readonly AttachmentFile[],
): Promise<boolean> {
  const results = await Promise.all(
    uploads.map(async (slot) => {
      const file = files.find((f) => f.clientId === slot.clientId);
      if (!file) return false;
      const put = await api.uploadFile(slot.url, file.uri, file.mime);
      if (!put) return false;
      const done = await api.attachmentDone(submissionId, slot.attachmentId);
      return done.success && done.data?.status === 'ready';
    }),
  );
  return results.every(Boolean);
}
