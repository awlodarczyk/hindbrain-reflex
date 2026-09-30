/**
 * Faithful imperative mock of @gorhom/bottom-sheet's BottomSheetModal (v4/v5).
 *
 * Mirrors the real library's contract:
 * - Content renders ONLY after ref.present() is called. The `index` prop alone
 *   NEVER opens a BottomSheetModal (that is the real behavior this mock guards).
 * - ref.dismiss() hides the content and fires the `onDismiss` callback,
 *   exactly like the real modal does when dismissed imperatively or by pan-down.
 */
const React = require('react');
const { View, ScrollView, TextInput } = require('react-native');

const BottomSheetModal = React.forwardRef(function BottomSheetModal(props, ref) {
  const { children, onDismiss, footerComponent, handleComponent } = props;
  const [presented, setPresented] = React.useState(false);

  const onDismissRef = React.useRef(onDismiss);
  onDismissRef.current = onDismiss;

  React.useImperativeHandle(
    ref,
    () => ({
      present: () => setPresented(true),
      dismiss: () => {
        setPresented(false);
        if (typeof onDismissRef.current === 'function') {
          onDismissRef.current();
        }
      },
    }),
    [],
  );

  if (!presented) return null;

  const content = typeof children === 'function' ? children({}) : children;
  const footer = typeof footerComponent === 'function' ? React.createElement(footerComponent, { animatedFooterPosition: {} }) : null;
  const handle = typeof handleComponent === 'function' ? React.createElement(handleComponent, {}) : null;
  return React.createElement(View, { testID: 'bottom-sheet-modal' }, handle, content, footer);
});

function BottomSheetModalProvider({ children }) {
  return React.createElement(View, null, children);
}

const passThrough = (Component) =>
  React.forwardRef(function Mock({ children, ...rest }, ref) {
    return React.createElement(Component, { ...rest, ref }, children);
  });

const BottomSheetView = passThrough(View);
const BottomSheetScrollView = passThrough(ScrollView);
const BottomSheetTextInput = React.forwardRef(function Input(props, ref) {
  return React.createElement(TextInput, { ...props, ref });
});
function BottomSheetFooter({ children }) {
  return React.createElement(View, { testID: 'bottom-sheet-footer' }, children);
}
function BottomSheetBackdrop() {
  return null;
}

module.exports = {
  BottomSheetModal,
  BottomSheetModalProvider,
  BottomSheetView,
  BottomSheetScrollView,
  BottomSheetTextInput,
  BottomSheetFooter,
  BottomSheetBackdrop,
};
