export type {
  ApiResult,
  SubmitInput,
  DeviceMeta,
  IdeaListItem,
  SubmissionType,
  SubmissionStatus,
} from './shared';
export { ok, fail } from './shared';
export type { HindbrainThemeColors, HindbrainTheme, HindbrainThemeOverride, HindbrainColorOverride, HindbrainAppearance, HindbrainConfig } from './types';
export { defaultTheme } from './types';
export type { Accel } from './shakeMath';
export { magnitude, isShake } from './shakeMath';
export type { UseShakeOptions } from './useShake';
export { useShake } from './useShake';
export { createApi } from './api';
export type { RemoteConfigResponse } from './api';
export { CONFIG_CACHE_KEY, mergeThemeOverrides, parseCachedConfig } from './remoteConfig';
export type { RemoteConfigDoc } from './remoteConfig';
export type { Api, ApiConfig } from './api';
export { createQueue } from './queue';
export type { Queue, Storage } from './queue';
export { getDeviceMeta } from './deviceMeta';
export { createInstallationId, INSTALLATION_ID_KEY } from './installation';
export { HindbrainProvider } from './HindbrainProvider';
export type { HindbrainContextValue } from './HindbrainProvider';
export { useHindbrain } from './useHindbrain';
export { resolveTheme, THEME_TOKENS } from './theme';
export { createBreadcrumbBuffer, maskPii, stripUrl, MAX_BREADCRUMBS } from './breadcrumbs';
export type { Breadcrumb, BreadcrumbInput, BreadcrumbCategory, BreadcrumbLevel } from './breadcrumbs';
export type { BreadcrumbApi } from './useBreadcrumbs';
export { resolveStrings, format, en as stringsEn, pl as stringsPl } from './i18n';
export type { HindbrainStrings } from './i18n';
