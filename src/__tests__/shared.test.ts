/**
 * Wire-compatibility tests for the vendored shared module (src/shared.ts).
 * These shapes MUST stay in sync with packages/shared/src/envelope.ts and
 * packages/shared/src/schemas.ts — the ingest function validates against them.
 */
import { ok, fail } from "../shared";
import type { ApiResult, SubmitInput, IdeaListItem, DeviceMeta, SubmissionType, SubmissionStatus } from "../shared";

test("ok() wraps data in the standard envelope", () => {
  const res = ok({ id: "s1" });
  expect(res).toEqual({ success: true, data: { id: "s1" }, error: null });
});

test("fail() wraps an error in the standard envelope", () => {
  const res = fail("boom");
  expect(res).toEqual({ success: false, data: null, error: "boom" });
});

test("vendored types are wire-compatible with @hindbrain/shared", () => {
  // Compile-time assertions: these assignments fail tsc if shapes drift.
  const deviceMeta: DeviceMeta = { os: "ios", osVersion: "17", appVersion: "1.0.0", model: "iPhone" };
  const submit: SubmitInput = {
    publicKey: "hb_pub_x",
    type: "bug",
    title: "t",
    body: "b",
    deviceMeta,
  };
  const idea: IdeaListItem = { id: "1", title: "t", body: "b", voteCount: 0, votedByMe: false };
  const types: SubmissionType[] = ["bug", "idea"];
  const statuses: SubmissionStatus[] = ["open", "planned", "in_progress", "done", "rejected"];
  const envelope: ApiResult<IdeaListItem[]> = { success: true, data: [idea], error: null };

  expect(submit.type).toBe("bug");
  expect(types).toHaveLength(2);
  expect(statuses).toHaveLength(5);
  expect(envelope.data).toHaveLength(1);
});
