import type { HindbrainThemeOverride } from './types';
import { ok, fail, type ApiResult } from "./shared";
import type { SubmitInput, IdeaListItem } from "./shared";
import type { EventEnvelope } from "./envelope/build";
import { toFileUri, type Upload } from "./attachments";

/** Production ingest endpoint (self-hosted Supabase edge function behind Kong). */
export const DEFAULT_ENDPOINT = "https://reporter-api.hindbrain.io/functions/v1/ingest";

type FetchImpl = (url: string, init: RequestInit) => Promise<{ ok: boolean; status: number; json: () => Promise<unknown>; blob?: () => Promise<Blob> }>;

export type SubmitResult = { id: string; uploads: Upload[] };

export interface Api {
  submit(input: Omit<SubmitInput, "publicKey">): Promise<ApiResult<{ id: string }>>;
  /** Sends a v2 envelope; `sentAt` is refreshed on every attempt, `eventId` keeps retries idempotent. */
  submitEnvelope(envelope: EventEnvelope): Promise<ApiResult<SubmitResult>>;
  /** PUTs a local file (file:// URI) to a signed upload URL; true on 2xx. */
  uploadFile(url: string, uri: string, mime: string): Promise<boolean>;
  attachmentDone(submissionId: string, attachmentId: string): Promise<ApiResult<{ status: "ready" | "failed" }>>;
  vote(submissionId: string, fingerprint: string): Promise<ApiResult<null>>;
  listIdeas(fingerprint: string): Promise<ApiResult<IdeaListItem[]>>;
  /**
   * The app's SDK config. Pass the cached revision to be told `unchanged`
   * instead of receiving the whole document again.
   */
  getConfig(revision: number | null): Promise<ApiResult<RemoteConfigResponse>>;
}

/** Either the document, or confirmation that the cached one is still current. */
export type RemoteConfigResponse =
  | { revision: number; theme: HindbrainThemeOverride; unchanged?: undefined }
  | { revision: number; unchanged: true };

export interface ApiConfig {
  publicKey: string;
  /** Override the API endpoint. Defaults to DEFAULT_ENDPOINT (Hindbrain cloud). */
  endpoint?: string;
  fetchImpl?: FetchImpl;
  now?: () => Date;
}

async function postAction<T>(
  endpoint: string,
  publicKey: string,
  fetchImpl: FetchImpl,
  action: string,
  payload: Record<string, unknown>,
): Promise<ApiResult<T>> {
  if (!publicKey) {
    return fail("publicKey is required");
  }
  try {
    const body = JSON.stringify({ action, publicKey, ...payload });
    const res = await fetchImpl(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
    });
    const json = await res.json() as { success: boolean; data: T | null; error: string | null };
    if (json.success) {
      return ok(json.data as T);
    }
    return fail(json.error ?? "Unknown error");
  } catch (err) {
    return fail(err instanceof Error ? err.message : String(err));
  }
}

export function createApi({ publicKey, endpoint, fetchImpl, now = () => new Date() }: ApiConfig): Api {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const fetch_: FetchImpl = fetchImpl ?? ((globalThis as any).fetch as FetchImpl);
  const endpoint_ = endpoint ?? DEFAULT_ENDPOINT;

  return {
    submit(input) {
      return postAction<{ id: string }>(endpoint_, publicKey, fetch_, "submit", input as unknown as Record<string, unknown>);
    },
    submitEnvelope(envelope) {
      return postAction<SubmitResult>(endpoint_, publicKey, fetch_, "submit", {
        envelope: { ...envelope, sentAt: now().toISOString() },
      });
    },
    async uploadFile(url, uri, mime) {
      try {
        const file = await fetch_(toFileUri(uri), {});
        const body = file.blob ? await file.blob() : undefined;
        if (!body) return false;
        const res = await fetch_(url, { method: "PUT", headers: { "content-type": mime, "x-upsert": "true" }, body });
        return res.ok;
      } catch {
        return false;
      }
    },
    attachmentDone(submissionId, attachmentId) {
      return postAction<{ status: "ready" | "failed" }>(endpoint_, publicKey, fetch_, "attachment_done", { submissionId, attachmentId });
    },
    vote(submissionId, fingerprint) {
      return postAction<null>(endpoint_, publicKey, fetch_, "vote", { submissionId, fingerprint });
    },
    getConfig(revision) {
      return postAction<RemoteConfigResponse>(
        endpoint_,
        publicKey,
        fetch_,
        "get_config",
        revision === null ? {} : { revision },
      );
    },
    listIdeas(fingerprint) {
      return postAction<IdeaListItem[]>(endpoint_, publicKey, fetch_, "list_ideas", { fingerprint });
    },
  };
}
