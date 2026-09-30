import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { IdeaListItem } from '../shared';
import type { SendResult } from '../envelope/send';
import { useSheet, useSheetFooter } from './SheetContext';
import { findSimilarIdeas } from './similarIdeas';
import { Field, SPACE, styles as ui } from './ui/primitives';
import { Icon } from './ui/Icon';
import type { Result } from './ResultScreen';
import type { LocalAttachment } from '../attachments';
import { AttachmentStrip } from './AttachmentStrip';
import { Annotator } from './Annotator';

interface Props {
  type: 'bug' | 'idea';
  onSubmit: (report: { type: 'bug' | 'idea'; title?: string; body: string }, attachments: readonly LocalAttachment[]) => Promise<SendResult>;
  /** Screenshot taken before the sheet opened; bug reports start with it attached. */
  initialAttachments?: readonly LocalAttachment[];
  /** Opens the media library; absent when no picker is installed. */
  pickMedia?: (current: readonly LocalAttachment[]) => Promise<LocalAttachment[]>;
  /** Flattens a view to JPEG for the mark-up editor; absent when view-shot is not installed. */
  flatten?: (view: unknown) => Promise<{ uri: string; bytes: number } | null>;
  onDone: (result: Result) => void;
  /** Ideas for the "already suggested?" panel; only used for type 'idea'. */
  loadIdeas?: () => Promise<IdeaListItem[]>;
  vote?: (ideaId: string) => Promise<boolean>;
}

export function ReportForm({ type, onSubmit, onDone, loadIdeas, vote, initialAttachments = [], pickMedia, flatten }: Props): React.ReactElement {
  const { colors, strings, radius } = useSheet();
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ideas, setIdeas] = useState<IdeaListItem[]>([]);
  const [votedHere, setVotedHere] = useState<ReadonlySet<string>>(new Set());
  const [attachments, setAttachments] = useState<readonly LocalAttachment[]>(type === 'bug' ? initialAttachments : []);
  const [markingUp, setMarkingUp] = useState<string | null>(null);
  const editing = attachments.find((a) => a.clientId === markingUp) ?? null;

  useEffect(() => {
    if (type !== 'idea' || !loadIdeas) return;
    loadIdeas().then(setIdeas).catch(() => setIdeas([]));
  }, [type, loadIdeas]);

  const similar = useMemo(() => (type === 'idea' ? findSimilarIdeas(title, ideas) : []), [type, title, ideas]);
  const isBug = type === 'bug';
  const valid = isBug ? body.trim().length > 0 : title.trim().length > 0;

  const submit = async (): Promise<void> => {
    setBusy(true);
    setError(null);
    try {
      const text = body.trim() || title.trim();
      const result = await onSubmit({ type, title: title.trim() || undefined, body: text }, attachments);
      onDone({ outcome: result.status, type });
    } catch {
      setError(strings.submitError);
    } finally {
      setBusy(false);
    }
  };

  useSheetFooter({
    label: isBug ? strings.bugSubmit : strings.ideaSubmit,
    onPress: submit,
    disabled: !valid,
    loading: busy,
    testID: 'submit-button',
  });

  const voteFor = async (idea: IdeaListItem): Promise<void> => {
    if (!vote || votedHere.has(idea.id) || idea.votedByMe) return;
    setVotedHere(new Set([...votedHere, idea.id]));
    const ok = await vote(idea.id);
    if (!ok) setVotedHere(new Set([...votedHere].filter((id) => id !== idea.id)));
  };

  return (
    <View style={ui.body}>
      {isBug ? (
        <>
          <Field testID="submit-input" label={strings.bugBodyLabel} placeholder={strings.bugBodyPlaceholder} value={body} onChangeText={setBody} multiline autoFocus />
          <AttachmentStrip
            attachments={attachments}
            onRemove={(id) => setAttachments(attachments.filter((a) => a.clientId !== id))}
            onMarkUp={flatten ? setMarkingUp : undefined}
            onAdd={pickMedia ? async () => {
              const added = await pickMedia(attachments).catch(() => []);
              if (added.length > 0) setAttachments([...attachments, ...added]);
            } : undefined}
          />
          <View style={[styles.note, { backgroundColor: colors.surface, borderRadius: radius - 2 }]}>
            <Icon name="device" size={18} color={colors.textMuted} />
            <Text style={[ui.note, styles.noteText, { color: colors.textMuted }]}>{strings.bugContextNote}</Text>
          </View>
        </>
      ) : (
        <>
          <Field testID="submit-title-input" label={strings.ideaTitleLabel} placeholder={strings.ideaTitlePlaceholder} value={title} onChangeText={setTitle} autoFocus maxLength={120} />
          <Field testID="submit-input" label={strings.ideaBodyLabel} value={body} onChangeText={setBody} multiline />
          {similar.length > 0 && (
            <View testID="similar-ideas" style={[styles.similar, { backgroundColor: colors.surface, borderRadius: radius }]}>
              <Text style={[styles.similarTitle, { color: colors.text }]}>{strings.ideaSimilarTitle}</Text>
              {similar.map((idea) => {
                const voted = idea.votedByMe || votedHere.has(idea.id);
                return (
                  <Pressable key={idea.id} testID={`similar-${idea.id}`} onPress={() => voteFor(idea)} accessibilityRole="button" style={styles.similarRow}>
                    <View style={[styles.pill, { borderColor: voted ? colors.accent : colors.border, borderRadius: radius - 4 }]}>
                      <Icon name="chevronUp" size={16} color={voted ? colors.accent : colors.textMuted} />
                      <Text style={[styles.pillCount, { color: voted ? colors.accent : colors.text }]}>{idea.voteCount + (votedHere.has(idea.id) ? 1 : 0)}</Text>
                    </View>
                    <Text numberOfLines={2} style={[styles.similarText, { color: colors.text }]}>{idea.title}</Text>
                  </Pressable>
                );
              })}
            </View>
          )}
        </>
      )}
      {editing && flatten && (
        <Annotator
          attachment={editing}
          flatten={flatten}
          onCancel={() => setMarkingUp(null)}
          onDone={(updated) => {
            setAttachments(attachments.map((a) => (a.clientId === updated.clientId ? updated : a)));
            setMarkingUp(null);
          }}
        />
      )}
      {error && <Text testID="submit-error" style={[ui.note, { color: colors.danger }]}>{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  note: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: SPACE.md },
  noteText: { flex: 1 },
  similar: { padding: SPACE.md, gap: SPACE.xs },
  similarTitle: { fontSize: 13, fontWeight: '600', paddingBottom: SPACE.xs },
  similarRow: { flexDirection: 'row', alignItems: 'center', gap: SPACE.md, paddingVertical: SPACE.sm, minHeight: 44 },
  pill: { width: 44, alignItems: 'center', paddingVertical: 4, borderWidth: 1 },
  pillCount: { fontSize: 13, fontWeight: '600' },
  similarText: { flex: 1, fontSize: 15 },
});
