import { createApi } from "../api";
import { createReportSender } from "../envelope/send";
import { createQueue } from "../queue";
import type { LocalAttachment } from "../attachments";

const shot: LocalAttachment = { clientId: "a1", kind: "screenshot", mime: "image/jpeg", bytes: 3000, uri: "file:///tmp/shot.jpg" };

type Call = { url: string; method: string; body: any; headers?: any };

function fakeFetch(opts: { uploadStatus?: number; attachmentStatus?: string } = {}) {
  const calls: Call[] = [];
  const fetchImpl = async (url: string, init: RequestInit = {}) => {
    const call: Call = { url, method: init.method ?? "GET", body: init.body, headers: init.headers };
    calls.push(call);
    if (url.startsWith("file://")) return { ok: true, status: 200, blob: async () => ({ size: 3000, name: "blob" }), json: async () => ({}) };
    if (call.method === "PUT") return { ok: (opts.uploadStatus ?? 200) < 300, status: opts.uploadStatus ?? 200, json: async () => ({}) };
    const body = JSON.parse(init.body as string);
    const data =
      body.action === "submit" ? { id: "sub-1", uploads: body.envelope.attachments?.length ? [{ clientId: "a1", attachmentId: "att-1", url: "https://api/storage/v1/object/upload/sign/x?token=t", expiresAt: "z" }] : [] }
      : body.action === "attachment_done" ? { status: opts.attachmentStatus ?? "ready" }
      : null;
    return { ok: true, status: 200, json: async () => ({ success: true, data, error: null }) };
  };
  return { calls, fetchImpl: fetchImpl as any };
}

function memoryStorage() {
  const store: Record<string, string> = {};
  return { store, getItem: async (k: string) => store[k] ?? null, setItem: async (k: string, v: string) => { store[k] = v; } };
}

function sender(fetchImpl: any, storage = memoryStorage()) {
  const api = createApi({ publicKey: "hb_pub_" + "a".repeat(32), endpoint: "https://api/functions/v1/ingest", fetchImpl });
  const queue = createQueue(storage);
  const send = createReportSender({
    api, queue,
    getInstallationId: async () => "3f1d2c4e-0000-4000-8000-000000000a92",
    getBreadcrumbs: () => [], getCurrentScreen: () => null,
    collectDeviceContext: () => ({ app: { version: "1" }, os: { name: "iOS", version: "18" } }),
  });
  return { api, queue, send, storage };
}

test("declares attachments, PUTs the file to the signed URL and confirms it", async () => {
  const { calls, fetchImpl } = fakeFetch();
  const { send, storage } = sender(fetchImpl);
  const result = await send({ type: "bug", body: "b", trigger: "shake" }, new Date(), [shot]);
  expect(result).toEqual({ status: "sent", id: "sub-1" });
  const submit = JSON.parse(calls.find((c) => c.method === "POST")!.body);
  expect(submit.envelope.attachments).toEqual([{ clientId: "a1", kind: "screenshot", mime: "image/jpeg", bytes: 3000 }]);
  const put = calls.find((c) => c.method === "PUT")!;
  expect(put.url).toBe("https://api/storage/v1/object/upload/sign/x?token=t");
  expect(put.headers["content-type"]).toBe("image/jpeg");
  const done = calls.map((c) => (c.method === "POST" ? JSON.parse(c.body) : null)).find((b) => b?.action === "attachment_done");
  expect(done).toMatchObject({ submissionId: "sub-1", attachmentId: "att-1" });
  expect(storage.store["@hindbrain/queue"] ?? "[]").toBe("[]");
});

test("a failed upload keeps the report sent but queues the file for another try", async () => {
  const { fetchImpl } = fakeFetch({ uploadStatus: 500 });
  const { send, storage } = sender(fetchImpl);
  expect(await send({ type: "bug", body: "b", trigger: "shake" }, new Date(), [shot])).toEqual({ status: "sent", id: "sub-1" });
  const queued = JSON.parse(storage.store["@hindbrain/queue"]);
  expect(queued).toHaveLength(1);
  expect(queued[0].files).toEqual([{ clientId: "a1", uri: "file:///tmp/shot.jpg", mime: "image/jpeg" }]);
});

test("flush resubmits the same envelope and uploads the pending file", async () => {
  const bad = fakeFetch({ uploadStatus: 500 });
  const storage = memoryStorage();
  await sender(bad.fetchImpl, storage).send({ type: "bug", body: "b", trigger: "shake" }, new Date(), [shot]);
  const good = fakeFetch();
  const { api, queue } = sender(good.fetchImpl, storage);
  expect(await queue.flush(api)).toBe(0);
  expect(good.calls.filter((c) => c.method === "PUT")).toHaveLength(1);
  expect(JSON.parse(storage.store["@hindbrain/queue"])).toEqual([]);
});

test("a report without attachments sends no PUT", async () => {
  const { calls, fetchImpl } = fakeFetch();
  await sender(fetchImpl).send({ type: "bug", body: "b", trigger: "api" }, new Date(), []);
  expect(calls.filter((c) => c.method === "PUT")).toHaveLength(0);
});

test("a bare file path from view-shot is read as file://, not fetched from the bundler", async () => {
  const { calls, fetchImpl } = fakeFetch();
  const api = createApi({ publicKey: "hb_pub_" + "a".repeat(32), endpoint: "https://api/functions/v1/ingest", fetchImpl });
  expect(await api.uploadFile("https://api/upload", "/private/var/mobile/tmp/ReactNative/shot.jpg", "image/jpeg")).toBe(true);
  expect(calls[0].url).toBe("file:///private/var/mobile/tmp/ReactNative/shot.jpg");
});
