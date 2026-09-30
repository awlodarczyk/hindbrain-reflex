import { createApi } from "../api";
import { createQueue } from "../queue";
import { buildEnvelope } from "../envelope/build";

const envelope = () =>
  buildEnvelope({
    report: { type: "bug", body: "b", trigger: "shake" },
    context: { app: { version: "1" }, os: { name: "iOS", version: "18" } },
    installationId: "3f1d2c4e-0000-4000-8000-000000000a92",
    breadcrumbs: [],
    screen: null,
    occurredAt: new Date("2026-09-22T09:00:00.000Z"),
  });

function memoryStorage() {
  const store: Record<string, string> = {};
  return { store, getItem: async (k: string) => store[k] ?? null, setItem: async (k: string, v: string) => { store[k] = v; } };
}

test("submitEnvelope posts action=submit with the envelope and a fresh sentAt", async () => {
  const bodies: Record<string, any>[] = [];
  const api = createApi({
    publicKey: "hb_pub_" + "a".repeat(32),
    endpoint: "http://x/ingest",
    fetchImpl: async (_u, init) => { bodies.push(JSON.parse(init.body as string)); return { ok: true, status: 200, json: async () => ({ success: true, data: { id: "s1" }, error: null }) }; },
    now: () => new Date("2026-09-22T10:00:00.000Z"),
  });
  const e = envelope();
  const res = await api.submitEnvelope(e);
  expect(res).toEqual({ success: true, data: { id: "s1" }, error: null });
  expect(bodies[0].action).toBe("submit");
  expect(bodies[0].envelope.eventId).toBe(e.eventId);
  expect(bodies[0].envelope.occurredAt).toBe("2026-09-22T09:00:00.000Z");
  expect(bodies[0].envelope.sentAt).toBe("2026-09-22T10:00:00.000Z");
});

test("queued envelopes are resent with the same eventId; legacy v1 items still go through submit", async () => {
  const storage = memoryStorage();
  const legacy = { type: "bug" as const, title: "t", body: "b", deviceMeta: { os: "ios", osVersion: "1", appVersion: "1", model: "m" } };
  storage.store["@hindbrain/queue"] = JSON.stringify([legacy]);
  const q = createQueue(storage);
  const e = envelope();
  await q.enqueueEnvelope(e);
  const sentEnvelopes: string[] = [];
  const sentLegacy: unknown[] = [];
  const api = {
    submit: async (i: unknown) => { sentLegacy.push(i); return { success: true, data: { id: "a" }, error: null }; },
    submitEnvelope: async (x: { eventId: string }) => { sentEnvelopes.push(x.eventId); return { success: true, data: { id: "b", uploads: [] }, error: null }; },
    uploadFile: async () => true,
    attachmentDone: async () => ({ success: true, data: { status: "ready" as const }, error: null }),
  };
  expect(await q.flush(api)).toBe(0);
  expect(sentEnvelopes).toEqual([e.eventId]);
  expect(sentLegacy).toEqual([legacy]);
});

test("failed envelopes stay queued", async () => {
  const q = createQueue(memoryStorage());
  await q.enqueueEnvelope(envelope());
  const api = {
    submit: async () => ({ success: true, data: { id: "a" }, error: null }),
    submitEnvelope: async () => ({ success: false, data: null, error: "offline" }),
    uploadFile: async () => true,
    attachmentDone: async () => ({ success: true, data: { status: "ready" as const }, error: null }),
  };
  expect(await q.flush(api)).toBe(1);
  expect(await q.flush(api)).toBe(1);
});
