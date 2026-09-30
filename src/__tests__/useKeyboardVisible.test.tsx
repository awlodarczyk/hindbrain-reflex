import React from "react";
import { render, act } from "@testing-library/react-native";
import { Keyboard } from "react-native";

import { useKeyboardVisible } from "../useKeyboardVisible";

function Probe({ onRender }: { onRender: (v: boolean) => void }) {
  onRender(useKeyboardVisible());
  return null;
}

function emit(event: string) {
  act(() => {
    (Keyboard as unknown as { emit: (e: string) => void }).emit(event);
  });
}

afterEach(() => {
  (Keyboard as unknown as { reset: () => void }).reset();
});

test("starts hidden, so the sheet lays out for a closed keyboard", () => {
  let visible!: boolean;
  render(<Probe onRender={(v) => { visible = v; }} />);

  expect(visible).toBe(false);
});

test("follows the keyboard opening and closing", () => {
  let visible!: boolean;
  render(<Probe onRender={(v) => { visible = v; }} />);

  emit("keyboardDidShow");
  expect(visible).toBe(true);

  emit("keyboardDidHide");
  expect(visible).toBe(false);
});

/**
 * iOS fires the `will` pair before the animation, Android only the `did` pair.
 * Listening to both keeps one implementation for the two platforms; a duplicate
 * event is idempotent because the hook stores a boolean, not a count.
 */
test("handles the iOS will-events and repeats of the same event", () => {
  let visible!: boolean;
  render(<Probe onRender={(v) => { visible = v; }} />);

  emit("keyboardWillShow");
  expect(visible).toBe(true);

  emit("keyboardDidShow");
  expect(visible).toBe(true);

  emit("keyboardWillHide");
  expect(visible).toBe(false);
});

test("removes its listeners on unmount", () => {
  const { unmount } = render(<Probe onRender={() => {}} />);

  unmount();

  expect(
    (Keyboard as unknown as { listenerCount: () => number }).listenerCount(),
  ).toBe(0);
});
