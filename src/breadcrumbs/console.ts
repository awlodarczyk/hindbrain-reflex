import type { BreadcrumbBuffer } from "./buffer";
import { maskPii } from "./mask";

type ConsoleLike = { warn: (...args: unknown[]) => void; error: (...args: unknown[]) => void };

const format = (args: unknown[]): string =>
  args
    .map((a) => {
      if (typeof a === "string") return a;
      if (a instanceof Error) return `${a.name}: ${a.message}`;
      try {
        return JSON.stringify(a);
      } catch {
        return String(a);
      }
    })
    .join(" ");

/** Records console.warn / console.error as breadcrumbs. Returns a function that restores the originals. */
export function instrumentConsole(buffer: BreadcrumbBuffer, target: ConsoleLike = console): () => void {
  const original = { warn: target.warn, error: target.error };
  target.warn = (...args: unknown[]) => {
    buffer.add({ category: "console", level: "warning", message: maskPii(format(args)) });
    original.warn.apply(target, args);
  };
  target.error = (...args: unknown[]) => {
    buffer.add({ category: "console", level: "error", message: maskPii(format(args)) });
    original.error.apply(target, args);
  };
  return () => {
    target.warn = original.warn;
    target.error = original.error;
  };
}
