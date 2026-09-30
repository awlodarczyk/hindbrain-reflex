import { Appearance, Dimensions, Platform } from 'react-native';
import * as Application from 'expo-application';
import type { DeviceContext } from './build';
import { loadExpoDevice, type ExpoDevice } from '../optional';

type Constants = Record<string, unknown> & {
  reactNativeVersion?: { major: number; minor: number; patch: number };
};

const TABLET_MIN_DP = 600;
const str = (v: unknown): string | undefined => (typeof v === 'string' && v.length > 0 ? v : undefined);

function locale(): DeviceContext['locale'] {
  try {
    const { locale: languageTag, timeZone } = Intl.DateTimeFormat().resolvedOptions();
    return languageTag && timeZone ? { languageTag, timeZone } : undefined;
  } catch {
    return undefined;
  }
}

function expoDeviceType(d: ExpoDevice): NonNullable<DeviceContext['device']>['type'] | undefined {
  const t = d.DeviceType;
  if (!t || d.deviceType == null) return undefined;
  if (d.deviceType === t.PHONE) return 'phone';
  if (d.deviceType === t.TABLET) return 'tablet';
  if (d.deviceType === t.DESKTOP) return 'desktop';
  if (d.deviceType === t.TV) return 'tv';
  return 'unknown';
}

/**
 * Reads device facts for the envelope. Missing values are left out, never guessed.
 * With the optional `expo-device` installed, model/manufacturer/type/emulator come from it
 * (React Native alone reports no model on iOS).
 */
export function collectDeviceContext(): DeviceContext {
  const c = (Platform.constants ?? {}) as Constants;
  const { width, height, scale, fontScale } = Dimensions.get('window');
  const isIos = Platform.OS === 'ios';
  const isTablet = isIos ? Boolean((Platform as { isPad?: boolean }).isPad) : Math.min(width, height) >= TABLET_MIN_DP;
  const rn = c.reactNativeVersion;
  const scheme = Appearance.getColorScheme();
  const g = globalThis as Record<string, unknown>;
  const expo = loadExpoDevice();

  return {
    app: {
      bundleId: str(Application.applicationId),
      name: str((Application as { applicationName?: string }).applicationName),
      version: str(Application.nativeApplicationVersion) ?? 'unknown',
      build: str(Application.nativeBuildVersion),
    },
    os: { name: isIos ? 'iOS' : Platform.OS === 'android' ? 'Android' : Platform.OS, version: String(Platform.Version) },
    device: {
      manufacturer: str(expo?.manufacturer) ?? str(c.Manufacturer) ?? str(c.Brand) ?? (isIos ? 'Apple' : undefined),
      model: str(expo?.modelName) ?? str(c.Model) ?? str(c.model),
      type: (expo && expoDeviceType(expo)) ?? (isTablet ? 'tablet' : 'phone'),
      isEmulator: expo?.isDevice === undefined ? undefined : !expo.isDevice,
      screen: { width, height, scale, fontScale },
      orientation: width > height ? 'landscape' : 'portrait',
      colorScheme: scheme === 'dark' ? 'dark' : scheme === 'light' ? 'light' : undefined,
    },
    runtime: {
      reactNative: rn ? `${rn.major}.${rn.minor}.${rn.patch}` : undefined,
      hermes: typeof g.HermesInternal === 'object' && g.HermesInternal !== null,
      newArchitecture: g.nativeFabricUIManager != null,
    },
    locale: locale(),
  };
}
