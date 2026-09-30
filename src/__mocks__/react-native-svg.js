const React = require('react');
const { View } = require('react-native');

const mock = (props) => React.createElement(View, null, props && props.children);

module.exports = {
  __esModule: true,
  Svg: mock,
  Path: mock,
  Circle: mock,
  Rect: mock,
  Line: mock,
  Text: mock,
  G: mock,
  default: mock,
};
