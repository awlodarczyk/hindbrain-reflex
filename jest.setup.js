// Mock native modules not available in Jest environment
jest.mock('expo-sensors', () => ({
  Accelerometer: {
    addListener: jest.fn(() => ({ remove: jest.fn() })),
    setUpdateInterval: jest.fn(),
  },
}));

jest.mock('expo-application', () => ({
  applicationId: 'com.test.app',
  nativeApplicationVersion: '1.0.0',
  nativeBuildVersion: '1',
}));

// @gorhom/bottom-sheet and react-native-svg are handled via moduleNameMapper
// in jest.config.js (pointing to src/__mocks__/). No duplicate jest.mock() needed.
