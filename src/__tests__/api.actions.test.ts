/**
 * Wire-contract regression test: ensures every api method sends the exact
 * action string that the ingest handler accepts.
 *
 * Accepted set (from supabase/functions/ingest/handler.ts):
 *   "submit" | "vote" | "list_ideas"
 */

import { createApi } from "../api";

const ACCEPTED_ACTIONS = new Set(["submit", "vote", "list_ideas"]);

function makeFetch(calls: Record<string, unknown>[]) {
  return async (_url: string, init: RequestInit) => {
    calls.push(JSON.parse(init.body as string));
    return {
      ok: true,
      status: 200,
      json: async () => ({ success: true, data: null, error: null }),
    };
  };
}

describe("api wire-contract: action strings match ingest handler", () => {
  const endpoint = "http://localhost/ingest";
  const publicKey = "hb_pub_aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";

  test("submit sends action='submit'", async () => {
    const calls: Record<string, unknown>[] = [];
    const api = createApi({ publicKey, endpoint, fetchImpl: makeFetch(calls) });
    await api.submit({
      type: "bug",
      title: "t",
      body: "b",
      deviceMeta: { os: "ios", osVersion: "17", appVersion: "1", model: "m" },
    });
    expect(calls).toHaveLength(1);
    expect(calls[0].action).toBe("submit");
    expect(ACCEPTED_ACTIONS.has(calls[0].action as string)).toBe(true);
  });

  test("vote sends action='vote'", async () => {
    const calls: Record<string, unknown>[] = [];
    const api = createApi({ publicKey, endpoint, fetchImpl: makeFetch(calls) });
    await api.vote("sub-id-1", "fp_test");
    expect(calls).toHaveLength(1);
    expect(calls[0].action).toBe("vote");
    expect(ACCEPTED_ACTIONS.has(calls[0].action as string)).toBe(true);
  });

  test("listIdeas sends action='list_ideas' (not 'listIdeas')", async () => {
    const calls: Record<string, unknown>[] = [];
    const api = createApi({ publicKey, endpoint, fetchImpl: makeFetch(calls) });
    await api.listIdeas("fp_test");
    expect(calls).toHaveLength(1);
    expect(calls[0].action).toBe("list_ideas");
    // Explicitly assert it is NOT the old camelCase value that caused the 400
    expect(calls[0].action).not.toBe("listIdeas");
    expect(ACCEPTED_ACTIONS.has(calls[0].action as string)).toBe(true);
  });
});
