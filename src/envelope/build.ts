import type { Breadcrumb } from '../breadcrumbs/buffer';
import { uuidV4 } from '../installation';
import type { AttachmentDeclaration } from '../attachments';

/** Pure envelope assembly — no React Native imports, so the ingest contract test can run it in Node. */

export const SDK_NAME = 'hindbrain-reflex';
export const SDK_VERSION = '0.2.1';

export type ReportInput = {
  readonly type: 'bug' | 'idea';
  readonly title?: string;
  readonly body: string;
  readonly trigger: 'shake' | 'api' | 'button';
};

/** Device facts gathered once per report; every field except app.version and os is optional. */
export type DeviceContext = {
  readonly app: { bundleId?: string; name?: string; version: string; build?: string };
  readonly os: { name: string; version: string };
  readonly device?: {
    manufacturer?: string;
    model?: string;
    type?: 'phone' | 'tablet' | 'desktop' | 'tv' | 'unknown';
    isEmulator?: boolean;
    screen?: { width: number; height: number; scale: number; fontScale: number };
    orientation?: 'portrait' | 'landscape';
    colorScheme?: 'light' | 'dark';
  };
  readonly runtime?: { reactNative?: string; hermes?: boolean; newArchitecture?: boolean; expoSdk?: string };
  readonly locale?: { languageTag: string; timeZone: string };
};

/** Wire shape of event envelope v1 (docs/specs/event-envelope.md); validated server-side. */
export type EventEnvelope = {
  readonly envelopeVersion: 1;
  readonly eventId: string;
  readonly occurredAt: string;
  readonly sentAt: string;
  readonly report: ReportInput;
  readonly sdk: { name: string; version: string };
  readonly user: { installationId: string };
  readonly context?: { screen: string };
  readonly breadcrumbs?: readonly Breadcrumb[];
  readonly attachments?: readonly AttachmentDeclaration[];
} & DeviceContext;

export interface BuildInput {
  readonly report: ReportInput;
  readonly context: DeviceContext;
  readonly installationId: string;
  readonly breadcrumbs: readonly Breadcrumb[];
  readonly screen: string | null;
  readonly occurredAt: Date;
  readonly eventId?: string;
  readonly attachments?: readonly AttachmentDeclaration[];
}

/** Drops undefined values and empty strings; returns undefined when nothing is left. */
function compact<T extends object>(obj: T | undefined): T | undefined {
  if (!obj) return undefined;
  const entries = Object.entries(obj).filter(([, v]) => v !== undefined && v !== '');
  return entries.length > 0 ? (Object.fromEntries(entries) as T) : undefined;
}

export function buildEnvelope(input: BuildInput): EventEnvelope {
  const { report, context, installationId, breadcrumbs, screen, occurredAt } = input;
  const at = occurredAt.toISOString();
  const title = report.title?.trim();
  const optional = {
    device: compact(context.device),
    runtime: compact(context.runtime),
    locale: context.locale,
    context: screen ? { screen } : undefined,
    breadcrumbs: breadcrumbs.length > 0 ? breadcrumbs : undefined,
    attachments: input.attachments && input.attachments.length > 0 ? input.attachments : undefined,
  };
  return {
    envelopeVersion: 1,
    eventId: input.eventId ?? uuidV4(),
    occurredAt: at,
    sentAt: at,
    report: { type: report.type, ...(title ? { title } : {}), body: report.body.trim(), trigger: report.trigger },
    sdk: { name: SDK_NAME, version: SDK_VERSION },
    app: compact(context.app) ?? { version: context.app.version },
    os: context.os,
    user: { installationId },
    ...compact(optional),
  } as EventEnvelope;
}
