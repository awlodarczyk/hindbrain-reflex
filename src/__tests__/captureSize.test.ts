import { computeCaptureSize, MAX_CAPTURE_PIXELS } from "../capture-size";

test("scales the layout size by the device pixel ratio", () => {
  expect(computeCaptureSize({ width: 100, height: 200 }, 3, 1_000_000)).toEqual({ width: 300, height: 600 });
});

test("a pixel ratio of 1 leaves the layout size unchanged", () => {
  expect(computeCaptureSize({ width: 393, height: 852 }, 1, 1_000_000)).toEqual({ width: 393, height: 852 });
});

test("clamps the result so its pixel count never exceeds the cap, keeping aspect ratio", () => {
  const result = computeCaptureSize({ width: 1000, height: 1000 }, 3, 1_000_000);
  expect(result).toEqual({ width: 1000, height: 1000 });
  expect(result.width * result.height).toBeLessThanOrEqual(1_000_000);
});

test("rounds a non-integer scaled result to integers", () => {
  const result = computeCaptureSize({ width: 393.4, height: 852.6 }, 2.5, 10_000_000);
  expect(result).toEqual({ width: Math.round(393.4 * 2.5), height: Math.round(852.6 * 2.5) });
  expect(Number.isInteger(result.width)).toBe(true);
  expect(Number.isInteger(result.height)).toBe(true);
});

test("exports a sane, positive default pixel cap", () => {
  expect(MAX_CAPTURE_PIXELS).toBeGreaterThan(0);
});
