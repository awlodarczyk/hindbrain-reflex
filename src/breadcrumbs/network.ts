import type { BreadcrumbBuffer } from "./buffer";
import { stripUrl } from "./mask";

type XhrHost = { XMLHttpRequest: typeof XMLHttpRequest };

export interface NetworkOptions {
  target?: XhrHost;
  now?: () => number;
  /** URL prefixes never recorded, e.g. the Hindbrain ingest endpoint. */
  ignore?: readonly string[];
}

/**
 * Records XHR requests (React Native's fetch and axios both go through XHR) as `http`
 * breadcrumbs: method, URL without query, status, duration — never bodies or headers.
 * Returns a function that restores the original constructor.
 */
export function instrumentXhr(buffer: BreadcrumbBuffer, options: NetworkOptions = {}): () => void {
  const target = options.target ?? (globalThis as unknown as XhrHost);
  const now = options.now ?? Date.now;
  const ignore = options.ignore ?? [];
  const Original = target.XMLHttpRequest;
  if (!Original) return () => undefined;

  class InstrumentedXhr extends Original {
    private hbMethod = "GET";
    private hbUrl = "";

    override open(method: string, url: string | URL, ...rest: unknown[]): void {
      this.hbMethod = method.toUpperCase();
      this.hbUrl = String(url);
      // @ts-expect-error — forwards the optional async/user/password arguments unchanged
      super.open(method, url, ...rest);
    }

    override send(body?: Document | XMLHttpRequestBodyInit | null): void {
      const url = this.hbUrl;
      if (!ignore.some((prefix) => url.startsWith(prefix))) {
        const started = now();
        this.addEventListener("loadend", () => {
          const status = this.status;
          buffer.add({
            category: "http",
            level: status === 0 || status >= 400 ? "error" : "info",
            data: { method: this.hbMethod, url: stripUrl(url), status, durationMs: now() - started },
          });
        });
      }
      super.send(body);
    }
  }

  target.XMLHttpRequest = InstrumentedXhr as typeof XMLHttpRequest;
  return () => {
    target.XMLHttpRequest = Original;
  };
}
