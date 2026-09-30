import { useEffect, useRef } from "react";
import { Accelerometer } from "expo-sensors";
import { isShake, type Accel } from "./shakeMath";

export interface UseShakeOptions {
  readonly threshold?: number;
  readonly cooldownMs?: number;
  readonly updateIntervalMs?: number;
  /**
   * Whether to respond to device motion at all. Defaults to true.
   *
   * WCAG 2.5.4 asks that motion actuation can be switched off, which a
   * threshold cannot do: a listener that is attached still fires for someone
   * with a tremor. Set false and open the sheet with `useHindbrain().open()`.
   */
  readonly enabled?: boolean;
}

export function useShake(
  onShake: () => void,
  options: UseShakeOptions = {}
): void {
  const {
    threshold = 2.7,
    cooldownMs = 2000,
    updateIntervalMs = 100,
    enabled = true,
  } = options;

  const lastFiredRef = useRef<number>(0);
  const onShakeRef = useRef<() => void>(onShake);
  onShakeRef.current = onShake;

  useEffect(() => {
    if (!enabled) {
      return;
    }

    Accelerometer.setUpdateInterval(updateIntervalMs);

    const subscription = Accelerometer.addListener((sample: Accel) => {
      if (!isShake(sample, threshold)) {
        return;
      }

      const now = Date.now();
      if (now - lastFiredRef.current < cooldownMs) {
        return;
      }

      lastFiredRef.current = now;
      onShakeRef.current();
    });

    return () => {
      subscription.remove();
    };
  }, [threshold, cooldownMs, updateIntervalMs, enabled]);
}
