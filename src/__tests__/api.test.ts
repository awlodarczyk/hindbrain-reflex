import { createApi, DEFAULT_ENDPOINT } from "../api";

const DEVICE_META = { os: "ios", osVersion: "17", appVersion: "1", model: "m" };

test("DEFAULT_ENDPOINT is the production ingest function", () => {
  expect(DEFAULT_ENDPOINT).toBe("https://reporter-api.hindbrain.io/functions/v1/ingest");
});

test("submit posts to the default endpoint when none is configured", async () => {
  const urls: string[] = [];
  const fetchImpl = async (url: string, _init: RequestInit) => {
    urls.push(url);
    return { ok: true, status: 200, json: async () => ({ success: true, data: { id: "s1" }, error: null }) };
  };
  const api = createApi({ publicKey: "hb_pub_x", fetchImpl });
  const res = await api.submit({ type: "bug", title: "t", body: "b", deviceMeta: DEVICE_META });
  expect(res.success).toBe(true);
  expect(urls).toEqual(["https://reporter-api.hindbrain.io/functions/v1/ingest"]);
});

test("explicit endpoint overrides the default", async () => {
  const urls: string[] = [];
  const fetchImpl = async (url: string, _init: RequestInit) => {
    urls.push(url);
    return { ok: true, status: 200, json: async () => ({ success: true, data: { id: "s1" }, error: null }) };
  };
  const api = createApi({ publicKey: "hb_pub_x", endpoint: "http://x/ingest", fetchImpl });
  await api.submit({ type: "bug", title: "t", body: "b", deviceMeta: DEVICE_META });
  expect(urls).toEqual(["http://x/ingest"]);
});

test("submit returns failure when publicKey is empty", async () => {
  const api = createApi({ publicKey: "", fetchImpl: async () => { throw new Error("must not fetch"); } });
  const res = await api.submit({ type: "bug", title: "t", body: "b", deviceMeta: DEVICE_META });
  expect(res.success).toBe(false);
  expect(res.error).toMatch(/publicKey is required/i);
});

test("submit posts action=submit and returns parsed result", async () => {
  const calls: Array<Record<string, unknown>> = [];
  const fetchImpl = async (_url: string, init: RequestInit) => {
    calls.push(JSON.parse(init.body as string));
    return { ok: true, status: 200, json: async () => ({ success: true, data: { id: "s1" }, error: null }) };
  };
  const api = createApi({ publicKey: "hb_pub_x", endpoint: "http://x/ingest", fetchImpl });
  const res = await api.submit({ type: "bug", title: "t", body: "b", deviceMeta: DEVICE_META });
  expect(res.success).toBe(true);
  expect(calls[0].action).toBe("submit");
  expect(calls[0].publicKey).toBe("hb_pub_x");
});

test("submit returns failure when fetch rejects", async () => {
  const fetchImpl = async () => { throw new Error("network down"); };
  const api = createApi({ publicKey: "hb_pub_x", fetchImpl });
  const res = await api.submit({ type: "bug", title: "t", body: "b", deviceMeta: DEVICE_META });
  expect(res.success).toBe(false);
  expect(res.error).toMatch(/network down/);
});
