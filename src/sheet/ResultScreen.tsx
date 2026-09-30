import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useSheet, useSheetFooter } from './SheetContext';
import { ResultAnimation } from './ResultAnimation';
import { SPACE, styles as ui } from './ui/primitives';

export type Result = { readonly outcome: 'sent' | 'queued'; readonly type: 'bug' | 'idea' };

export function ResultScreen({ result, onDone }: { result: Result; onDone: () => void }): React.ReactElement {
  const { colors, strings } = useSheet();
  const sent = result.outcome === 'sent';
  const tint = sent ? colors.success : colors.textMuted;
  const title = !sent ? strings.queuedTitle : result.type === 'bug' ? strings.sentBugTitle : strings.sentIdeaTitle;
  const body = !sent ? strings.queuedBody : result.type === 'bug' ? strings.sentBugBody : strings.sentIdeaBody;
  useSheetFooter({ label: strings.done, onPress: onDone, variant: 'secondary', testID: 'result-done' });
  return (
    <View testID={sent ? 'submit-success' : 'submit-queued'} style={styles.container} accessibilityLiveRegion="polite">
      <View style={styles.badge}>
        <ResultAnimation kind={result.outcome} tint={tint} background={colors.background} />
      </View>
      <Text accessibilityRole="header" style={[ui.title, { color: colors.text }]}>{title}</Text>
      <Text style={[ui.subtitle, styles.body, { color: colors.textMuted }]}>{body}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', gap: SPACE.sm + 2, paddingHorizontal: 24, paddingTop: 28, paddingBottom: SPACE.sm },
  badge: { marginBottom: SPACE.xs },
  body: { textAlign: 'center' },
});
