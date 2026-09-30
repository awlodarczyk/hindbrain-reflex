import React from "react";
import { render, act, waitFor } from "@testing-library/react-native";

import { HindbrainProvider } from "../HindbrainProvider";
import { useHindbrain } from "../useHindbrain";
import type { HindbrainContextValue } from "../HindbrainProvider";
import { CONFIG_CACHE_KEY } from "../remoteConfig";
import { defaultTheme } from "../types";

function Grab({ onReady }: { onReady: (ctx: HindbrainContextValue) => void }) {
  onReady(useHindbrain());
  return null;
}

/** An in-memory Storage, so the cache path can be exercised. */
function makeStorage(seed: Record<string, string> = {}) {
  const store = { ...seed };
  return {
    store,
    getItem: jest.fn(async (k: string) => store[k] ?? null),
    setItem: jest.fn(async (k: string, v: string) => {
      store[k] = v;
    }),
  };
}

const REMOTE = {
  revision: 3,
  theme: { light: { accent: "#0369A1" }, dark: { accent: "#5AC0F0" } },
};

function mockFetch(body: unknown) {
  return jest.fn(async () => ({
    ok: true,
    status: 200,
    json: async () => ({ success: true, data: body, error: null }),
  }));
}

afterEach(() => {
  jest.restoreAllMocks();
});

test("paints with the SDK defaults until a config has been applied", async () => {
  (globalThis as { fetch?: unknown }).fetch = mockFetch(REMOTE);
  let ctx!: HindbrainContextValue;

  render(
    <HindbrainProvider publicKey="hb_pub_x" endpoint="http://x/ingest">
      <Grab onReady={(c) => { ctx = c; }} />
    </HindbrainProvider>,
  );

  expect(ctx.theme.accent).toBe(defaultTheme.light.accent);
});

test("a config that arrives is not applied until the sheet is opened", async () => {
  const fetchImpl = mockFetch(REMOTE);
  (globalThis as { fetch?: unknown }).fetch = fetchImpl;
  const storage = makeStorage();
  let ctx!: HindbrainContextValue;

  render(
    <HindbrainProvider publicKey="hb_pub_x" endpoint="http://x/ingest" storage={storage}>
      <Grab onReady={(c) => { ctx = c; }} />
    </HindbrainProvider>,
  );

  // The fetch has landed and been cached…
  await waitFor(() => expect(storage.setItem).toHaveBeenCalled());
  // …but the sheet is still the colour it was. Repainting here would change
  // the sheet under somebody who is part-way through typing a report.
  expect(ctx.theme.accent).toBe(defaultTheme.light.accent);

  await act(async () => {
    ctx.open();
  });

  expect(ctx.theme.accent).toBe("#0369A1");
});

test("a cached config paints the sheet on a launch with no network", async () => {
  (globalThis as { fetch?: unknown }).fetch = jest.fn(async () => {
    throw new Error("offline");
  });
  const storage = makeStorage({ [CONFIG_CACHE_KEY]: JSON.stringify(REMOTE) });
  let ctx!: HindbrainContextValue;

  render(
    <HindbrainProvider publicKey="hb_pub_x" endpoint="http://x/ingest" storage={storage}>
      <Grab onReady={(c) => { ctx = c; }} />
    </HindbrainProvider>,
  );

  await waitFor(() => expect(ctx.theme.accent).toBe("#0369A1"));
});

test("the cached revision is sent so an unchanged config is not re-downloaded", async () => {
  const fetchImpl = mockFetch({ revision: 3, unchanged: true });
  (globalThis as { fetch?: unknown }).fetch = fetchImpl;
  const storage = makeStorage({ [CONFIG_CACHE_KEY]: JSON.stringify(REMOTE) });

  render(
    <HindbrainProvider publicKey="hb_pub_x" endpoint="http://x/ingest" storage={storage}>
      <Grab onReady={() => {}} />
    </HindbrainProvider>,
  );

  await waitFor(() => expect(fetchImpl).toHaveBeenCalled());
  const init = (fetchImpl.mock.calls[0] as unknown[])[1] as { body: string };
  const body = JSON.parse(init.body);
  expect(body).toMatchObject({ action: "get_config", revision: 3 });

  // Nothing new came back, so the cache is left alone.
  expect(storage.setItem).not.toHaveBeenCalled();
});

test("a corrupt cache is ignored rather than thrown", async () => {
  (globalThis as { fetch?: unknown }).fetch = mockFetch(REMOTE);
  const storage = makeStorage({ [CONFIG_CACHE_KEY]: "{not json" });
  let ctx!: HindbrainContextValue;

  render(
    <HindbrainProvider publicKey="hb_pub_x" endpoint="http://x/ingest" storage={storage}>
      <Grab onReady={(c) => { ctx = c; }} />
    </HindbrainProvider>,
  );

  expect(ctx.theme.accent).toBe(defaultTheme.light.accent);

  // A revision is never invented from an unreadable cache.
  await waitFor(() => expect(storage.setItem).toHaveBeenCalled());
});

test("the theme prop still wins over the dashboard", async () => {
  (globalThis as { fetch?: unknown }).fetch = mockFetch(REMOTE);
  const storage = makeStorage({ [CONFIG_CACHE_KEY]: JSON.stringify(REMOTE) });
  let ctx!: HindbrainContextValue;

  render(
    <HindbrainProvider
      publicKey="hb_pub_x"
      endpoint="http://x/ingest"
      storage={storage}
      theme={{ light: { accent: "#FF0000" } }}
    >
      <Grab onReady={(c) => { ctx = c; }} />
    </HindbrainProvider>,
  );

  await waitFor(() => expect(ctx.theme.accent).toBe("#FF0000"));
});
