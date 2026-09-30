import { isShake } from "../shakeMath";

test("detects strong acceleration as shake", () => {
  expect(isShake({ x: 2.0, y: 2.0, z: 2.0 }, 2.7)).toBe(true);
});

test("ignores gentle motion", () => {
  expect(isShake({ x: 0.1, y: 0.0, z: 0.05 }, 2.7)).toBe(false);
});
