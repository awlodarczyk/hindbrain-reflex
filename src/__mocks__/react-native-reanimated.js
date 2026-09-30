const React = require('react');
const { View } = require('react-native');

module.exports = {
  default: {
    View,
    createAnimatedComponent: (c) => c,
    Value: jest.fn(),
    event: jest.fn(),
    add: jest.fn(),
    eq: jest.fn(),
    set: jest.fn(),
    cond: jest.fn(),
    interpolate: jest.fn(),
    Extrapolate: { CLAMP: 'clamp' },
  },
  useSharedValue: jest.fn((val) => ({ value: val })),
  useAnimatedStyle: jest.fn(() => ({})),
  withSpring: jest.fn(),
  withTiming: jest.fn(),
  runOnJS: jest.fn((fn) => fn),
  interpolate: jest.fn(),
  Extrapolation: { CLAMP: 'clamp' },
};
