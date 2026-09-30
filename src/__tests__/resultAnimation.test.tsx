import React from "react";
import { render, screen, waitFor } from "@testing-library/react-native";
import { AccessibilityInfo, View } from "react-native";
import { ResultAnimation } from "../sheet/ResultAnimation";

const lottieProps: any[] = [];
let mockLottie: ((p: any) => React.ReactElement) | null = null;
jest.mock("../optional", () => ({ loadLottie: () => mockLottie, loadExpoDevice: () => null }));

const FakeLottie = (p: any) => { lottieProps.push(p); return <View testID={p.testID} />; };

beforeEach(() => { lottieProps.length = 0; mockLottie = FakeLottie; });

test("plays success-check with theme colours when lottie is installed", async () => {
  render(<ResultAnimation kind="sent" tint="#16A34A" background="#FFFFFF" />);
  expect(await screen.findByTestId("result-lottie-sent")).toBeTruthy();
  const last = lottieProps.at(-1);
  expect(last.autoPlay).toBe(true);
  expect(last.loop).toBe(false);
  expect(last.colorFilters).toEqual(expect.arrayContaining([{ keypath: "ring", color: "#16A34A" }, { keypath: "check", color: "#16A34A" }]));
});

test("shows the last frame without playback when reduced motion is on", async () => {
  (AccessibilityInfo.isReduceMotionEnabled as jest.Mock).mockResolvedValueOnce(true);
  render(<ResultAnimation kind="queued" tint="#71717A" background="#FFFFFF" />);
  await waitFor(() => expect(lottieProps.at(-1).progress).toBe(1));
  expect(lottieProps.at(-1).autoPlay).toBe(false);
  expect(lottieProps.at(-1).colorFilters).toEqual([{ keypath: "cloud", color: "#71717A" }, { keypath: "arrow", color: "#FFFFFF" }]);
});

test("falls back to the static icon without lottie", () => {
  mockLottie = null;
  render(<ResultAnimation kind="sent" tint="#16A34A" background="#FFFFFF" />);
  expect(screen.getByTestId("result-icon-sent")).toBeTruthy();
});
