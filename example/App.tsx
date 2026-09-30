/**
 * Minimal example showing the required host setup for hindbrain-reflex.
 *
 * Required peer deps wired here:
 *   - GestureHandlerRootView   (react-native-gesture-handler) — enables gesture system
 *   - HindbrainProvider        (hindbrain-reflex)       — shake detection + bottom sheet
 *
 * BottomSheetModalProvider is handled internally by HindbrainProvider;
 * you do NOT need to add it yourself.
 */

import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { HindbrainProvider, useHindbrain } from 'hindbrain-reflex';

// ─── Inner screen — must be inside HindbrainProvider to call useHindbrain ────

function HomeScreen(): React.ReactElement {
  const { open } = useHindbrain();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Hindbrain Example</Text>
      <Text style={styles.subtitle}>Shake the device to open the feedback hub,{'\n'}or tap the button below.</Text>

      <TouchableOpacity style={styles.button} onPress={open} accessibilityRole="button">
        <Text style={styles.buttonText}>Send feedback</Text>
      </TouchableOpacity>
    </View>
  );
}

// ─── Root — GestureHandlerRootView must wrap everything ───────────────────────

export default function App(): React.ReactElement {
  return (
    <GestureHandlerRootView style={styles.flex}>
      <HindbrainProvider
        publicKey="hb_pub_your_public_key_here"
        // Optional overrides:
        // endpoint="https://your-self-hosted-api.example.com/functions/v1/ingest"
        // storage={AsyncStorage} // persist the offline queue across restarts
        // shakeThreshold={15}
        // theme={{ light: { primary: '#7C3AED' }, dark: { primary: '#A78BFA' } }}
      >
        <HomeScreen />
      </HindbrainProvider>
    </GestureHandlerRootView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    backgroundColor: '#FFFFFF',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    color: '#475569',
    textAlign: 'center',
    marginBottom: 40,
    lineHeight: 22,
  },
  button: {
    backgroundColor: '#1E40AF',
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 12,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
