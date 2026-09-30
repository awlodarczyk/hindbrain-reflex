export const MAX_BREADCRUMBS = 50;
const MAX_MESSAGE_CHARS = 500;

export type BreadcrumbCategory = "navigation" | "http" | "console" | "ui" | "custom";
export type BreadcrumbLevel = "debug" | "info" | "warning" | "error";

/** Matches the `breadcrumbs[]` item of the event envelope (docs/specs/event-envelope.md). */
export type Breadcrumb = {
  readonly ts: string;
  readonly category: BreadcrumbCategory;
  readonly level?: BreadcrumbLevel;
  readonly message?: string;
  readonly data?: Readonly<Record<string, unknown>>;
};

export type BreadcrumbInput = Omit<Breadcrumb, "ts">;

export interface BreadcrumbBuffer {
  add(crumb: BreadcrumbInput): void;
  /** Oldest first; a copy that later adds do not change. */
  snapshot(): Breadcrumb[];
  /** Categories set to false are not recorded at all (remote config). */
  setEnabled(categories: Partial<Record<BreadcrumbCategory, boolean>>): void;
}

export function createBreadcrumbBuffer(now: () => Date = () => new Date()): BreadcrumbBuffer {
  let items: readonly Breadcrumb[] = [];
  let enabled: Partial<Record<BreadcrumbCategory, boolean>> = {};
  return {
    add(crumb) {
      if (enabled[crumb.category] === false) return;
      const message = crumb.message?.slice(0, MAX_MESSAGE_CHARS);
      const next: Breadcrumb = { ...crumb, ...(message !== undefined && { message }), ts: now().toISOString() };
      items = [...items, next].slice(-MAX_BREADCRUMBS);
    },
    snapshot: () => [...items],
    setEnabled(categories) {
      enabled = { ...enabled, ...categories };
    },
  };
}
