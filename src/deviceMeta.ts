import { Platform } from "react-native";
import * as Application from "expo-application";
import type { DeviceMeta } from "./shared";

export function getDeviceMeta(): DeviceMeta {
  const os = Platform.OS;
  const osVersion = String(Platform.Version);
  const appVersion = Application.nativeApplicationVersion ?? "unknown";
  const model = (Platform.constants as Record<string, unknown>)?.Model as string | undefined
    ?? (Platform.constants as Record<string, unknown>)?.model as string | undefined
    ?? "unknown";

  return { os, osVersion, appVersion, model };
}
