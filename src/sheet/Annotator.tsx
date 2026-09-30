import React, { useCallback, useContext, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import {
  Image,
  Modal,
  PanResponder,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type GestureResponderEvent,
  type LayoutChangeEvent,
} from 'react-native';
import Svg, { Path, Rect, Text as SvgText } from 'react-native-svg';
import { SafeAreaInsetsContext } from 'react-native-safe-area-context';
import type { LocalAttachment } from '../attachments';
import { format } from '../i18n';
import { useSheet } from './SheetContext';
import { Icon, type IconName } from './ui/Icon';
import { SPACE } from './ui/primitives';
import { annotate, arrowHead, initialAnnotation, penPath, rectBetween, type Point, type Shape, type Tool } from './annotation';

interface Props {
  attachment: LocalAttachment;
  /** Flattens the canvas view into a new JPEG; null when capture is unavailable or fails. */
  flatten: (view: unknown) => Promise<{ uri: string; bytes: number } | null>;
  onCancel: () => void;
  onDone: (updated: LocalAttachment) => void;
}

const STROKE = 4;
const TEXT_SIZE = 18;
const REDACT_FILL = '#000000';
const NO_INSETS = { top: 0, bottom: 0, left: 0, right: 0 };

const TOOLS: readonly { tool: Tool; icon: IconName; label: 'toolPen' | 'toolArrow' | 'toolText' | 'toolRedact' }[] = [
  { tool: 'pen', icon: 'pencil', label: 'toolPen' },
  { tool: 'arrow', icon: 'arrow', label: 'toolArrow' },
  { tool: 'text', icon: 'text', label: 'toolText' },
  { tool: 'redact', icon: 'square', label: 'toolRedact' },
];

const pointOf = (e: GestureResponderEvent): Point => ({ x: e.nativeEvent.locationX, y: e.nativeEvent.locationY });

/** Fits an image of `aspect` (w/h) into the available box. */
function fit(box: { width: number; height: number }, aspect: number) {
  const width = Math.min(box.width, box.height * aspect);
  return { width, height: width / aspect };
}

function ShapeView({ shape }: { shape: Shape }): React.ReactElement {
  switch (shape.kind) {
    case 'pen':
      return <Path d={penPath(shape.points)} stroke={shape.color} strokeWidth={STROKE} strokeLinecap="round" strokeLinejoin="round" fill="none" />;
    case 'arrow':
      return (
        <>
          <Path d={penPath([shape.from, shape.to])} stroke={shape.color} strokeWidth={STROKE} strokeLinecap="round" fill="none" />
          <Path d={arrowHead(shape.from, shape.to)} stroke={shape.color} strokeWidth={STROKE} strokeLinecap="round" strokeLinejoin="round" fill="none" />
        </>
      );
    case 'redact': {
      const r = rectBetween(shape.from, shape.to);
      return <Rect {...r} rx={3} fill={REDACT_FILL} />;
    }
    case 'text':
      return (
        <SvgText x={shape.at.x} y={shape.at.y} fill={shape.color} fontSize={TEXT_SIZE} fontWeight="600" stroke="#FFFFFF" strokeWidth={0.6}>
          {shape.text}
        </SvgText>
      );
  }
}

/**
 * Full-screen mark-up editor for a screenshot or photo: pen, arrow, text label and a solid
 * box to hide private data. "Done" flattens image + shapes into a new JPEG, so hidden areas
 * are gone from the pixels, not just covered.
 */
export function Annotator({ attachment, flatten, onCancel, onDone }: Props): React.ReactElement {
  const { colors, strings, radius } = useSheet();
  const insets = useContext(SafeAreaInsetsContext) ?? NO_INSETS;
  const [state, dispatch] = useReducer(annotate, initialAnnotation);
  const [tool, setTool] = useState<Tool>('pen');
  const palette = useMemo(() => [colors.danger, colors.accent, colors.text], [colors]);
  const [color, setColor] = useState<string>(colors.danger);
  const [box, setBox] = useState({ width: 0, height: 0 });
  const [aspect, setAspect] = useState(9 / 19.5);
  const [label, setLabel] = useState('');
  const [saving, setSaving] = useState(false);
  const [failed, setFailed] = useState(false);
  const canvasRef = useRef<View>(null);

  useEffect(() => {
    Image.getSize(attachment.uri, (w, h) => h > 0 && setAspect(w / h), () => undefined);
  }, [attachment.uri]);

  // Latest tool/colour for the gesture callbacks, which PanResponder captures once.
  const current = useRef({ tool, color });
  current.current = { tool, color };

  const responder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: (e) => {
          const { tool: t, color: c } = current.current;
          if (t === 'text') dispatch({ type: 'placeText', point: pointOf(e) });
          else dispatch({ type: 'start', tool: t, color: c, point: pointOf(e) });
        },
        onPanResponderMove: (e) => dispatch({ type: 'move', point: pointOf(e) }),
        onPanResponderRelease: () => dispatch({ type: 'end' }),
      }),
    [],
  );

  const commitLabel = useCallback(() => {
    dispatch({ type: 'commitText', text: label, color: current.current.color });
    setLabel('');
  }, [label]);

  const done = async (): Promise<void> => {
    if (state.shapes.length === 0) return onCancel();
    setSaving(true);
    setFailed(false);
    const file = await flatten(canvasRef);
    setSaving(false);
    if (file) onDone({ ...attachment, ...file, mime: 'image/jpeg', annotated: true });
    else setFailed(true);
  };

  const size = box.width > 0 ? fit(box, aspect) : null;
  const onLayout = (e: LayoutChangeEvent) => setBox({ width: e.nativeEvent.layout.width, height: e.nativeEvent.layout.height });

  return (
    <Modal visible animationType="slide" presentationStyle="fullScreen" onRequestClose={onCancel}>
      <View style={[styles.screen, { backgroundColor: colors.background, paddingTop: insets.top, paddingBottom: insets.bottom }]}>
        <View style={styles.topBar}>
          <Pressable testID="markup-cancel" onPress={onCancel} accessibilityRole="button" hitSlop={8} style={styles.topButton}>
            <Text style={[styles.topText, { color: colors.textMuted }]}>{strings.cancel}</Text>
          </Pressable>
          <Text accessibilityRole="header" style={[styles.title, { color: colors.text }]}>{strings.markUpTitle}</Text>
          <Pressable testID="markup-done" onPress={done} disabled={saving} accessibilityRole="button" hitSlop={8} style={styles.topButton}>
            <Text style={[styles.topText, styles.doneText, { color: colors.accent }]}>{strings.done}</Text>
          </Pressable>
        </View>

        <View testID="markup-stage" style={styles.stage} onLayout={onLayout}>
          {size && (
            <View
              testID="markup-canvas"
              ref={canvasRef}
              collapsable={false}
              style={[size, { borderRadius: radius, borderColor: colors.border }, styles.canvas]}
              {...responder.panHandlers}
            >
              <Image source={{ uri: attachment.uri }} style={StyleSheet.absoluteFill} resizeMode="cover" />
              <Svg style={StyleSheet.absoluteFill} width={size.width} height={size.height}>
                {state.shapes.map((shape, i) => <ShapeView key={i} shape={shape} />)}
                {state.draft && <ShapeView shape={state.draft} />}
              </Svg>
              {state.pendingText && (
                <TextInput
                  testID="markup-text-input"
                  autoFocus
                  value={label}
                  onChangeText={setLabel}
                  onSubmitEditing={commitLabel}
                  onBlur={commitLabel}
                  placeholder={strings.textPlaceholder}
                  placeholderTextColor={colors.textMuted}
                  returnKeyType="done"
                  style={[styles.labelInput, { left: state.pendingText.x, top: state.pendingText.y - TEXT_SIZE - 8, color, borderColor: color, backgroundColor: colors.background }]}
                />
              )}
            </View>
          )}
        </View>

        <Text testID={failed ? 'markup-error' : undefined} style={[styles.hint, { color: failed ? colors.danger : colors.textMuted }]}>
          {failed ? strings.markUpFailed : strings.markUpHint}
        </Text>
        <View style={[styles.toolbar, { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius + 4 }]}>
          {TOOLS.map((t) => {
            const active = tool === t.tool;
            return (
              <Pressable
                key={t.tool}
                testID={`markup-tool-${t.tool}`}
                onPress={() => setTool(t.tool)}
                accessibilityRole="button"
                accessibilityLabel={strings[t.label]}
                accessibilityState={{ selected: active }}
                style={[styles.tool, { borderRadius: radius - 4 }, active && { backgroundColor: colors.accent }]}
              >
                <Icon name={t.icon} size={20} color={active ? colors.onAccent : colors.text} />
              </Pressable>
            );
          })}
          <Pressable testID="markup-undo" onPress={() => dispatch({ type: 'undo' })} accessibilityRole="button" accessibilityLabel={strings.undo} style={styles.tool}>
            <Icon name="undo" size={20} color={colors.text} />
          </Pressable>
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          {palette.map((c, i) => (
            <Pressable
              key={c}
              testID={`markup-color-${i}`}
              onPress={() => setColor(c)}
              accessibilityRole="button"
              accessibilityLabel={format(strings.colorLabel, { n: i + 1 })}
              accessibilityState={{ selected: color === c }}
              style={styles.swatchHit}
            >
              <View style={[styles.swatch, { backgroundColor: c }, color === c && { borderColor: colors.text, borderWidth: 2 }]} />
            </Pressable>
          ))}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  topBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: SPACE.lg, minHeight: 52 },
  topButton: { minWidth: 64, minHeight: 44, justifyContent: 'center' },
  topText: { fontSize: 16 },
  doneText: { fontWeight: '600', textAlign: 'right' },
  title: { flex: 1, textAlign: 'center', fontSize: 17, fontWeight: '600' },
  stage: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: SPACE.xl },
  canvas: { overflow: 'hidden', borderWidth: StyleSheet.hairlineWidth },
  labelInput: { position: 'absolute', minWidth: 120, paddingHorizontal: 8, paddingVertical: 4, fontSize: TEXT_SIZE, fontWeight: '600', borderWidth: 1, borderRadius: 6 },
  hint: { textAlign: 'center', fontSize: 13, paddingHorizontal: SPACE.xl, paddingBottom: SPACE.sm },
  toolbar: { flexDirection: 'row', alignItems: 'center', alignSelf: 'center', gap: 4, padding: 6, marginBottom: SPACE.md, borderWidth: StyleSheet.hairlineWidth },
  tool: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  divider: { width: 1, height: 24, marginHorizontal: 4 },
  swatchHit: { width: 36, height: 44, alignItems: 'center', justifyContent: 'center' },
  swatch: { width: 22, height: 22, borderRadius: 11 },
});
