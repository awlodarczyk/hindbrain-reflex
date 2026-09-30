import type { HindbrainColorOverride, HindbrainThemeColors, HindbrainThemeOverride } from './types';
import { defaultTheme } from './types';

export const THEME_TOKENS = [
  'accent', 'onAccent', 'background', 'surface', 'text', 'textMuted', 'border', 'danger', 'success', 'backdrop',
] as const satisfies readonly (keyof HindbrainThemeColors)[];

/** Renames v0.1 keys to their v2 tokens; an explicit v2 key wins over its legacy alias. */
function normalise(override: HindbrainColorOverride | undefined): Partial<HindbrainThemeColors> {
  if (!override) return {};
  const { primary, muted, ...rest } = override;
  return {
    ...(primary !== undefined && { accent: primary }),
    ...(muted !== undefined && { textMuted: muted }),
    ...rest,
  };
}

/**
 * Resolves the sheet colours for the current appearance. `appearance` in the override
 * pins light/dark; otherwise any scheme but 'dark' (null, 'unspecified') is light.
 * Always returns a new object.
 */
export function resolveTheme(
  configTheme: HindbrainThemeOverride | undefined,
  colorScheme: string | null | undefined,
): HindbrainThemeColors {
  const pinned = configTheme?.appearance;
  const variant: 'light' | 'dark' =
    pinned === 'light' || pinned === 'dark' ? pinned : colorScheme === 'dark' ? 'dark' : 'light';
  return { ...defaultTheme[variant], ...normalise(configTheme?.[variant]) };
}
