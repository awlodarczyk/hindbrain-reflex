import { collectDeviceContext } from "../envelope/device";

test("collects app, os, device, runtime and locale from React Native and expo-application", () => {
  const c = collectDeviceContext();
  expect(c.app).toEqual({ bundleId: "com.test.app", version: "1.0.0", build: "1" });
  expect(c.os).toEqual({ name: "iOS", version: "14" });
  expect(c.device).toMatchObject({ model: "iPhone", type: "phone", orientation: "portrait", colorScheme: "light", screen: { width: 375, height: 812, scale: 2, fontScale: 1 } });
  expect(c.runtime).toMatchObject({ hermes: false, newArchitecture: false });
  expect(c.locale?.timeZone).toBeTruthy();
  expect(c.locale?.languageTag).toBeTruthy();
});

describe("with expo-device installed", () => {
  const device = { modelName: "iPhone 15 Pro", manufacturer: "Apple", isDevice: false, deviceType: 2, DeviceType: { PHONE: 1, TABLET: 2, DESKTOP: 3, TV: 4 } };
  beforeEach(() => {
    jest.resetModules();
    jest.doMock("../optional", () => ({ loadExpoDevice: () => device, loadLottie: () => null }));
  });
  afterEach(() => jest.dontMock("../optional"));

  test("uses its model, manufacturer, emulator flag and device type", () => {
    const { collectDeviceContext: collect } = require("../envelope/device");
    expect(collect().device).toMatchObject({ model: "iPhone 15 Pro", manufacturer: "Apple", isEmulator: true, type: "tablet" });
  });
});
