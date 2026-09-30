import { createBreadcrumbBuffer, MAX_BREADCRUMBS } from "../breadcrumbs/buffer";
import { maskPii, stripUrl } from "../breadcrumbs/mask";
import { instrumentConsole } from "../breadcrumbs/console";
import { instrumentXhr } from "../breadcrumbs/network";

const clock = () => { let t = Date.UTC(2026, 8, 22, 9, 0, 0); return () => new Date(t++); };

describe("breadcrumb buffer", () => {
  it("keeps the newest 50, oldest first", () => {
    const b = createBreadcrumbBuffer(clock());
    for (let i = 0; i < 60; i++) b.add({ category: "custom", message: `m${i}` });
    const snap = b.snapshot();
    expect(snap).toHaveLength(MAX_BREADCRUMBS);
    expect(snap[0].message).toBe("m10");
    expect(snap[49].message).toBe("m59");
  });

  it("stamps ISO timestamps and truncates messages to 500 chars", () => {
    const b = createBreadcrumbBuffer(clock());
    b.add({ category: "console", message: "x".repeat(600) });
    const [c] = b.snapshot();
    expect(c.ts).toBe("2026-09-22T09:00:00.000Z");
    expect(c.message).toHaveLength(500);
  });

  it("returns a copy that later adds do not change", () => {
    const b = createBreadcrumbBuffer(clock());
    b.add({ category: "ui", message: "a" });
    const snap = b.snapshot();
    b.add({ category: "ui", message: "b" });
    expect(snap).toHaveLength(1);
  });

  it("skips categories that are switched off", () => {
    const b = createBreadcrumbBuffer(clock());
    b.setEnabled({ console: false });
    b.add({ category: "console", message: "hidden" });
    b.add({ category: "http", message: "kept" });
    expect(b.snapshot().map((c) => c.message)).toEqual(["kept"]);
  });
});

describe("masking", () => {
  it("masks bearer tokens, JWTs and emails", () => {
    const jwt = "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxIn0.sig_nature-123";
    expect(maskPii(`Authorization: Bearer abc.def-123 for kinga@example.com token ${jwt}`))
      .toBe("Authorization: Bearer [masked] for [masked] token [masked]");
  });

  it("strips query strings and fragments from URLs", () => {
    expect(stripUrl("https://api.x.io/plans/42?token=abc#frag")).toBe("https://api.x.io/plans/42");
    expect(stripUrl("/relative/path?q=1")).toBe("/relative/path");
  });
});

describe("console instrumentation", () => {
  it("records warn and error with masking, keeps calling the original", () => {
    const b = createBreadcrumbBuffer(clock());
    const calls: unknown[][] = [];
    const target = { warn: (...a: unknown[]) => calls.push(a), error: (...a: unknown[]) => calls.push(a), log: () => {} };
    const restore = instrumentConsole(b, target);
    target.error("Save failed for", "kinga@example.com", { status: 500 });
    target.warn("slow");
    restore();
    target.error("after restore");
    expect(calls).toHaveLength(3);
    expect(b.snapshot().map((c) => [c.level, c.message])).toEqual([
      ["error", 'Save failed for [masked] {"status":500}'],
      ["warning", "slow"],
    ]);
  });
});

class FakeXhr {
  status = 0;
  private listeners: Record<string, Array<() => void>> = {};
  open(_method: string, _url: string) {}
  send() {}
  addEventListener(ev: string, fn: () => void) { (this.listeners[ev] ??= []).push(fn); }
  finish(status: number) { this.status = status; for (const fn of this.listeners.loadend ?? []) fn(); }
}

describe("network instrumentation", () => {
  it("records method, stripped URL, status and duration; errors at >= 400", () => {
    const b = createBreadcrumbBuffer(clock());
    const target = { XMLHttpRequest: FakeXhr as unknown as typeof XMLHttpRequest };
    let now = 1000;
    const restore = instrumentXhr(b, { target, now: () => now, ignore: ["https://reporter-api.hindbrain.io"] });
    const ok = new target.XMLHttpRequest() as unknown as FakeXhr;
    ok.open("GET", "https://api.x.io/plans?id=1"); ok.send(); now = 1120; ok.finish(200);
    const bad = new target.XMLHttpRequest() as unknown as FakeXhr;
    bad.open("PATCH", "https://api.x.io/plans/42"); bad.send(); now = 1300; bad.finish(500);
    const own = new target.XMLHttpRequest() as unknown as FakeXhr;
    own.open("POST", "https://reporter-api.hindbrain.io/functions/v1/ingest"); own.send(); own.finish(200);
    restore();
    expect(b.snapshot().map((c) => [c.level, c.data])).toEqual([
      ["info", { method: "GET", url: "https://api.x.io/plans", status: 200, durationMs: 120 }],
      ["error", { method: "PATCH", url: "https://api.x.io/plans/42", status: 500, durationMs: 180 }],
    ]);
    expect(target.XMLHttpRequest).toBe(FakeXhr);
  });
});
