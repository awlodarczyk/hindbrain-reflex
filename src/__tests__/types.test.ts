import { defaultTheme } from '../types';

test('defaultTheme matches the spec defaults', () => {
  expect(defaultTheme.light.accent).toBe('#4F46E5');
  expect(defaultTheme.dark.accent).toBe('#818CF8');
  expect(defaultTheme.radius).toBe(16);
});
