import React, { createContext, useContext, useEffect, useRef } from 'react';
import type { HindbrainThemeColors } from '../types';
import type { HindbrainStrings } from '../i18n';

/** The pinned button at the bottom of the sheet; rendered by the provider's footerComponent. */
export type FooterAction = {
  readonly label: string;
  readonly onPress: () => void;
  readonly variant?: 'primary' | 'secondary';
  readonly disabled?: boolean;
  readonly loading?: boolean;
  readonly testID?: string;
};

export interface SheetContextValue {
  readonly colors: HindbrainThemeColors;
  readonly strings: HindbrainStrings;
  readonly radius: number;
  readonly setFooter: (action: FooterAction | null) => void;
}

export const SheetContext = createContext<SheetContextValue | null>(null);

export function useSheet(): SheetContextValue {
  const ctx = useContext(SheetContext);
  if (!ctx) throw new Error('Sheet screens must render inside HindbrainProvider.');
  return ctx;
}

/** Shows `action` as the sheet footer while the calling screen is mounted; null hides it. */
export function useSheetFooter(action: FooterAction | null): void {
  const { setFooter } = useSheet();
  const latest = useRef(action);
  latest.current = action;
  const key = action ? [action.label, action.variant, action.disabled, action.loading, action.testID].join('|') : null;
  useEffect(() => {
    const current = latest.current;
    setFooter(current ? { ...current, onPress: () => latest.current?.onPress() } : null);
  }, [key, setFooter]);
  useEffect(() => () => setFooter(null), [setFooter]);
}

export function SheetProvider({ value, children }: { value: SheetContextValue; children: React.ReactNode }): React.ReactElement {
  return <SheetContext.Provider value={value}>{children}</SheetContext.Provider>;
}
