import React from "react";
import { render, fireEvent, screen, waitFor } from "@testing-library/react-native";
import { Text } from "react-native";
import { HindbrainProvider } from "../HindbrainProvider";
import { useHindbrain } from "../useHindbrain";

jest.mock("../optional", () => ({
  loadViewShot: () => ({ captureRef: async () => "file:///tmp/shot.jpg" }),
  loadImagePicker: () => ({
    launchImageLibraryAsync: async () => ({ canceled: false, assets: [{ uri: "file:///tmp/pic.png", type: "image", mimeType: "image/png", fileSize: 900 }] }),
  }),
  loadLottie: () => null,
  loadExpoDevice: () => null,
}));

function Open() {
  const { open } = useHindbrain();
  return <Text testID="open" onPress={open}>open</Text>;
}

function mockNetwork() {
  const calls: { url: string; method: string; body: any }[] = [];
  (globalThis as any).fetch = jest.fn(async (url: string, init: RequestInit = {}) => {
    const method = init.method ?? "GET";
    calls.push({ url, method, body: init.body });
    if (url.startsWith("file://")) return { ok: true, status: 200, blob: async () => ({ size: 3000 }) };
    if (method === "PUT") return { ok: true, status: 200, json: async () => ({}) };
    const body = JSON.parse(init.body as string);
    const data = body.action === "submit"
      ? { id: "sub-1", uploads: (body.envelope.attachments ?? []).map((a: any, i: number) => ({ clientId: a.clientId, attachmentId: `att-${i}`, url: `https://api/upload/${i}`, expiresAt: "z" })) }
      : body.action === "attachment_done" ? { status: "ready" } : null;
    return { ok: true, status: 200, json: async () => ({ success: true, data, error: null }) };
  });
  return calls;
}

test("the bug form starts with the screenshot, can add from the library and uploads both", async () => {
  const calls = mockNetwork();
  render(<HindbrainProvider publicKey="hb_pub_x" endpoint="http://x/ingest"><Open /></HindbrainProvider>);
  fireEvent.press(screen.getByTestId("open"));
  fireEvent.press(await screen.findByTestId("hub-bug"));
  expect(screen.getByTestId("attachment-screenshot")).toBeTruthy();
  fireEvent.press(screen.getByTestId("attachment-add"));
  expect(await screen.findByTestId("attachment-image")).toBeTruthy();
  fireEvent.changeText(screen.getByTestId("submit-input"), "Save does nothing");
  fireEvent.press(screen.getByTestId("submit-button"));
  await screen.findByTestId("submit-success");
  // The provider also POSTs get_config on mount, so pick the submit by its
  // payload rather than by being the first POST.
  const submit = JSON.parse(
    calls.find((c) => c.method === "POST" && c.body.includes("\"envelope\""))!.body,
  );
  expect(submit.envelope.attachments.map((a: any) => [a.kind, a.mime, a.bytes])).toEqual([["screenshot", "image/jpeg", 3000], ["image", "image/png", 900]]);
  await waitFor(() => expect(calls.filter((c) => c.method === "PUT")).toHaveLength(2));
});

test("removing the screenshot sends the report without it", async () => {
  const calls = mockNetwork();
  render(<HindbrainProvider publicKey="hb_pub_x" endpoint="http://x/ingest"><Open /></HindbrainProvider>);
  fireEvent.press(screen.getByTestId("open"));
  fireEvent.press(await screen.findByTestId("hub-bug"));
  const remove = screen.getAllByTestId(/^attachment-remove-/)[0];
  fireEvent.press(remove);
  expect(screen.queryByTestId("attachment-screenshot")).toBeNull();
  fireEvent.changeText(screen.getByTestId("submit-input"), "No screenshot please");
  fireEvent.press(screen.getByTestId("submit-button"));
  await screen.findByTestId("submit-success");
  // The provider also POSTs get_config on mount, so pick the submit by its
  // payload rather than by being the first POST.
  const submit = JSON.parse(
    calls.find((c) => c.method === "POST" && c.body.includes("\"envelope\""))!.body,
  );
  expect(submit.envelope.attachments).toBeUndefined();
  expect(calls.filter((c) => c.method === "PUT")).toHaveLength(0);
});
