import { createQueue } from "../queue";

test("flush replays queued items then clears", async () => {
  const store: Record<string, string> = {};
  const storage = {
    getItem: async (k: string) => store[k] ?? null,
    setItem: async (k: string, v: string) => { store[k] = v; },
  };
  const q = createQueue(storage);
  await q.enqueue({ type: "bug", title: "t", body: "b",
    deviceMeta: { os: "ios", osVersion: "1", appVersion: "1", model: "m" } });
  const sent: any[] = [];
  await q.flush({ submit: async (i: any) => { sent.push(i); return { success: true, data: null, error: null }; } } as any);
  expect(sent.length).toBe(1);
  const remaining = await q.flush({ submit: async () => { throw new Error("should not call"); } } as any);
  expect(remaining).toBe(0);
});
