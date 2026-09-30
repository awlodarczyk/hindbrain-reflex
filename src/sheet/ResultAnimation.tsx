import React, { useEffect, useMemo, useState } from 'react';
import { AccessibilityInfo, StyleSheet, View } from 'react-native';
import { loadLottie } from '../optional';
import { Icon } from './ui/Icon';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const SUCCESS = require('../assets/lottie/success-check.json');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const QUEUED = require('../assets/lottie/queued-cloud.json');

const SIZE = 72;

/**
 * Lottie `success-check` / `queued-cloud` coloured from the theme; the static icon when
 * lottie-react-native is missing, and the last frame when the user prefers reduced motion.
 */
export function ResultAnimation({ kind, tint, background }: { kind: 'sent' | 'queued'; tint: string; background: string }): React.ReactElement {
  const Lottie = useMemo(loadLottie, []);
  const [reduceMotion, setReduceMotion] = useState(false);
  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion).catch(() => undefined);
  }, []);

  if (Lottie) {
    const colorFilters = kind === 'sent'
      ? [{ keypath: 'ring', color: tint }, { keypath: 'check', color: tint }, { keypath: 'halo', color: tint }]
      : [{ keypath: 'cloud', color: tint }, { keypath: 'arrow', color: background }];
    return (
      <Lottie
        testID={`result-lottie-${kind}`}
        source={kind === 'sent' ? SUCCESS : QUEUED}
        autoPlay={!reduceMotion}
        loop={false}
        progress={reduceMotion ? 1 : undefined}
        colorFilters={colorFilters}
        style={styles.box}
      />
    );
  }
  return (
    <View testID={`result-icon-${kind}`} style={styles.box}>
      <View style={[StyleSheet.absoluteFill, styles.halo, { backgroundColor: tint }]} />
      <Icon name={kind === 'sent' ? 'check' : 'cloudOff'} size={34} color={tint} />
    </View>
  );
}

const styles = StyleSheet.create({
  box: { width: SIZE, height: SIZE, alignItems: 'center', justifyContent: 'center' },
  halo: { borderRadius: SIZE / 2, opacity: 0.14 },
});
