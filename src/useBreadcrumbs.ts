import { useCallback, useEffect, useMemo, useRef } from 'react';
import { createBreadcrumbBuffer, instrumentConsole, instrumentXhr } from './breadcrumbs';
import type { Breadcrumb, BreadcrumbInput } from './breadcrumbs';

export interface BreadcrumbApi {
  /** Records a custom breadcrumb (e.g. a tap on an important button). */
  addBreadcrumb: (crumb: BreadcrumbInput) => void;
  /** Records a navigation step; call it whenever the current route changes. */
  trackScreen: (name: string) => void;
  getBreadcrumbs: () => Breadcrumb[];
  getCurrentScreen: () => string | null;
}

/** Owns the breadcrumb buffer for a provider and instruments console + XHR while mounted. */
export function useBreadcrumbs(ingestEndpoint: string): BreadcrumbApi {
  const buffer = useMemo(() => createBreadcrumbBuffer(), []);
  const screen = useRef<string | null>(null);

  useEffect(() => {
    const restoreConsole = instrumentConsole(buffer);
    const restoreXhr = instrumentXhr(buffer, { ignore: [ingestEndpoint] });
    return () => {
      restoreXhr();
      restoreConsole();
    };
  }, [buffer, ingestEndpoint]);

  const trackScreen = useCallback(
    (name: string) => {
      const previous = screen.current;
      if (previous === name) return;
      screen.current = name;
      buffer.add({ category: 'navigation', message: previous ? `${previous} → ${name}` : name });
    },
    [buffer],
  );
  const addBreadcrumb = useCallback((crumb: BreadcrumbInput) => buffer.add(crumb), [buffer]);
  const getBreadcrumbs = useCallback(() => buffer.snapshot(), [buffer]);
  const getCurrentScreen = useCallback(() => screen.current, []);

  return useMemo(
    () => ({ addBreadcrumb, trackScreen, getBreadcrumbs, getCurrentScreen }),
    [addBreadcrumb, trackScreen, getBreadcrumbs, getCurrentScreen],
  );
}
