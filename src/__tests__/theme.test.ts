import { resolveTheme, THEME_TOKENS } from '../theme';
import { defaultTheme } from '../types';

describe('resolveTheme', () => {
  it('exposes the ten tokens from the theming spec in both modes', () => {
    expect(THEME_TOKENS).toEqual(['accent', 'onAccent', 'background', 'surface', 'text', 'textMuted', 'border', 'danger', 'success', 'backdrop']);
    for (const mode of ['light', 'dark'] as const) {
      expect(Object.keys(defaultTheme[mode]).sort()).toEqual([...THEME_TOKENS].sort());
    }
  });

  it('uses the light defaults for light, null and unspecified schemes', () => {
    expect(resolveTheme(undefined, 'light')).toEqual(defaultTheme.light);
    expect(resolveTheme(undefined, null)).toEqual(defaultTheme.light);
    expect(resolveTheme(undefined, 'unspecified')).toEqual(defaultTheme.light);
  });

  it('uses the dark defaults for the dark scheme', () => {
    expect(resolveTheme(undefined, 'dark')).toEqual(defaultTheme.dark);
  });

  it('overrides only the given tokens of the active mode', () => {
    const r = resolveTheme({ light: { accent: '#000000' }, dark: { accent: '#FFFFFF' } }, 'light');
    expect(r.accent).toBe('#000000');
    expect(r.surface).toBe(defaultTheme.light.surface);
  });

  it('maps legacy primary/muted to accent/textMuted; new keys win', () => {
    expect(resolveTheme({ light: { primary: '#111111', muted: '#222222' } }, 'light')).toMatchObject({ accent: '#111111', textMuted: '#222222' });
    expect(resolveTheme({ light: { primary: '#111111', accent: '#333333' } }, 'light').accent).toBe('#333333');
  });

  it('appearance pins the mode regardless of the system scheme', () => {
    expect(resolveTheme({ appearance: 'dark' }, 'light')).toEqual(defaultTheme.dark);
    expect(resolveTheme({ appearance: 'light' }, 'dark')).toEqual(defaultTheme.light);
    expect(resolveTheme({ appearance: 'system' }, 'dark')).toEqual(defaultTheme.dark);
  });

  it('never mutates the defaults', () => {
    const before = JSON.stringify(defaultTheme);
    resolveTheme({ light: { accent: '#ABCDEF' } }, 'light');
    expect(JSON.stringify(defaultTheme)).toBe(before);
  });
});
