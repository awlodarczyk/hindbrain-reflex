/** @type {import('jest').Config} */
module.exports = {
  // Deviation from brief: do NOT use 'react-native' preset because its setupFiles
  // load @react-native/js-polyfills (Flow-typed) through pnpm's nested node_modules,
  // where the standard transformIgnorePatterns cannot reach them. Instead we manually
  // replicate the preset's essentials (transform + moduleFileExtensions) and supply
  // only our own setupFiles mock. This is the minimal change needed to get tests green.
  transform: {
    '^.+\\.(ts|tsx)$': [
      'ts-jest',
      {
        tsconfig: {
          jsx: 'react',
          module: 'commonjs',
          moduleResolution: 'node',
          // Tests index fixtures directly; the strict flag guards shipped source only (tsconfig.json).
          noUncheckedIndexedAccess: false,
        },
      },
    ],
  },
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  setupFiles: ['./jest.setup.js'],
  testEnvironment: 'node',
  moduleNameMapper: {
    '^react-native$': '<rootDir>/src/__mocks__/react-native.js',
    '^@gorhom/bottom-sheet$': '<rootDir>/src/__mocks__/@gorhom/bottom-sheet.js',
    '^react-native-reanimated$': '<rootDir>/src/__mocks__/react-native-reanimated.js',
    '^react-native-gesture-handler$': '<rootDir>/src/__mocks__/react-native-gesture-handler.js',
    '^react-native-svg$': '<rootDir>/src/__mocks__/react-native-svg.js',
    '^react-native-safe-area-context$': '<rootDir>/src/__mocks__/react-native-safe-area-context.js',
  },
};
