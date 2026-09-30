import React from "react";
import { render, fireEvent, screen, waitFor, act } from "@testing-library/react-native";
import { Text } from "react-native";
import { HindbrainProvider } from "../HindbrainProvider";
import { useHindbrain } from "../useHindbrain";

const captures: string[] = [];
jest.mock("../optional", () => ({
  loadViewShot: () => ({
    captureRef: async () => {
      const uri = captures.length === 0 ? "file:///tmp/shot.jpg" : "file:///tmp/annotated.jpg";
      captures.push(uri);
      return uri;
    },
  }),
  loadImagePicker: () => null,
  loadLottie: () => null,
  loadExpoDevice: () => null,
}));

function Open() {
  const { open } = useHindbrain();
  return <Text testID="open" onPress={open}>open</Text>;
}

const at = (x: number, y: number) => ({ nativeEvent: { locationX: x, locationY: y } });

test("marks up the screenshot and sends the flattened, annotated image", async () => {
  captures.length = 0;
  const bodies: any[] = [];
  (globalThis as any).fetch = jest.fn(async (url: string, init: RequestInit = {}) => {
    if (url.startsWith("file://")) return { ok: true, status: 200, blob: async () => ({ size: url.includes("annotated") ? 5000 : 3000 }) };
    if (init.method === "PUT") return { ok: true, status: 200, json: async () => ({}) };
    const body = JSON.parse(init.body as string);
    bodies.push(body);
    const data = body.action === "submit" ? { id: "s", uploads: [] } : null;
    return { ok: true, status: 200, json: async () => ({ success: true, data, error: null }) };
  });
  render(<HindbrainProvider publicKey="hb_pub_x" endpoint="http://x/ingest"><Open /></HindbrainProvider>);
  fireEvent.press(screen.getByTestId("open"));
  fireEvent.press(await screen.findByTestId("hub-bug"));
  fireEvent.press(screen.getAllByTestId(/^attachment-markup-/)[0]);

  // The canvas appears once the stage has a size.
  const stage = screen.getByTestId("markup-stage");
  act(() => fireEvent(stage, "layout", { nativeEvent: { layout: { width: 320, height: 600 } } }));
  const canvas = await screen.findByTestId("markup-canvas");

  fireEvent.press(screen.getByTestId("markup-tool-arrow"));
  fireEvent(canvas, "responderGrant", at(40, 40));
  fireEvent(canvas, "responderMove", at(120, 160));
  fireEvent(canvas, "responderRelease", at(120, 160));

  fireEvent.press(screen.getByTestId("markup-tool-text"));
  fireEvent(canvas, "responderGrant", at(60, 220));
  fireEvent(canvas, "responderRelease", at(60, 220));
  fireEvent.changeText(screen.getByTestId("markup-text-input"), "Here");
  fireEvent(screen.getByTestId("markup-text-input"), "submitEditing");

  fireEvent.press(screen.getByTestId("markup-done"));
  await waitFor(() => expect(screen.queryByTestId("markup-canvas")).toBeNull());

  fireEvent.changeText(screen.getByTestId("submit-input"), "Save does nothing");
  fireEvent.press(screen.getByTestId("submit-button"));
  await screen.findByTestId("submit-success");
  const [shot] = bodies.find((b) => b.action === "submit").envelope.attachments;
  expect(shot).toMatchObject({ kind: "screenshot", mime: "image/jpeg", bytes: 5000, annotated: true });
  expect(captures).toEqual(["file:///tmp/shot.jpg", "file:///tmp/annotated.jpg"]);
});

test("Done without drawing leaves the screenshot untouched", async () => {
  captures.length = 0;
  (globalThis as any).fetch = jest.fn(async () => ({ ok: true, status: 200, blob: async () => ({ size: 3000 }) }));
  render(<HindbrainProvider publicKey="hb_pub_x" endpoint="http://x/ingest"><Open /></HindbrainProvider>);
  fireEvent.press(screen.getByTestId("open"));
  fireEvent.press(await screen.findByTestId("hub-bug"));
  fireEvent.press(screen.getAllByTestId(/^attachment-markup-/)[0]);
  fireEvent.press(screen.getByTestId("markup-done"));
  await waitFor(() => expect(screen.queryByTestId("markup-done")).toBeNull());
  expect(captures).toEqual(["file:///tmp/shot.jpg"]);
});
