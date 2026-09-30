const React = require('react');
const { View, TouchableOpacity, ScrollView } = require('react-native');

module.exports = {
  GestureHandlerRootView: View,
  PanGestureHandler: View,
  TapGestureHandler: View,
  State: {},
  gestureHandlerRootHOC: (c) => c,
  default: {},
};
