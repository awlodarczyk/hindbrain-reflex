# hindbrain-reflex

The React Native SDK for Hindbrain Reflex, [reflex.hindbrain.io](https://reflex.hindbrain.io). Shake the device, or call `useHindbrain().open()`, and a sheet slides up with three ways in: report a bug, suggest an idea, or vote on what other people already asked for. Nobody has to sign in.

Free to use. Found a bug in the SDK itself? [Open an issue](https://github.com/awlodarczyk/hindbrain-reflex/issues).

> This repository is the SDK and nothing else, under MIT. The dashboard, API,
> database and deployment are private and none of that history is here.

---

## Requirements

- React Native >= 0.73
- React >= 18
- Expo SDK (for `expo-sensors` / `expo-application`)

---

## Installation

```sh
pnpm add github:awlodarczyk/hindbrain-reflex
```

Not on npm yet. When it lands, the same package installs as
`pnpm add hindbrain-reflex` and nothing else changes.

> **Ships as TypeScript source.** `main` and `types` both point at
> `src/index.ts`; there is no build step and no `dist`. Metro transpiles
> TypeScript itself, so this works in any Expo or TypeScript React Native app.
> A plain-JavaScript app whose Metro cannot read TypeScript will not work.

That one command is the whole install. The native modules the sheet needs come
with it and nothing else has to be added by hand:

| Package | What it does here |
|---|---|
| `@gorhom/bottom-sheet` (5.x) | The sheet itself. v5 sizes to its content and handles the keyboard. |
| `react-native-reanimated`, `react-native-gesture-handler` | Drag, spring and dismiss. |
| `react-native-safe-area-context` | Keeps the sheet below the status bar. |
| `react-native-svg` | Icons and the annotation tools. |
| `expo-sensors`, `expo-application` | Shake detection; app version on the report. |
| `react-native-view-shot` | Screenshot of the screen the tester was looking at. |
| `expo-image-picker` | "Add photo or video" from the library (up to 5 photos + 1 video). |
| `expo-device` | Device model, emulator flag, tablet detection. |
| `lottie-react-native` | Animated "sent" / "saved offline" states. |

Only `react` and `react-native` are peer dependencies, because those must be
your app's copies and never a second one.

> **On Expo, run `npx expo install --fix` afterwards.** Installing pulls these
> in at their newest versions, which is not necessarily the version your Expo
> SDK ships. `--fix` repins them; `npx expo-doctor` tells you if anything is
> still out of line.

The sheet needs a `SafeAreaProvider` above it (Expo Router gives you one).
Without it the sheet assumes zero insets and sits under the status bar.

The last four are loaded through a `try`/`catch`, so removing any of them
degrades one feature instead of breaking the build: static icons instead of the
animation, a report with no screenshot, no library picker, coarser device facts.

Attachments upload after the report is stored, straight to storage through signed URLs;
if an upload fails, the report is already saved and the files retry from the offline queue
(pass `storage` so the queue survives restarts).

### Babel plugin (required for Reanimated)

Add the Reanimated Babel plugin to `babel.config.js`. It has to be listed **last**:

```js
module.exports = {
  presets: ['babel-preset-expo'],
  plugins: [
    // ... other plugins
    'react-native-reanimated/plugin', // must be last
  ],
};
```

---

## Required host setup

`@gorhom/bottom-sheet` requires two wrappers at the root of your app:

1. **`GestureHandlerRootView`** from `react-native-gesture-handler`, which turns on the gesture system.
2. **`BottomSheetModalProvider`** from `@gorhom/bottom-sheet`. `HindbrainProvider` renders this one for you, so do not add a second.

Wrap your entire app with `GestureHandlerRootView` with `style={{ flex: 1 }}`:

```tsx
import { GestureHandlerRootView } from 'react-native-gesture-handler';

export default function RootLayout({ children }) {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      {children}
    </GestureHandlerRootView>
  );
}
```

---

## Minimal usage

```tsx
import { HindbrainProvider } from 'hindbrain-reflex';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <HindbrainProvider publicKey="hb_pub_your_public_key_here">
        {/* rest of your app */}
      </HindbrainProvider>
    </GestureHandlerRootView>
  );
}
```

Shake the device to open the feedback hub. No end-user login is required.

---

## Where to get a public key

1. Sign in at [reflex.hindbrain.io](https://reflex.hindbrain.io/login).
2. Create a new app (or open an existing one).
3. Copy the **Public Key** shown on the app settings page.

The public key is safe to ship in your bundle. It can create submissions and nothing else, so it cannot read anybody's reports.

---

## Props

| Prop | Type | Required | Description |
|---|---|---|---|
| `publicKey` | `string` | Yes | Dashboard-generated key for your app. |
| `endpoint` | `string` | No | Override the API endpoint. Default: `https://reporter-api.hindbrain.io/functions/v1/ingest`. |
| `theme` | `HindbrainThemeOverride` | No | Colour overrides, merged over `defaultTheme`. |
| `shakeThreshold` | `number` | No | Accelerometer magnitude that counts as a shake. |
| `shakeEnabled` | `boolean` | No | Whether shaking opens the sheet at all. Default `true`. See below. |
| `locale` | `string` | No | BCP 47 tag for the sheet copy (`en`, `pl` built in). Default: device locale. |
| `strings` | `Partial<HindbrainStrings>` | No | Replace any built-in text, e.g. `{ hubTitle: 'Feedback' }`. |
| `storage` | `Storage` | No | Where the offline queue and the installation ID live, e.g. AsyncStorage. Without it both sit in memory: queued reports die on restart, and every launch votes as a new installation. |

---

## Offline queue persistence

Failed submissions (e.g. no network) are queued and retried on the next app
launch. By default the queue lives in memory only. To persist it across
restarts, pass any object with `getItem` and `setItem`. `AsyncStorage` already
matches:

```sh
pnpm add @react-native-async-storage/async-storage
```

```tsx
import AsyncStorage from '@react-native-async-storage/async-storage';
import { HindbrainProvider } from 'hindbrain-reflex';

<HindbrainProvider publicKey="hb_pub_..." storage={AsyncStorage}>
  {/* ... */}
</HindbrainProvider>
```

```ts
// The expected interface (exported as `Storage`):
interface Storage {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
}
```

---

## Theme customisation

Ten colour tokens per mode: `accent`, `onAccent`, `background`, `surface`,
`text`, `textMuted`, `border`, `danger`, `success` and `backdrop`. They are
merged over `defaultTheme` for whichever scheme the phone is in, so pass only
what you want to change:

```tsx
<HindbrainProvider
  publicKey="hb_pub_your_public_key_here"
  theme={{
    light: { accent: '#7C3AED' },
    dark: { accent: '#A78BFA' },
    radius: 12,
    appearance: 'system', // or 'light' / 'dark' to pin the sheet
  }}
>
```

v0.1 keys still work: `primary` → `accent`, `muted` → `textMuted`.

### Colours from the dashboard

The app's Settings → Appearance page sets the same ten tokens. The provider
fetches them once on mount and caches them through `storage`, so:

- the colours apply on the **next** time the sheet opens, never while somebody
  is part-way through writing a report;
- a launch with no network uses the cached palette, and a first launch with no
  cache uses the SDK defaults below;
- the `theme` prop wins over the dashboard, per token. Set one colour locally
  and the other nine still come from the dashboard. This is so you can override
  it while developing without signing in to change it.

Without `storage` the palette is fetched on every launch and forgotten on exit,
which works but means the sheet shows the defaults for the first moment of each
run.

> **One request per launch.** The provider POSTs `get_config` when it mounts.
> It sends the revision it has cached, so an unchanged config answers with a few
> bytes rather than the whole theme. A failed request is swallowed: the sheet
> keeps the colours it already has and your app sees no error.

### Default theme

```ts
import { defaultTheme } from 'hindbrain-reflex';
// defaultTheme.light.accent === '#4F46E5'
// defaultTheme.dark.accent  === '#818CF8'
// defaultTheme.radius       === 16
```

---

## Manual trigger

Call `useHindbrain().open()` anywhere inside the provider to open the sheet without a shake. This is how you wire up a "Send feedback" button:

```tsx
import { useHindbrain } from 'hindbrain-reflex';
import { Button } from 'react-native';

function FeedbackButton() {
  const { open } = useHindbrain();
  return <Button title="Send feedback" onPress={open} />;
}
```

`useHindbrain()` throws if called outside a `<HindbrainProvider>`.

### Turning the shake off

Shake is motion actuation. WCAG 2.5.4 asks for two things: another way to reach
the same function, and a way to stop the app responding to motion. `open()`
covers the first. `shakeEnabled={false}` covers the second:

```tsx
<HindbrainProvider publicKey="hb_pub_..." shakeEnabled={settings.motionShortcuts}>
```

With it false the accelerometer is never subscribed to, so the sheet opens only
from your own button. Lowering `shakeThreshold` is not a substitute: a listener
that is still attached still fires for someone whose hands shake.

## Breadcrumbs (steps before a report)

While mounted, the provider records the last 50 events so a report shows what the user did:

- `console.warn` and `console.error`. Emails, JWTs and bearer tokens are masked on the device, before anything is sent.
- HTTP requests through XHR, which covers `fetch` and axios. Method, URL without the query string, status and duration. Never bodies, never headers. Hindbrain's own endpoint is skipped.
- screens you report with `trackScreen`, and anything you add with `addBreadcrumb`.

Expo Router:

```tsx
import { usePathname } from 'expo-router';
import { useEffect } from 'react';
import { useHindbrain } from 'hindbrain-reflex';

export function TrackScreens() {
  const pathname = usePathname();
  const { trackScreen } = useHindbrain();
  useEffect(() => trackScreen(pathname), [pathname, trackScreen]);
  return null;
}
```

---

## API reference

### `HindbrainProvider`

Root component. It renders `BottomSheetModalProvider` itself, so do not add another one.

### `useHindbrain()`

| Return | Type | Description |
|---|---|---|
| `open` | `() => void` | Opens the feedback hub. |
| `close` | `() => void` | Closes the feedback hub. |
| `theme` | `HindbrainThemeColors` | Resolved color tokens for the current color scheme. |
| `trackScreen` | `(name: string) => void` | Records a navigation step; repeated names are ignored. |
| `addBreadcrumb` | `(crumb: BreadcrumbInput) => void` | Records a custom step (`category`: `ui` / `custom` / …). |
| `getBreadcrumbs` | `() => Breadcrumb[]` | Current buffer, oldest first. |
| `getCurrentScreen` | `() => string \| null` | Last name passed to `trackScreen`. |

### Types

```ts
import type {
  HindbrainConfig,
  HindbrainTheme,
  HindbrainThemeOverride,
  HindbrainThemeColors,
  HindbrainContextValue,
} from 'hindbrain-reflex';
```

---

## Working on the SDK

```sh
pnpm install
pnpm test
pnpm lint
```

`example/App.tsx` is the smallest host setup that works.

---

## License

MIT. See [LICENSE](LICENSE).

---

Hindbrain Reflex is free and has no paid plan. If it saved you a round of
"works on my machine", you can [buy me a coffee](https://buycoffee.to/hindbrain).
