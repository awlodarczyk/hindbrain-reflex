import React from "react";
import { render, fireEvent, screen, waitFor } from "@testing-library/react-native";
import { Text } from "react-native";
import { HindbrainProvider } from "../HindbrainProvider";
import { useHindbrain } from "../useHindbrain";
import { INSTALLATION_ID_KEY } from "../installation";

const ID = "3f1d2c4e-0000-4000-8000-000000000a92";

function Open() {
  const { open } = useHindbrain();
  return <Text testID="open" onPress={open}>open</Text>;
}

test("lists and votes as this installation, not as the device model", async () => {
  const bodies: any[] = [];
  (globalThis as any).fetch = jest.fn(async (_u: string, init: RequestInit) => {
    const body = JSON.parse(init.body as string);
    bodies.push(body);
    const data = body.action === "list_ideas" ? [{ id: "i1", title: "Dark mode", body: "", voteCount: 4, votedByMe: false }] : null;
    return { ok: true, status: 200, json: async () => ({ success: true, data, error: null }) };
  });
  const storage = { getItem: async (k: string) => (k === INSTALLATION_ID_KEY ? ID : null), setItem: async () => {} };
  render(<HindbrainProvider publicKey="hb_pub_x" endpoint="http://x/ingest" storage={storage}><Open /></HindbrainProvider>);
  fireEvent.press(screen.getByTestId("open"));
  fireEvent.press(screen.getByTestId("hub-vote"));
  fireEvent.press(await screen.findByTestId("vote-button-i1"));
  await waitFor(() => expect(bodies.find((b) => b.action === "vote")).toBeTruthy());
  expect(bodies.find((b) => b.action === "list_ideas").fingerprint).toBe(ID);
  expect(bodies.find((b) => b.action === "vote")).toMatchObject({ submissionId: "i1", fingerprint: ID });
  expect(screen.getByTestId("vote-button-i1").props.accessibilityState).toEqual({ selected: true });
});
