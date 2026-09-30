/**
 * Minimal react-native mock for Jest (node testEnvironment).
 * Avoids the Flow-typed ESM import issue in react-native/index.js.
 * Components use string host-type names so @testing-library/react-native
 * can detect them correctly via react-test-renderer's fiber type checks.
 */
const React = require('react');

// Create host component mock: renders as a string type in react-test-renderer
// This satisfies @testing-library/react-native's detectHostComponentNames check
// which does: typeof node.type === 'string'
function createHostComponent(hostName) {
  // Using forwardRef gives us a real component; the render returns a string-host element
  const Component = React.forwardRef(function MockHostComponent(props, ref) {
    // We can't actually render string hosts in node env without react-native renderer
    // Instead, we make the component itself have displayName for identification
    return React.createElement(hostName, { ...props, ref });
  });
  Component.displayName = hostName;
  return Component;
}

const View = createHostComponent('View');
const Text = createHostComponent('Text');
const TextInput = createHostComponent('TextInput');
const Image = createHostComponent('Image');
Image.getSize = (_uri, ok) => ok(1179, 2556);
const Switch = createHostComponent('Switch');
const ScrollView = createHostComponent('ScrollView');
const Modal = createHostComponent('Modal');
const TouchableOpacity = createHostComponent('TouchableOpacity');
// Resolves Pressable's function style/children like the real component, and drops
// onPress while disabled so tests cannot press a disabled button.
const Pressable = React.forwardRef(function Pressable({ style, children, disabled, onPress, ...rest }, ref) {
  const state = { pressed: false };
  return React.createElement('Pressable', {
    ...rest,
    ref,
    disabled,
    onPress: disabled ? undefined : onPress,
    style: typeof style === 'function' ? style(state) : style,
  }, typeof children === 'function' ? children(state) : children);
});
const TouchableHighlight = createHostComponent('TouchableHighlight');
const ActivityIndicator = createHostComponent('ActivityIndicator');

function FlatList({ data, renderItem, keyExtractor, ListEmptyComponent, testID, ...rest }) {
  const children = !data || data.length === 0
    ? (ListEmptyComponent
        ? (typeof ListEmptyComponent === 'function'
            ? React.createElement(ListEmptyComponent, null)
            : ListEmptyComponent)
        : null)
    : data.map((item, index) =>
        React.createElement(
          View,
          { key: keyExtractor ? keyExtractor(item, index) : String(index) },
          renderItem({ item, index }),
        )
      );
  return React.createElement(View, { testID, ...rest }, children);
}

const StyleSheet = {
  create: (styles) => styles,
  flatten: (style) => (Array.isArray(style) ? Object.assign({}, ...style) : style),
  hairlineWidth: 1,
  absoluteFill: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 },
  absoluteFillObject: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 },
};

const Platform = {
  OS: 'ios',
  Version: 14,
  constants: { Model: 'iPhone', model: 'iPhone' },
  select: (obj) => (obj.ios !== undefined ? obj.ios : obj.default),
};

const Dimensions = {
  get: () => ({ width: 375, height: 812, scale: 2, fontScale: 1 }),
  addEventListener: () => ({ remove: () => {} }),
};

const PixelRatio = {
  get: () => 2,
};

const AccessibilityInfo = { isReduceMotionEnabled: jest.fn(async () => false) };

// Maps the responder props RNTL can fire (responderGrant/Move/Release) onto the
// PanResponder callbacks, with a gestureState built from the event's locationX/Y.
const PanResponder = {
  create(config) {
    let start = null;
    const state = (e) => {
      const { locationX = 0, locationY = 0 } = (e && e.nativeEvent) || {};
      if (!start) start = { x: locationX, y: locationY };
      return { dx: locationX - start.x, dy: locationY - start.y, x0: start.x, y0: start.y };
    };
    return {
      panHandlers: {
        onStartShouldSetResponder: () => true,
        onMoveShouldSetResponder: () => true,
        onResponderGrant: (e) => { start = null; config.onPanResponderGrant && config.onPanResponderGrant(e, state(e)); },
        onResponderMove: (e) => config.onPanResponderMove && config.onPanResponderMove(e, state(e)),
        onResponderRelease: (e) => { config.onPanResponderRelease && config.onPanResponderRelease(e, state(e)); start = null; },
      },
    };
  },
};

const Appearance = { getColorScheme: jest.fn(() => 'light') };

const Alert = { alert: jest.fn() };

// Keyboard: a tiny event bus, plus `emit`/`reset`/`listenerCount` for tests. The
// real module has no way to simulate a keyboard, and a leaked listener between
// tests is exactly the bug the unmount test is there to catch.
const keyboardListeners = new Map();
const Keyboard = {
  addListener: (event, handler) => {
    const forEvent = keyboardListeners.get(event) ?? new Set();
    forEvent.add(handler);
    keyboardListeners.set(event, forEvent);
    return { remove: () => forEvent.delete(handler) };
  },
  emit: (event) => {
    for (const handler of keyboardListeners.get(event) ?? []) handler({});
  },
  listenerCount: () =>
    [...keyboardListeners.values()].reduce((n, s) => n + s.size, 0),
  reset: () => keyboardListeners.clear(),
  dismiss: jest.fn(),
};

const Animated = {
  View,
  Text,
  Value: jest.fn(() => ({ setValue: jest.fn(), interpolate: jest.fn(() => ({})) })),
  timing: jest.fn(() => ({ start: jest.fn() })),
  spring: jest.fn(() => ({ start: jest.fn() })),
  createAnimatedComponent: (c) => c,
};

module.exports = {
  View,
  Text,
  TextInput,
  Image,
  Switch,
  Modal,
  ScrollView,
  FlatList,
  TouchableOpacity,
  Pressable,
  TouchableHighlight,
  ActivityIndicator,
  StyleSheet,
  Platform,
  Keyboard,
  Dimensions,
  PixelRatio,
  Appearance,
  PanResponder,
  AccessibilityInfo,
  Alert,
  Animated,
  useColorScheme: jest.fn(() => null),
  useWindowDimensions: jest.fn(() => ({ width: 375, height: 812 })),
};
