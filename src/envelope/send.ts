import type { Api } from '../api';
import type { Queue } from '../queue';
import type { Breadcrumb } from '../breadcrumbs/buffer';
import { buildEnvelope, type DeviceContext, type ReportInput } from './build';
import { toDeclaration, toFile, uploadAll, type LocalAttachment } from '../attachments';

export type SendResult = { status: 'sent'; id: string } | { status: 'queued'; error: string };

export interface SenderDeps {
  api: Pick<Api, 'submitEnvelope' | 'uploadFile' | 'attachmentDone'>;
  queue: Pick<Queue, 'enqueueEnvelope'>;
  getInstallationId: () => Promise<string>;
  getBreadcrumbs: () => Breadcrumb[];
  getCurrentScreen: () => string | null;
  collectDeviceContext: () => DeviceContext;
}

/**
 * Returns a function that turns a report into an envelope and sends it; on failure the
 * same envelope (same eventId) goes to the offline queue so a retry cannot duplicate it.
 * `openedAt` is when the sheet opened, i.e. the moment the user decided to report.
 * Attachments upload after the report is stored; a failed upload leaves the report sent and
 * queues the files, and the retry reuses the eventId so only missing files upload again.
 */
export function createReportSender(deps: SenderDeps) {
  return async (report: ReportInput, openedAt: Date, attachments: readonly LocalAttachment[] = []): Promise<SendResult> => {
    const envelope = buildEnvelope({
      report,
      context: deps.collectDeviceContext(),
      installationId: await deps.getInstallationId(),
      breadcrumbs: deps.getBreadcrumbs(),
      screen: deps.getCurrentScreen(),
      occurredAt: openedAt,
      attachments: attachments.map(toDeclaration),
    });
    const files = attachments.map(toFile);
    const result = await deps.api.submitEnvelope(envelope);
    if (result.success && result.data) {
      const uploaded = await uploadAll(deps.api, result.data.id, result.data.uploads ?? [], files);
      if (!uploaded) await deps.queue.enqueueEnvelope(envelope, files);
      return { status: 'sent', id: result.data.id };
    }
    await deps.queue.enqueueEnvelope(envelope, files);
    return { status: 'queued', error: result.error ?? 'Submission failed' };
  };
}

export type ReportSender = ReturnType<typeof createReportSender>;
