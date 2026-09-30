import React from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { isVideo, MAX_IMAGES, MAX_VIDEOS, type LocalAttachment } from '../attachments';
import { useSheet } from './SheetContext';
import { Icon } from './ui/Icon';
import { SPACE } from './ui/primitives';

interface Props {
  attachments: readonly LocalAttachment[];
  onRemove: (clientId: string) => void;
  /** Opens the mark-up editor for an image; absent when mark-up is unavailable. */
  onMarkUp?: (clientId: string) => void;
  /** Absent when no media picker is installed. */
  onAdd?: () => void;
}

const THUMB_W = 64;
const THUMB_H = 112;

/** Thumbnails of what will be attached, with remove buttons and an "add" tile. */
export function AttachmentStrip({ attachments, onRemove, onAdd, onMarkUp }: Props): React.ReactElement | null {
  const { colors, strings, radius } = useSheet();
  const full =
    attachments.filter((a) => !isVideo(a)).length >= MAX_IMAGES && attachments.filter(isVideo).length >= MAX_VIDEOS;
  if (attachments.length === 0 && !onAdd) return null;
  const tileRadius = Math.max(8, radius - 6);
  return (
    <View style={styles.wrap}>
      {attachments.some((a) => a.kind === 'screenshot') && (
        <Text style={[styles.caption, { color: colors.textMuted }]}>{strings.attachScreenshot}</Text>
      )}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row} keyboardShouldPersistTaps="handled">
        {attachments.map((a) => (
          <View key={a.clientId} testID={`attachment-${a.kind}`} style={[styles.thumb, { borderColor: colors.border, borderRadius: tileRadius, backgroundColor: colors.surface }]}>
            {isVideo(a) ? (
              <View style={styles.center}><Icon name="video" size={22} color={colors.textMuted} /></View>
            ) : (
              <Image source={{ uri: a.uri }} style={[StyleSheet.absoluteFill, { borderRadius: tileRadius }]} resizeMode="cover" />
            )}
            {onMarkUp && !isVideo(a) && (
              <Pressable
                testID={`attachment-markup-${a.clientId}`}
                onPress={() => onMarkUp(a.clientId)}
                accessibilityRole="button"
                accessibilityLabel={strings.markUp}
                style={[styles.markUp, { backgroundColor: colors.accent }]}
              >
                <Icon name="pencil" size={14} color={colors.onAccent} />
              </Pressable>
            )}
            <Pressable
              testID={`attachment-remove-${a.clientId}`}
              onPress={() => onRemove(a.clientId)}
              accessibilityRole="button"
              accessibilityLabel={strings.attachRemove}
              hitSlop={10}
              style={[styles.remove, { backgroundColor: colors.background, borderColor: colors.border }]}
            >
              <Icon name="x" size={12} color={colors.text} />
            </Pressable>
          </View>
        ))}
        {onAdd && !full && (
          <Pressable
            testID="attachment-add"
            onPress={onAdd}
            accessibilityRole="button"
            accessibilityLabel={strings.attachAdd}
            accessibilityHint={strings.attachLimit}
            style={[styles.thumb, styles.center, styles.add, { borderColor: colors.border, borderRadius: tileRadius }]}
          >
            <Icon name="photo" size={22} color={colors.accent} />
          </Pressable>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: SPACE.sm },
  caption: { fontSize: 13, fontWeight: '500' },
  row: { gap: SPACE.sm, paddingRight: SPACE.sm },
  thumb: { width: THUMB_W, height: THUMB_H, borderWidth: StyleSheet.hairlineWidth, overflow: 'hidden' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  add: { borderStyle: 'dashed', borderWidth: 1 },
  markUp: { position: 'absolute', bottom: 6, left: 6, right: 6, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  remove: { position: 'absolute', top: 4, right: 4, width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center', borderWidth: StyleSheet.hairlineWidth },
});
