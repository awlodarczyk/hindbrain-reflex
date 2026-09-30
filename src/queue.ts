import type { SubmitInput } from "./shared";
import type { Api } from "./api";
import type { EventEnvelope } from "./envelope/build";
import { uploadAll, type AttachmentFile } from "./attachments";

const QUEUE_KEY = "@hindbrain/queue";

export interface Storage {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
}

type LegacyItem = Omit<SubmitInput, "publicKey">;
type EnvelopeItem = { readonly envelope: EventEnvelope; readonly files?: readonly AttachmentFile[] };
type QueueItem = LegacyItem | EnvelopeItem;

export interface Queue {
  /** v1 payload; kept so reports queued by older SDK versions still get delivered. */
  enqueue(item: LegacyItem): Promise<void>;
  /** Queues an envelope (and any files still to upload) for the next flush. */
  enqueueEnvelope(envelope: EventEnvelope, files?: readonly AttachmentFile[]): Promise<void>;
  /** Resends everything queued; returns how many items are still pending. */
  flush(api: Pick<Api, "submit" | "submitEnvelope" | "uploadFile" | "attachmentDone">): Promise<number>;
}

const isEnvelopeItem = (item: QueueItem): item is EnvelopeItem => "envelope" in item;

async function readQueue(storage: Storage): Promise<QueueItem[]> {
  const raw = await storage.getItem(QUEUE_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as QueueItem[];
  } catch {
    return [];
  }
}

async function writeQueue(storage: Storage, items: QueueItem[]): Promise<void> {
  await storage.setItem(QUEUE_KEY, JSON.stringify(items));
}

export function createQueue(storage: Storage): Queue {
  const append = async (item: QueueItem) => writeQueue(storage, [...(await readQueue(storage)), item]);
  return {
    enqueue: append,
    enqueueEnvelope: (envelope, files = []) => append(files.length > 0 ? { envelope, files } : { envelope }),

    async flush(api) {
      const pending = await readQueue(storage);
      if (pending.length === 0) return 0;

      const sendEnvelope = async (item: EnvelopeItem): Promise<boolean> => {
        const res = await api.submitEnvelope(item.envelope);
        if (!res.success || !res.data) return false;
        return uploadAll(api, res.data.id, res.data.uploads ?? [], item.files ?? []);
      };
      const send = (item: QueueItem) =>
        (isEnvelopeItem(item) ? sendEnvelope(item) : api.submit(item).then((res) => res.success)).catch(() => false);
      const results = await Promise.all(pending.map(async (item) => ({ item, sent: await send(item) })));

      const remaining = results.filter((r) => !r.sent).map((r) => r.item);
      await writeQueue(storage, remaining);
      return remaining.length;
    },
  };
}
