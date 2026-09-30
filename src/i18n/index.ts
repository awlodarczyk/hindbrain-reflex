import { en, type HindbrainStrings } from './en';
import { pl } from './pl';

export { en, pl };
export type { HindbrainStrings };

/** Built-in copy for the locale (Polish for `pl*`, English otherwise), with host overrides on top. */
export function resolveStrings(
  languageTag: string | undefined,
  overrides?: Partial<HindbrainStrings>,
): HindbrainStrings {
  const base = languageTag?.toLowerCase().startsWith('pl') ? pl : en;
  return { ...base, ...overrides };
}

/** Replaces `{name}` placeholders; unknown placeholders are left as they are. */
export function format(template: string, vars: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (match, key: string) => (key in vars ? String(vars[key]) : match));
}
