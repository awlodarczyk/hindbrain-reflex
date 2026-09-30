import {
  CONFIG_CACHE_KEY,
  parseCachedConfig,
  serialiseConfig,
  mergeThemeOverrides,
  type RemoteConfigDoc,
} from "../remoteConfig";

const DOC: RemoteConfigDoc = {
  revision: 4,
  theme: {
    appearance: "system",
    radius: 12,
    light: { accent: "#0369A1", background: "#FFFFFF" },
    dark: { accent: "#5AC0F0" },
  },
};

describe("parseCachedConfig", () => {
  it("round-trips a document through storage", () => {
    expect(parseCachedConfig(serialiseConfig(DOC))).toEqual(DOC);
  });

  /**
   * The cache is a string somebody else's app owns. Anything unreadable has to
   * degrade to "no cache" and let the SDK defaults through; throwing here would
   * take the host app down on launch.
   */
  it.each([
    ["null", null],
    ["empty", ""],
    ["not json", "{oops"],
    ["json but not an object", "42"],
    ["missing revision", JSON.stringify({ theme: {} })],
    ["revision not a number", JSON.stringify({ revision: "4", theme: {} })],
    ["missing theme", JSON.stringify({ revision: 4 })],
  ])("returns null for %s", (_label, raw) => {
    expect(parseCachedConfig(raw)).toBeNull();
  });
});

describe("mergeThemeOverrides", () => {
  it("returns the local override when there is no remote config", () => {
    const local = { light: { accent: "#111111" } };

    expect(mergeThemeOverrides(undefined, local)).toEqual(local);
  });

  it("returns the remote theme when the app passes no theme prop", () => {
    expect(mergeThemeOverrides(DOC.theme, undefined)).toEqual(DOC.theme);
  });

  /**
   * Precedence is defaults, then remote, then the `theme` prop. A developer
   * debugging on their own machine must be able to override the dashboard
   * without logging in to change it.
   */
  it("lets a local token win over the same remote token", () => {
    const merged = mergeThemeOverrides(DOC.theme, {
      light: { accent: "#FF0000" },
    });

    expect(merged.light?.accent).toBe("#FF0000");
  });

  it("keeps remote tokens the local override does not mention", () => {
    const merged = mergeThemeOverrides(DOC.theme, {
      light: { accent: "#FF0000" },
    });

    expect(merged.light?.background).toBe("#FFFFFF");
    expect(merged.dark?.accent).toBe("#5AC0F0");
  });

  it("merges the modes independently", () => {
    const merged = mergeThemeOverrides(DOC.theme, { dark: { accent: "#00FF00" } });

    expect(merged.light?.accent).toBe("#0369A1");
    expect(merged.dark?.accent).toBe("#00FF00");
  });

  it.each([
    ["radius", { radius: 28 }, "radius", 28],
    ["appearance", { appearance: "dark" as const }, "appearance", "dark"],
  ])("lets a local %s win", (_label, local, key, expected) => {
    expect(mergeThemeOverrides(DOC.theme, local)[key as "radius"]).toBe(expected);
  });

  it("takes remote radius when the app sets none", () => {
    expect(mergeThemeOverrides(DOC.theme, { light: {} }).radius).toBe(12);
  });

  it("never mutates either input", () => {
    const remote = JSON.parse(JSON.stringify(DOC.theme));
    const local = { light: { accent: "#FF0000" } };

    mergeThemeOverrides(remote, local);

    expect(remote).toEqual(DOC.theme);
    expect(local).toEqual({ light: { accent: "#FF0000" } });
  });
});

describe("CONFIG_CACHE_KEY", () => {
  it("is namespaced so it cannot collide with the host app", () => {
    expect(CONFIG_CACHE_KEY).toMatch(/^hindbrain\./);
  });
});
