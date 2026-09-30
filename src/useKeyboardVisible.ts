import { useEffect, useState } from 'react';
import { Keyboard } from 'react-native';

/** iOS fires the `will` pair before the animation; Android only the `did` pair. */
const SHOW_EVENTS = ['keyboardWillShow', 'keyboardDidShow'] as const;
const HIDE_EVENTS = ['keyboardWillHide', 'keyboardDidHide'] as const;

/**
 * Whether the software keyboard currently covers the bottom of the screen.
 *
 * Used to drop the safe-area bottom inset while the keyboard is up: the keyboard
 * sits over the home indicator, so reserving room for it leaves a visible gap.
 *
 * Both platforms' events are subscribed rather than branching on `Platform.OS`;
 * the state is a boolean, so an extra event for the same transition is a no-op.
 */
export function useKeyboardVisible(): boolean {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const subscriptions = [
      ...SHOW_EVENTS.map((e) => Keyboard.addListener(e, () => setVisible(true))),
      ...HIDE_EVENTS.map((e) => Keyboard.addListener(e, () => setVisible(false))),
    ];

    return () => {
      for (const s of subscriptions) s.remove();
    };
  }, []);

  return visible;
}
