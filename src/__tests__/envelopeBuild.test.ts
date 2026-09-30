import { buildEnvelope, SDK_NAME, SDK_VERSION } from "../envelope/build";
// eslint-disable-next-line @typescript-eslint/no-require-imports
const pkg = require("../../package.json") as { version: string };

const context = {
  app: { bundleId: "io.hindbrain.trenovo", name: "Trenovo Fit", version: "1.4.0", build: "142" },
  os: { name: "iOS", version: "18.6" },
  device: { model: "iPhone 15 Pro", type: "phone" as const, isEmulator: false, screen: { width: 393, height: 852, scale: 3, fontScale: 1 }, orientation: "portrait" as const, colorScheme: "dark" as const },
  runtime: { reactNative: "0.81.4", hermes: true },
  locale: { languageTag: "pl-PL", timeZone: "Europe/Warsaw" },
};
const base = {
  report: { type: "bug" as const, title: "  Save does nothing ", body: " Tapped save twice ", trigger: "shake" as const },
  context,
  installationId: "3f1d2c4e-0000-4000-8000-000000000a92",
  breadcrumbs: [{ ts: "2026-09-22T09:13:51.004Z", category: "navigation" as const, message: "/clients" }],
  screen: "/clients/[id]/plan",
  occurredAt: new Date("2026-09-22T09:14:03.120Z"),
};

test("SDK_VERSION matches package.json", () => {
  expect(SDK_VERSION).toBe(pkg.version);
});

test("builds a v1 envelope with trimmed report text and all context", () => {
  const e = buildEnvelope(base);
  expect(e.envelopeVersion).toBe(1);
  expect(e.eventId).toMatch(/^[0-9a-f-]{36}$/);
  expect(e.occurredAt).toBe("2026-09-22T09:14:03.120Z");
  expect(e.sentAt).toBe(e.occurredAt);
  expect(e.report).toEqual({ type: "bug", title: "Save does nothing", body: "Tapped save twice", trigger: "shake" });
  expect(e.sdk).toEqual({ name: SDK_NAME, version: SDK_VERSION });
  expect(e.app.version).toBe("1.4.0");
  expect(e.user).toEqual({ installationId: base.installationId });
  expect(e.context).toEqual({ screen: "/clients/[id]/plan" });
  expect(e.breadcrumbs).toEqual(base.breadcrumbs);
});

test("omits empty optional values instead of sending empty strings", () => {
  const e = buildEnvelope({
    ...base,
    report: { type: "bug", title: "   ", body: "b", trigger: "api" },
    context: { app: { version: "1.0", build: "", name: undefined }, os: { name: "Android", version: "15" } },
    screen: null,
    breadcrumbs: [],
  });
  expect(e.report).toEqual({ type: "bug", body: "b", trigger: "api" });
  expect(e.app).toEqual({ version: "1.0" });
  expect("context" in e).toBe(false);
  expect("breadcrumbs" in e).toBe(false);
  expect("device" in e).toBe(false);
});

test("each envelope gets a fresh eventId unless one is given", () => {
  expect(buildEnvelope(base).eventId).not.toBe(buildEnvelope(base).eventId);
  expect(buildEnvelope({ ...base, eventId: "7c9e6679-7425-40de-944b-e07fc1f90ae7" }).eventId).toBe("7c9e6679-7425-40de-944b-e07fc1f90ae7");
});
