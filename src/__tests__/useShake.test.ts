import { renderHook } from "@testing-library/react-native";
import { Accelerometer } from "expo-sensors";

import { useShake } from "../useShake";

/**
 * WCAG 2.5.4 (Motion Actuation, level A) asks for two things from a gesture
 * like shake-to-open: another way to trigger it, and a way to stop the app
 * responding to motion at all. `useHindbrain().open()` covers the first; these
 * cover the second — a listener that is still attached is still a trigger for
 * someone with a tremor, however high the threshold is set.
 */
describe("useShake — motion can be turned off", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("listens for motion by default", () => {
    renderHook(() => useShake(jest.fn()));

    expect(Accelerometer.addListener).toHaveBeenCalledTimes(1);
  });

  it("attaches no accelerometer listener when disabled", () => {
    renderHook(() => useShake(jest.fn(), { enabled: false }));

    expect(Accelerometer.addListener).not.toHaveBeenCalled();
    expect(Accelerometer.setUpdateInterval).not.toHaveBeenCalled();
  });

  it("removes the listener when it is disabled after mounting", () => {
    const remove = jest.fn();
    (Accelerometer.addListener as jest.Mock).mockReturnValue({ remove });

    const { rerender } = renderHook(
      ({ enabled }: { enabled: boolean }) => useShake(jest.fn(), { enabled }),
      { initialProps: { enabled: true } },
    );
    expect(Accelerometer.addListener).toHaveBeenCalledTimes(1);

    rerender({ enabled: false });

    expect(remove).toHaveBeenCalled();
  });
});
