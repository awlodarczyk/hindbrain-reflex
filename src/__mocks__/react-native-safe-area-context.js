const React = require('react');

const insets = { top: 47, bottom: 34, left: 0, right: 0 };
const SafeAreaInsetsContext = React.createContext(insets);

module.exports = {
  SafeAreaInsetsContext,
  useSafeAreaInsets: () => insets,
  SafeAreaProvider: ({ children }) => children,
};
