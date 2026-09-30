import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TouchableOpacity, View, type TextInputProps } from 'react-native';
import { BottomSheetTextInput } from '@gorhom/bottom-sheet';
import { useSheet } from '../SheetContext';
import { Icon, type IconName } from './Icon';

export const SPACE = { xs: 4, sm: 8, md: 12, lg: 16, xl: 20 } as const;
const TOUCH = 44;

export function IconButton({ icon, label, onPress, testID, muted }: {
  icon: IconName; label: string; onPress: () => void; testID?: string; muted?: boolean;
}): React.ReactElement {
  const { colors } = useSheet();
  return (
    <Pressable testID={testID} onPress={onPress} accessibilityRole="button" accessibilityLabel={label} hitSlop={4} style={styles.iconButton}>
      <Icon name={icon} size={22} color={muted ? colors.textMuted : colors.text} />
    </Pressable>
  );
}

/** Back · title · close row used by every step except the hub. */
export function Header({ title, onBack, onClose, backTestID }: {
  title: string; onBack: () => void; onClose: () => void; backTestID?: string;
}): React.ReactElement {
  const { colors, strings } = useSheet();
  return (
    <View style={styles.header}>
      <IconButton icon="chevronLeft" label={strings.back} onPress={onBack} testID={backTestID} />
      <Text accessibilityRole="header" numberOfLines={1} style={[styles.headerTitle, { color: colors.text }]}>{title}</Text>
      <IconButton icon="x" label={strings.close} onPress={onClose} muted />
    </View>
  );
}

export function Button({ label, onPress, variant = 'primary', disabled, loading, testID }: {
  label: string; onPress: () => void; variant?: 'primary' | 'secondary'; disabled?: boolean; loading?: boolean; testID?: string;
}): React.ReactElement {
  const { colors, radius } = useSheet();
  const primary = variant === 'primary';
  const fg = primary ? colors.onAccent : colors.text;
  return (
    <TouchableOpacity
      testID={testID}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.85}
      accessibilityRole="button"
      accessibilityState={{ disabled: Boolean(disabled), busy: Boolean(loading) }}
      style={[
        styles.button,
        { borderRadius: Math.max(8, radius - 2), backgroundColor: primary ? colors.accent : colors.surface },
        disabled && styles.disabled,
      ]}
    >
      {loading ? <ActivityIndicator color={fg} /> : <Text style={[styles.buttonText, { color: fg }]}>{label}</Text>}
    </TouchableOpacity>
  );
}

export function Field({ label, multiline, testID, ...input }: TextInputProps & { label: string }): React.ReactElement {
  const { colors, radius } = useSheet();
  return (
    <View style={styles.field}>
      <Text style={[styles.label, { color: colors.textMuted }]}>{label}</Text>
      <BottomSheetTextInput
        {...input}
        testID={testID}
        multiline={multiline}
        accessibilityLabel={label}
        placeholderTextColor={colors.textMuted}
        textAlignVertical={multiline ? 'top' : 'center'}
        style={[
          styles.input,
          multiline && styles.inputMultiline,
          { color: colors.text, borderColor: colors.border, backgroundColor: colors.background, borderRadius: Math.max(8, radius - 2) },
        ]}
      />
    </View>
  );
}

export const styles = StyleSheet.create({
  iconButton: { width: TOUCH, height: TOUCH, alignItems: 'center', justifyContent: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: SPACE.sm, paddingBottom: SPACE.xs },
  headerTitle: { flex: 1, textAlign: 'center', fontSize: 17, fontWeight: '600' },
  button: { minHeight: 52, alignItems: 'center', justifyContent: 'center', paddingHorizontal: SPACE.lg },
  buttonText: { fontSize: 16, fontWeight: '600' },
  disabled: { opacity: 0.45 },
  field: { gap: SPACE.sm },
  label: { fontSize: 13, fontWeight: '500' },
  input: { borderWidth: 1, paddingHorizontal: 14, paddingVertical: 12, fontSize: 16, lineHeight: 22 },
  inputMultiline: { minHeight: 120 },
  body: { paddingHorizontal: SPACE.xl, paddingTop: SPACE.sm, gap: 18 },
  title: { fontSize: 22, fontWeight: '600', letterSpacing: -0.2 },
  subtitle: { fontSize: 14, lineHeight: 20 },
  note: { fontSize: 13, lineHeight: 18 },
});
