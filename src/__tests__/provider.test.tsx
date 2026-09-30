import React from "react";
import { render, fireEvent, screen, waitFor } from "@testing-library/react-native";
import { Text } from "react-native";
import { HindbrainProvider } from "../HindbrainProvider";
import { useHindbrain } from "../useHindbrain";

function Controls() {
  const { open, close } = useHindbrain();
  return (
    <>
      <Text testID="open" onPress={open}>open</Text>
      <Text testID="close" onPress={close}>close</Text>
    </>
  );
}

test("sheet is closed until open() is called, then shows the three hub tiles", () => {
  render(
    <HindbrainProvider publicKey="hb_pub_x" endpoint="http://x/ingest">
      <Controls />
    </HindbrainProvider>
  );
  // Before open(): the imperative modal has not been presented — nothing renders.
  expect(screen.queryByTestId("hub-bug")).toBeNull();

  fireEvent.press(screen.getByTestId("open"));
  expect(screen.getByTestId("hub-bug")).toBeTruthy();
  expect(screen.getByTestId("hub-idea")).toBeTruthy();
  expect(screen.getByTestId("hub-vote")).toBeTruthy();
});

test("close() dismisses the sheet", () => {
  render(
    <HindbrainProvider publicKey="hb_pub_x" endpoint="http://x/ingest">
      <Controls />
    </HindbrainProvider>
  );
  fireEvent.press(screen.getByTestId("open"));
  expect(screen.getByTestId("hub-bug")).toBeTruthy();

  fireEvent.press(screen.getByTestId("close"));
  expect(screen.queryByTestId("hub-bug")).toBeNull();
});

test("dismissing resets the step so reopening lands on the hub", () => {
  render(
    <HindbrainProvider publicKey="hb_pub_x" endpoint="http://x/ingest">
      <Controls />
    </HindbrainProvider>
  );
  fireEvent.press(screen.getByTestId("open"));
  fireEvent.press(screen.getByTestId("hub-bug"));
  expect(screen.queryByTestId("hub-bug")).toBeNull(); // now on bug form

  fireEvent.press(screen.getByTestId("close"));
  fireEvent.press(screen.getByTestId("open"));
  expect(screen.getByTestId("hub-bug")).toBeTruthy(); // back on hub
});

test("provider passes injected storage through to the offline queue", async () => {
  const getItem = jest.fn(async (_key: string): Promise<string | null> => null);
  const setItem = jest.fn(async (_key: string, _value: string): Promise<void> => {});
  render(
    <HindbrainProvider
      publicKey="hb_pub_x"
      endpoint="http://x/ingest"
      storage={{ getItem, setItem }}
    >
      <Text>child</Text>
    </HindbrainProvider>
  );
  // The provider flushes the queue on mount, which reads from the injected storage.
  await waitFor(() => expect(getItem).toHaveBeenCalledWith("@hindbrain/queue"));
});
