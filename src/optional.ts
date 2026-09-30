import type { ComponentType } from 'react';

/**
 * Modules the SDK depends on but can do without. Each `require` sits in its own
 * try/catch so Metro treats the module as optional: an app that strips one out
 * loses that one feature instead of failing to build.
 */

type LottieProps = {
  source: object;
  autoPlay?: boolean;
  loop?: boolean;
  progress?: number;
  colorFilters?: { keypath: string; color: string }[];
  style?: object;
  testID?: string;
};

export function loadLottie(): ComponentType<LottieProps> | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = require('lottie-react-native');
    return (mod?.default ?? mod) as ComponentType<LottieProps>;
  } catch {
    return null;
  }
}

export type ExpoDevice = {
  modelName?: string | null;
  manufacturer?: string | null;
  isDevice?: boolean;
  deviceType?: number | null;
  DeviceType?: { PHONE: number; TABLET: number; DESKTOP: number; TV: number };
};

export function loadExpoDevice(): ExpoDevice | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require('expo-device') as ExpoDevice;
  } catch {
    return null;
  }
}

export type ViewShot = {
  captureRef: (
    view: unknown,
    options: { format: 'jpg' | 'png'; quality: number; result: 'tmpfile'; width?: number; height?: number },
  ) => Promise<string>;
};

export function loadViewShot(): ViewShot | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require('react-native-view-shot') as ViewShot;
  } catch {
    return null;
  }
}

export type PickedAsset = {
  uri: string;
  type?: 'image' | 'video' | 'livePhoto' | 'pairedVideo' | null;
  mimeType?: string | null;
  fileSize?: number | null;
  width?: number;
  height?: number;
  duration?: number | null;
};

export type ImagePicker = {
  launchImageLibraryAsync: (options: {
    mediaTypes: string[];
    allowsMultipleSelection?: boolean;
    selectionLimit?: number;
    quality?: number;
  }) => Promise<{ canceled: boolean; assets: PickedAsset[] | null }>;
};

export function loadImagePicker(): ImagePicker | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require('expo-image-picker') as ImagePicker;
  } catch {
    return null;
  }
}
