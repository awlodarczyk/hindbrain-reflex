import React from 'react';
import { Text, TouchableOpacity, View, StyleSheet } from 'react-native';
import { useSheet } from './SheetContext';
import { Icon, type IconName } from './ui/Icon';
import { SPACE, styles as ui } from './ui/primitives';

export type Flow = 'bug' | 'idea' | 'vote';
export const ALL_FLOWS: readonly Flow[] = ['bug', 'idea', 'vote'];

interface Props {
  flows?: readonly Flow[];
  onSelect: (flow: Flow) => void;
}

export function HubScreen({ flows = ALL_FLOWS, onSelect }: Props): React.ReactElement {
  const { colors, strings, radius } = useSheet();
  const rows: Record<Flow, { icon: IconName; tint: string; label: string; hint: string }> = {
    bug: { icon: 'bug', tint: colors.danger, label: strings.hubBugLabel, hint: strings.hubBugHint },
    idea: { icon: 'bulb', tint: colors.accent, label: strings.hubIdeaLabel, hint: strings.hubIdeaHint },
    vote: { icon: 'vote', tint: colors.accent, label: strings.hubVoteLabel, hint: strings.hubVoteHint },
  };
  return (
    <View style={styles.container}>
      <View style={styles.intro}>
        <Text accessibilityRole="header" style={[ui.title, { color: colors.text }]}>{strings.hubTitle}</Text>
        <Text style={[ui.subtitle, { color: colors.textMuted }]}>{strings.hubSubtitle}</Text>
      </View>
      <View style={styles.list}>
        {flows.map((flow) => {
          const row = rows[flow];
          return (
            <TouchableOpacity
              key={flow}
              activeOpacity={0.8}
              testID={`hub-${flow}`}
              onPress={() => onSelect(flow)}
              accessibilityRole="button"
              accessibilityLabel={row.label}
              accessibilityHint={row.hint}
              style={[styles.row, { backgroundColor: colors.surface, borderRadius: radius }]}
            >
              <View style={[styles.tile, { backgroundColor: colors.background, borderColor: colors.border, borderRadius: Math.max(8, radius - 4) }]}>
                <Icon name={row.icon} color={row.tint} />
              </View>
              <View style={styles.rowText}>
                <Text style={[styles.rowLabel, { color: colors.text }]}>{row.label}</Text>
                <Text style={[styles.rowHint, { color: colors.textMuted }]}>{row.hint}</Text>
              </View>
              <Icon name="chevronRight" size={18} color={colors.textMuted} />
            </TouchableOpacity>
          );
        })}
      </View>
      <Text style={[styles.powered, { color: colors.textMuted }]}>{strings.poweredBy}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { paddingBottom: SPACE.lg },
  intro: { paddingHorizontal: SPACE.xl, paddingTop: SPACE.md, paddingBottom: SPACE.lg, gap: SPACE.xs },
  list: { paddingHorizontal: SPACE.lg, gap: SPACE.sm },
  row: { flexDirection: 'row', alignItems: 'center', gap: SPACE.md, padding: SPACE.md, minHeight: 64 },
  tile: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', borderWidth: StyleSheet.hairlineWidth },
  rowText: { flex: 1, gap: 2 },
  rowLabel: { fontSize: 16, fontWeight: '500' },
  rowHint: { fontSize: 13 },
  powered: { fontSize: 12, textAlign: 'center', paddingTop: SPACE.lg },
});
