import React, {
  createContext,
  useState,
  useCallback,
  useMemo,
  useEffect,
  useRef,
  type ReactNode,
} from 'react';
import { useColorScheme, View, StyleSheet } from 'react-native';
import { BottomSheetModal, BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import type { HindbrainConfig, HindbrainThemeColors, HindbrainThemeOverride } from './types';
import { defaultTheme } from './types';
import { createApi, DEFAULT_ENDPOINT } from './api';
import { createQueue, type Storage } from './queue';
import { createInstallationId } from './installation';
import { useBreadcrumbs, type BreadcrumbApi } from './useBreadcrumbs';
import { createReportSender } from './envelope/send';
import { collectDeviceContext } from './envelope/device';
import type { ReportInput } from './envelope/build';
import { useShake } from './useShake';
import { resolveTheme } from './theme';
import {
  CONFIG_CACHE_KEY,
  mergeThemeOverrides,
  parseCachedConfig,
  serialiseConfig,
} from './remoteConfig';
import { resolveStrings } from './i18n';
import { FeedbackSheet } from './sheet/FeedbackSheet';
import { captureScreenshot, flattenView, pickMedia as pickFromLibrary } from './capture';
import { loadImagePicker, loadViewShot } from './optional';
import type { LocalAttachment } from './attachments';

export interface HindbrainContextValue extends BreadcrumbApi {
  open: () => void;
  close: () => void;
  theme: HindbrainThemeColors;
}

function deviceLanguageTag(): string | undefined {
  try {
    return Intl.DateTimeFormat().resolvedOptions().locale;
  } catch {
    return undefined;
  }
}

export const HindbrainContext = createContext<HindbrainContextValue | null>(null);

const noopStorage: Storage = {
  getItem: async (_key: string): Promise<string | null> => null,
  setItem: async (_key: string, _value: string): Promise<void> => {},
};

interface ProviderProps extends HindbrainConfig {
  children: ReactNode;
}

export function HindbrainProvider({
  publicKey,
  endpoint,
  theme: configTheme,
  shakeThreshold,
  shakeEnabled,
  storage,
  locale,
  strings: stringOverrides,
  children,
}: ProviderProps): React.ReactElement {
  // BottomSheetModal is imperative: it opens ONLY via ref.present() and
  // closes via ref.dismiss(). The `index` prop alone never presents a modal.
  const sheetRef = useRef<BottomSheetModal>(null);

  const colorScheme = useColorScheme();

  const api = useMemo(
    () => createApi({ publicKey, endpoint }),
    [publicKey, endpoint],
  );

  // The dashboard's palette. `pending` is what the server last said; `applied`
  // is what the sheet is painted with. They are separate so a config that
  // arrives while the sheet is open cannot repaint it under the user.
  const [appliedRemote, setAppliedRemote] = useState<HindbrainThemeOverride | undefined>(undefined);
  const pendingRemote = useRef<HindbrainThemeOverride | undefined>(undefined);

  useEffect(() => {
    let cancelled = false;

    const load = async (): Promise<void> => {
      // Cache first, so a launch with no network still uses the app's colours
      // rather than the SDK defaults.
      const cached = parseCachedConfig(
        storage ? await storage.getItem(CONFIG_CACHE_KEY).catch(() => null) : null,
      );
      if (cancelled) return;
      if (cached) {
        pendingRemote.current = cached.theme;
        setAppliedRemote(cached.theme);
      }

      const result = await api.getConfig(cached?.revision ?? null);
      if (cancelled || !result.success || !result.data) return;
      if (result.data.unchanged) return;

      const doc = { revision: result.data.revision, theme: result.data.theme };
      pendingRemote.current = doc.theme;
      // Applied on the next open, never now: the sheet may be on screen.
      await storage?.setItem(CONFIG_CACHE_KEY, serialiseConfig(doc)).catch(() => undefined);
    };

    // A config that cannot be fetched is not an error the host app should see;
    // the sheet simply keeps the colours it already has.
    void load().catch(() => undefined);

    return () => {
      cancelled = true;
    };
  }, [api, storage]);

  const resolvedTheme = useMemo(
    () => resolveTheme(mergeThemeOverrides(appliedRemote, configTheme), colorScheme),
    [appliedRemote, configTheme, colorScheme],
  );

  const queue = useMemo(() => createQueue(storage ?? noopStorage), [storage]);
  const getInstallationId = useMemo(() => createInstallationId(storage ?? noopStorage), [storage]);

  // When and how the sheet was opened — becomes occurredAt / report.trigger of the envelope.
  const openedAt = useRef<Date>(new Date());
  const trigger = useRef<ReportInput['trigger']>('api');

  // The app's root view, captured as the bug screenshot right before the sheet covers it.
  const rootRef = useRef<View>(null);
  const viewShot = useMemo(loadViewShot, []);
  const imagePicker = useMemo(loadImagePicker, []);
  const [screenshot, setScreenshot] = useState<LocalAttachment | null>(null);

  const present = useCallback((how: ReportInput['trigger']): void => {
    // Promote whatever the last fetch produced. Doing it here rather than on
    // arrival is what keeps the sheet from changing colour mid-sentence.
    setAppliedRemote(pendingRemote.current);
    openedAt.current = new Date();
    trigger.current = how;
    if (!viewShot) {
      setScreenshot(null);
      sheetRef.current?.present();
      return;
    }
    captureScreenshot(viewShot, rootRef)
      .then(setScreenshot)
      .finally(() => sheetRef.current?.present());
  }, [viewShot]);

  const flatten = useMemo(
    () => (viewShot ? (view: unknown) => flattenView(viewShot, view, 0.9) : undefined),
    [viewShot],
  );
  const pickMedia = useMemo(
    () => (imagePicker ? (current: readonly LocalAttachment[]) => pickFromLibrary(imagePicker, current) : undefined),
    [imagePicker],
  );

  const open = useCallback((): void => present('api'), [present]);
  const openFromShake = useCallback((): void => present('shake'), [present]);


  const close = useCallback((): void => {
    sheetRef.current?.dismiss();
  }, []);

  const breadcrumbs = useBreadcrumbs(endpoint ?? DEFAULT_ENDPOINT);

  useShake(openFromShake, { threshold: shakeThreshold, enabled: shakeEnabled });

  const sendReport = useMemo(
    () => createReportSender({
      api,
      queue,
      getInstallationId,
      getBreadcrumbs: breadcrumbs.getBreadcrumbs,
      getCurrentScreen: breadcrumbs.getCurrentScreen,
      collectDeviceContext,
    }),
    [api, queue, getInstallationId, breadcrumbs],
  );
  const submitReport = useCallback(
    (report: Omit<ReportInput, 'trigger'>, attachments: readonly LocalAttachment[] = []) =>
      sendReport({ ...report, trigger: trigger.current }, openedAt.current, attachments),
    [sendReport],
  );

  const loadIdeas = useCallback(async () => {
    const result = await api.listIdeas(await getInstallationId());
    if (!result.success || !result.data) throw new Error(result.error ?? 'Failed to load ideas');
    return result.data;
  }, [api, getInstallationId]);
  const vote = useCallback(
    async (ideaId: string) => (await api.vote(ideaId, await getInstallationId())).success,
    [api, getInstallationId],
  );

  const strings = useMemo(
    () => resolveStrings(locale ?? deviceLanguageTag(), stringOverrides),
    [locale, stringOverrides],
  );

  useEffect(() => {
    queue.flush(api);
  }, [queue, api]);

  const contextValue = useMemo<HindbrainContextValue>(
    () => ({ ...breadcrumbs, open, close, theme: resolvedTheme }),
    [breadcrumbs, open, close, resolvedTheme],
  );

  return (
    <HindbrainContext.Provider value={contextValue}>
      <BottomSheetModalProvider>
        <View ref={rootRef} collapsable={false} style={styles.root}>
          {children}
        </View>
        <FeedbackSheet
          sheetRef={sheetRef}
          colors={resolvedTheme}
          strings={strings}
          radius={configTheme?.radius ?? defaultTheme.radius}
          submitReport={submitReport}
          loadIdeas={loadIdeas}
          vote={vote}
          screenshot={screenshot}
          pickMedia={pickMedia}
          flatten={flatten}
        />
      </BottomSheetModalProvider>
    </HindbrainContext.Provider>
  );
}

const styles = StyleSheet.create({ root: { flex: 1 } });
