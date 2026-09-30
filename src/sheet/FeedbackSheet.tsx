import React, { useCallback, useContext, useMemo, useState } from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import {
  BottomSheetBackdrop,
  BottomSheetFooter,
  BottomSheetModal,
  BottomSheetScrollView,
  type BottomSheetBackdropProps,
  type BottomSheetFooterProps,
} from '@gorhom/bottom-sheet';
import { SafeAreaInsetsContext } from 'react-native-safe-area-context';
import type { HindbrainThemeColors } from '../types';
import type { HindbrainStrings } from '../i18n';
import type { IdeaListItem } from '../shared';
import type { SendResult } from '../envelope/send';
import type { LocalAttachment } from '../attachments';
import { SheetProvider, type FooterAction, type SheetContextValue } from './SheetContext';
import { HubScreen, type Flow } from './HubScreen';
import { ReportForm } from './ReportForm';
import { VoteList } from './VoteList';
import { ResultScreen, type Result } from './ResultScreen';
import { Button, Header, SPACE } from './ui/primitives';
import { useKeyboardVisible } from '../useKeyboardVisible';

type Step = 'hub' | Flow | 'result';

const NO_INSETS = { top: 0, bottom: 0, left: 0, right: 0 };
/** Gap kept between the sheet's top edge and the top safe-area inset at full height. */
const TOP_GAP = 8;

export interface FeedbackSheetProps {
  /** Works with both React 18 `RefObject<T>` and React 19 `RefObject<T | null>`. */
  sheetRef: { readonly current: BottomSheetModal | null };
  colors: HindbrainThemeColors;
  strings: HindbrainStrings;
  radius: number;
  flows?: readonly Flow[];
  submitReport: (report: { type: 'bug' | 'idea'; title?: string; body: string }, attachments: readonly LocalAttachment[]) => Promise<SendResult>;
  /** Screenshot captured when the sheet was opened (null when unavailable). */
  screenshot: LocalAttachment | null;
  pickMedia?: (current: readonly LocalAttachment[]) => Promise<LocalAttachment[]>;
  flatten?: (view: unknown) => Promise<{ uri: string; bytes: number } | null>;
  loadIdeas: () => Promise<IdeaListItem[]>;
  vote: (ideaId: string) => Promise<boolean>;
}

/**
 * The bottom sheet: content-sized up to the screen height minus the top inset, body scrolls
 * past that, header (handle) and primary button (footer) stay pinned, and the keyboard
 * extends the sheet instead of covering the focused field. docs/specs/sheet-layout-and-motion.md
 */
export function FeedbackSheet({ sheetRef, colors, strings, radius, flows, submitReport, loadIdeas, vote, screenshot, pickMedia, flatten }: FeedbackSheetProps): React.ReactElement {
  const [step, setStep] = useState<Step>('hub');
  const [result, setResult] = useState<Result | null>(null);
  const [footer, setFooter] = useState<FooterAction | null>(null);
  const { height } = useWindowDimensions();
  const insets = useContext(SafeAreaInsetsContext) ?? NO_INSETS;
  const keyboardVisible = useKeyboardVisible();

  const close = useCallback(() => sheetRef.current?.dismiss(), [sheetRef]);
  const reset = useCallback(() => {
    setStep('hub');
    setResult(null);
    setFooter(null);
  }, []);
  const finish = useCallback((r: Result) => {
    setResult(r);
    setStep('result');
  }, []);

  const sheet = useMemo<SheetContextValue>(() => ({ colors, strings, radius, setFooter }), [colors, strings, radius]);
  const title = step === 'bug' ? strings.bugTitle : step === 'idea' ? strings.ideaTitle : step === 'vote' ? strings.voteTitle : null;

  const renderHandle = useCallback(
    () => (
      <SheetProvider value={sheet}>
        <View style={styles.grabberWrap}>
          <View style={[styles.grabber, { backgroundColor: colors.textMuted }]} />
        </View>
        {title !== null && <Header title={title} onBack={() => setStep('hub')} onClose={close} backTestID="sheet-back" />}
      </SheetProvider>
    ),
    [sheet, title, colors.textMuted, close],
  );

  const renderBackdrop = useCallback(
    (props: BottomSheetBackdropProps) => (
      <BottomSheetBackdrop {...props} appearsOnIndex={0} disappearsOnIndex={-1} opacity={1} pressBehavior="close" style={[props.style, { backgroundColor: colors.backdrop }]} />
    ),
    [colors.backdrop],
  );

  const renderFooter = useCallback(
    (props: BottomSheetFooterProps) =>
      footer ? (
        <BottomSheetFooter {...props}>
          <SheetProvider value={sheet}>
            <View
              style={[
                styles.footer,
                // The keyboard covers the home indicator, so its inset would only
                // add a gap between the button and the keys.
                { paddingBottom: (keyboardVisible ? 0 : insets.bottom) + SPACE.md, backgroundColor: colors.background },
              ]}
            >
              <Button {...footer} />
            </View>
          </SheetProvider>
        </BottomSheetFooter>
      ) : null,
    [footer, sheet, insets.bottom, keyboardVisible, colors.background],
  );

  const outerRadius = radius + 8;

  return (
    <BottomSheetModal
      ref={sheetRef}
      // gorhom makes the sheet a single accessible element by default, hiding every
      // control inside it from VoiceOver/TalkBack; expose the children instead.
      accessible={false}
      enableDynamicSizing
      maxDynamicContentSize={height - insets.top - TOP_GAP}
      topInset={insets.top}
      enablePanDownToClose
      keyboardBehavior="fillParent"
      keyboardBlurBehavior="restore"
      android_keyboardInputMode="adjustResize"
      enableBlurKeyboardOnGesture
      onDismiss={reset}
      backgroundStyle={{ backgroundColor: colors.background, borderTopLeftRadius: outerRadius, borderTopRightRadius: outerRadius }}
      handleComponent={renderHandle}
      backdropComponent={renderBackdrop}
      footerComponent={renderFooter}
    >
      <SheetProvider value={sheet}>
        <BottomSheetScrollView
          keyboardShouldPersistTaps="handled"
          enableFooterMarginAdjustment
          contentContainerStyle={{ paddingBottom: footer ? SPACE.sm : insets.bottom + SPACE.lg }}
        >
          {step === 'hub' && <HubScreen flows={flows} onSelect={setStep} />}
          {(step === 'bug' || step === 'idea') && (
            <ReportForm
              key={step}
              type={step}
              onSubmit={submitReport}
              onDone={finish}
              loadIdeas={loadIdeas}
              vote={vote}
              initialAttachments={screenshot ? [screenshot] : []}
              pickMedia={pickMedia}
              flatten={flatten}
            />
          )}
          {step === 'vote' && <VoteList loadIdeas={loadIdeas} vote={vote} />}
          {step === 'result' && result && <ResultScreen result={result} onDone={close} />}
        </BottomSheetScrollView>
      </SheetProvider>
    </BottomSheetModal>
  );
}

const styles = StyleSheet.create({
  grabberWrap: { alignItems: 'center', paddingTop: SPACE.sm, paddingBottom: SPACE.xs },
  grabber: { width: 36, height: 5, borderRadius: 3, opacity: 0.45 },
  footer: { paddingHorizontal: SPACE.xl, paddingTop: SPACE.md },
});
