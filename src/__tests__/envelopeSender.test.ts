import { createReportSender } from "../envelope/send";
import type { EventEnvelope } from "../envelope/build";

function setup(submitOk: boolean) {
  const sent: EventEnvelope[] = [];
  const queued: EventEnvelope[] = [];
  const sender = createReportSender({
    api: { submitEnvelope: async (e) => { sent.push(e); return submitOk ? { success: true, data: { id: "s1", uploads: [] }, error: null } : { success: false, data: null, error: "Network request failed" }; },
      uploadFile: async () => true,
      attachmentDone: async () => ({ success: true, data: { status: "ready" as const }, error: null }) },
    queue: { enqueueEnvelope: async (e) => { queued.push(e); } },
    getInstallationId: async () => "3f1d2c4e-0000-4000-8000-000000000a92",
    getBreadcrumbs: () => [{ ts: "2026-09-22T09:13:51.004Z", category: "navigation", message: "/plan" }],
    getCurrentScreen: () => "/plan",
    collectDeviceContext: () => ({ app: { version: "1.4.0" }, os: { name: "iOS", version: "18.6" } }),
  });
  return { sender, sent, queued };
}

test("builds the envelope from provider state and sends it", async () => {
  const { sender, sent, queued } = setup(true);
  const openedAt = new Date("2026-09-22T09:14:03.120Z");
  const result = await sender({ type: "bug", body: "Save does nothing", trigger: "shake" }, openedAt);
  expect(result).toEqual({ status: "sent", id: "s1" });
  expect(sent).toHaveLength(1);
  expect(sent[0].occurredAt).toBe("2026-09-22T09:14:03.120Z");
  expect(sent[0].user.installationId).toBe("3f1d2c4e-0000-4000-8000-000000000a92");
  expect(sent[0].context).toEqual({ screen: "/plan" });
  expect(sent[0].breadcrumbs).toHaveLength(1);
  expect(queued).toHaveLength(0);
});

test("queues the same envelope when sending fails", async () => {
  const { sender, sent, queued } = setup(false);
  const result = await sender({ type: "idea", title: "Dark mode", body: "please", trigger: "button" }, new Date());
  expect(result).toEqual({ status: "queued", error: "Network request failed" });
  expect(queued).toHaveLength(1);
  expect(queued[0].eventId).toBe(sent[0].eventId);
});
