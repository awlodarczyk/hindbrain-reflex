import { useContext } from 'react';
import { HindbrainContext } from './HindbrainProvider';
export type { HindbrainContextValue } from './HindbrainProvider';

export function useHindbrain() {
  const ctx = useContext(HindbrainContext);
  if (ctx === null) {
    throw new Error(
      'useHindbrain must be used within a HindbrainProvider. ' +
      'Wrap your app (or the component tree) with <HindbrainProvider>.',
    );
  }
  return ctx;
}
