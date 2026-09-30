import type { Storage } from './queue';
import type { HindbrainStrings } from './i18n';

/** Sheet colour tokens — docs/specs/remote-config-and-theming.md. */
export type HindbrainThemeColors = {
  readonly accent: string;
  readonly onAccent: string;
  readonly background: string;
  readonly surface: string;
  readonly text: string;
  readonly textMuted: string;
  readonly border: string;
  readonly danger: string;
  readonly success: string;
  /** Scrim behind the sheet; any CSS colour including rgba(). */
  readonly backdrop: string;
};

export type HindbrainAppearance = 'system' | 'light' | 'dark';

export type HindbrainTheme = {
  readonly light: HindbrainThemeColors;
  readonly dark: HindbrainThemeColors;
  readonly radius: number;
};

/** v0.1 names, still accepted: `primary` → `accent`, `muted` → `textMuted`. */
export type LegacyThemeColors = { readonly primary?: string; readonly muted?: string };

export type HindbrainColorOverride = Partial<HindbrainThemeColors> & LegacyThemeColors;

/** A partial override for theme — individual color keys within light/dark are also optional. */
export type HindbrainThemeOverride = {
  readonly light?: HindbrainColorOverride;
  readonly dark?: HindbrainColorOverride;
  readonly radius?: number;
  /** `system` follows the phone; `light` / `dark` pin the sheet. */
  readonly appearance?: HindbrainAppearance;
};

export type HindbrainConfig = {
  readonly publicKey: string;
  /** Override the API endpoint. Defaults to the Hindbrain cloud ingest function. */
  readonly endpoint?: string;
  readonly theme?: HindbrainThemeOverride;
  /** BCP 47 tag for the sheet copy; defaults to the device locale. Built in: `en`, `pl`. */
  readonly locale?: string;
  /** Replace any built-in text, e.g. `{ hubTitle: 'Feedback' }`. */
  readonly strings?: Partial<HindbrainStrings>;
  readonly shakeThreshold?: number;
  /**
   * Whether shaking opens the sheet. Defaults to true. When false the sheet
   * opens only through `useHindbrain().open()`, which is what WCAG 2.5.4
   * (Motion Actuation) asks to be possible.
   */
  readonly shakeEnabled?: boolean;
  /**
   * Persistent storage for the offline submission queue (e.g. AsyncStorage).
   * When omitted, a no-op storage is used and queued items do not survive restarts.
   */
  readonly storage?: Storage;
};

export const defaultTheme: HindbrainTheme = {
  light: {
    accent: '#4F46E5',
    onAccent: '#FFFFFF',
    background: '#FFFFFF',
    surface: '#F4F4F5',
    text: '#09090B',
    textMuted: '#71717A',
    border: '#E4E4E7',
    danger: '#DC2626',
    success: '#16A34A',
    backdrop: 'rgba(9, 9, 11, 0.45)',
  },
  dark: {
    accent: '#818CF8',
    onAccent: '#0B0B12',
    background: '#111114',
    surface: '#1C1C21',
    text: '#FAFAFA',
    textMuted: '#A1A1AA',
    border: '#27272A',
    danger: '#F87171',
    success: '#4ADE80',
    backdrop: 'rgba(0, 0, 0, 0.6)',
  },
  radius: 16,
};
