import React from "react";
import { render, fireEvent, screen, waitFor } from "@testing-library/react-native";
import { Text } from "react-native";
import { HindbrainProvider } from "../HindbrainProvider";
import { useHindbrain } from "../useHindbrain";

function Controls() {
  const { open, trackScreen } = useHindbrain();
  return (
    <>
      <Text testID="go" onPress={() => trackScreen("/plan")}>go</Text>
      <Text testID="open" onPress={open}>open</Text>
    </>
  );
}

function mockFetch(ok: boolean) {
  const bodies: any[] = [];
  const fetchMock = jest.fn(async (_url: string, init: RequestInit) => {
    bodies.push(JSON.parse(init.body as string));
    if (!ok) throw new Error("Network request failed");
    return { ok: true, status: 200, json: async () => ({ success: true, data: { id: "s1" }, error: null }) };
  });
  (globalThis as any).fetch = fetchMock;
  return bodies;
}

async function reportBug() {
  fireEvent.press(screen.getByTestId("go"));
  fireEvent.press(screen.getByTestId("open"));
  fireEvent.press(screen.getByTestId("hub-bug"));
  expect(screen.getByTestId("submit-button").props.disabled).toBe(true);
  fireEvent.changeText(screen.getByTestId("submit-input"), "Save does nothing\nTapped save twice");
  fireEvent.press(screen.getByTestId("submit-button"));
}

test("a bug from the sheet is sent as an event envelope", async () => {
  const bodies = mockFetch(true);
  render(<HindbrainProvider publicKey="hb_pub_x" endpoint="http://x/ingest"><Controls /></HindbrainProvider>);
  await reportBug();
  await screen.findByTestId("submit-success");
  const submit = bodies.find((b) => b.action === "submit");
  expect(submit.envelope).toMatchObject({
    envelopeVersion: 1,
    report: { type: "bug", body: "Save does nothing\nTapped save twice", trigger: "api" },
    context: { screen: "/plan" },
    os: { name: "iOS" },
  });
  expect(submit.envelope.user.installationId).toMatch(/^[0-9a-f-]{36}$/);
  expect(submit.envelope.breadcrumbs[0]).toMatchObject({ category: "navigation", message: "/plan" });
});

test("offline: the envelope is queued and the user sees it was saved", async () => {
  mockFetch(false);
  const store: Record<string, string> = {};
  const storage = { getItem: async (k: string) => store[k] ?? null, setItem: async (k: string, v: string) => { store[k] = v; } };
  render(<HindbrainProvider publicKey="hb_pub_x" endpoint="http://x/ingest" storage={storage}><Controls /></HindbrainProvider>);
  await reportBug();
  await screen.findByTestId("submit-queued");
  await waitFor(() => expect(JSON.parse(store["@hindbrain/queue"])).toHaveLength(1));
  expect(JSON.parse(store["@hindbrain/queue"])[0].envelope.report.body).toBe("Save does nothing\nTapped save twice");
});

test("an idea shows similar ideas and lets the user vote instead", async () => {
  (globalThis as any).fetch = jest.fn(async (_u: string, init: RequestInit) => {
    const body = JSON.parse(init.body as string);
    const data = body.action === "list_ideas" ? [{ id: "i1", title: "Dark mode for workout log", body: "", voteCount: 41, votedByMe: false }] : null;
    return { ok: true, status: 200, json: async () => ({ success: true, data, error: null }) };
  });
  render(<HindbrainProvider publicKey="hb_pub_x" endpoint="http://x/ingest"><Controls /></HindbrainProvider>);
  fireEvent.press(screen.getByTestId("open"));
  fireEvent.press(screen.getByTestId("hub-idea"));
  fireEvent.changeText(screen.getByTestId("submit-title-input"), "Dark mode everywhere please");
  expect(await screen.findByTestId("similar-i1")).toBeTruthy();
  fireEvent.press(screen.getByTestId("sheet-back"));
  expect(screen.getByTestId("hub-bug")).toBeTruthy();
});
