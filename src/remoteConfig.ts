import type { HindbrainThemeOverride, HindbrainColorOverride } from './types';

/** Where the last fetched config is kept, namespaced against the host app's keys. */
export const CONFIG_CACHE_KEY = 'hindbrain.config';

/**
 * What the dashboard serves for one app.
 *
 * `revision` only ever moves forward (the database sets it, not the client), so
 * the SDK can send the one it has and be told "unchanged" instead of
 * downloading the theme on every launch.
 */
export interface RemoteConfigDoc {
  readonly revision: number;
  readonly theme: HindbrainThemeOverride;
}

export function serialiseConfig(doc: RemoteConfigDoc): string {
  return JSON.stringify(doc);
}

/**
 * Read a cached config.
 *
 * The cache lives in storage the host app owns, so it can be absent, truncated
 * or left over from an older SDK. Anything unreadable becomes "no cache" and
 * the SDK falls back to its defaults; throwing here would crash somebody else's
 * app at launch over a cosmetic feature.
 */
export function parseCachedConfig(raw: string | null): RemoteConfigDoc | null {
  if (!raw) return null;

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }

  if (typeof parsed !== 'object' || parsed === null) return null;

  const { revision, theme } = parsed as Record<string, unknown>;
  if (typeof revision !== 'number' || !Number.isFinite(revision)) return null;
  if (typeof theme !== 'object' || theme === null) return null;

  return { revision, theme: theme as HindbrainThemeOverride };
}

function mergeColors(
  remote: HindbrainColorOverride | undefined,
  local: HindbrainColorOverride | undefined,
): HindbrainColorOverride | undefined {
  if (!remote) return local;
  if (!local) return remote;
  return { ...remote, ...local };
}

/**
 * Combine the dashboard's theme with the `theme` prop.
 *
 * Precedence is SDK defaults, then remote config, then the prop, applied per
 * token rather than per object: setting one colour locally must not discard the
 * other nine the dashboard sent. The prop wins so that a developer can override
 * the dashboard while working, without signing in to change it.
 *
 * Returns a new object; neither argument is modified.
 */
export function mergeThemeOverrides(
  remote: HindbrainThemeOverride | undefined,
  local: HindbrainThemeOverride | undefined,
): HindbrainThemeOverride {
  if (!remote) return local ?? {};
  if (!local) return remote;

  const light = mergeColors(remote.light, local.light);
  const dark = mergeColors(remote.dark, local.dark);

  return {
    ...(light && { light }),
    ...(dark && { dark }),
    ...(remote.radius !== undefined && { radius: remote.radius }),
    ...(local.radius !== undefined && { radius: local.radius }),
    ...(remote.appearance !== undefined && { appearance: remote.appearance }),
    ...(local.appearance !== undefined && { appearance: local.appearance }),
  };
}
