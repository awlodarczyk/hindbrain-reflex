import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import type { IdeaListItem } from '../shared';
import { format } from '../i18n';
import { useSheet } from './SheetContext';
import { Icon } from './ui/Icon';
import { Button, SPACE } from './ui/primitives';

interface Props {
  loadIdeas: () => Promise<IdeaListItem[]>;
  /** Resolves true when the vote was stored. */
  vote: (ideaId: string) => Promise<boolean>;
}

type State =
  | { status: 'loading' }
  | { status: 'error' }
  | { status: 'loaded'; ideas: readonly IdeaListItem[] };

const withVote = (ideas: readonly IdeaListItem[], id: string, voted: boolean): IdeaListItem[] =>
  ideas.map((i) => (i.id === id ? { ...i, votedByMe: voted, voteCount: i.voteCount + (voted ? 1 : -1) } : i));

export function VoteList({ loadIdeas, vote }: Props): React.ReactElement {
  const { colors, strings, radius } = useSheet();
  const [state, setState] = useState<State>({ status: 'loading' });

  const load = useCallback(() => {
    setState({ status: 'loading' });
    loadIdeas()
      .then((ideas) => setState({ status: 'loaded', ideas: [...ideas].sort((a, b) => b.voteCount - a.voteCount) }))
      .catch(() => setState({ status: 'error' }));
  }, [loadIdeas]);

  useEffect(load, [load]);

  const handleVote = async (idea: IdeaListItem): Promise<void> => {
    if (idea.votedByMe || state.status !== 'loaded') return;
    setState({ status: 'loaded', ideas: withVote(state.ideas, idea.id, true) });
    const ok = await vote(idea.id);
    if (!ok) setState((s) => (s.status === 'loaded' ? { status: 'loaded', ideas: withVote(s.ideas, idea.id, false) } : s));
  };

  if (state.status === 'loading') {
    return <View style={styles.center}><ActivityIndicator testID="vote-loading" color={colors.accent} /></View>;
  }
  if (state.status === 'error') {
    return (
      <View style={[styles.center, styles.gap]}>
        <Text testID="vote-error" style={[styles.muted, { color: colors.textMuted }]}>{strings.voteError}</Text>
        <Button label={strings.voteRetry} onPress={load} variant="secondary" testID="vote-retry" />
      </View>
    );
  }
  if (state.ideas.length === 0) {
    return <View style={styles.center}><Text testID="vote-empty" style={[styles.muted, { color: colors.textMuted }]}>{strings.voteEmpty}</Text></View>;
  }
  return (
    <View testID="vote-list" style={styles.list}>
      {state.ideas.map((idea, index) => {
        const voted = idea.votedByMe;
        const label = format(voted ? strings.voteA11yVoted : strings.voteA11y, { title: idea.title, count: idea.voteCount });
        const pillRadius = Math.max(8, radius - 4);
        return (
          <View key={idea.id} style={[styles.row, index > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border }]}>
            <Pressable
              testID={`vote-button-${idea.id}`}
              onPress={() => handleVote(idea)}
              accessibilityRole="button"
              accessibilityLabel={label}
              accessibilityState={{ selected: voted }}
              style={[styles.pill, { borderRadius: pillRadius, borderColor: voted ? colors.accent : colors.border, backgroundColor: colors.background }]}
            >
              {voted && <View style={[StyleSheet.absoluteFill, styles.pillTint, { backgroundColor: colors.accent, borderRadius: pillRadius }]} />}
              <Icon name="chevronUp" size={18} color={voted ? colors.accent : colors.textMuted} />
              <Text style={[styles.count, { color: voted ? colors.accent : colors.text }]}>{idea.voteCount}</Text>
            </Pressable>
            <View style={styles.text}>
              <Text style={[styles.title, { color: colors.text }]}>{idea.title}</Text>
              {idea.body.length > 0 && <Text numberOfLines={2} style={[styles.bodyText, { color: colors.textMuted }]}>{idea.body}</Text>}
            </View>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: 'center', justifyContent: 'center', paddingVertical: 48, paddingHorizontal: 24 },
  gap: { gap: SPACE.md },
  muted: { fontSize: 15, textAlign: 'center' },
  list: { paddingHorizontal: SPACE.xl, paddingBottom: SPACE.lg },
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: 14, paddingVertical: SPACE.md },
  pill: { width: 48, minHeight: 52, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  pillTint: { opacity: 0.12 },
  count: { fontSize: 14, fontWeight: '600' },
  text: { flex: 1, gap: 3, paddingTop: 2 },
  title: { fontSize: 15, fontWeight: '500' },
  bodyText: { fontSize: 13, lineHeight: 18 },
});
