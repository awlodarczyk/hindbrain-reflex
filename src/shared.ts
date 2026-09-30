/**
 * Vendored wire types + response envelope, hand-copied from the monorepo's
 * `packages/shared/src` (envelope.ts + schemas.ts) WITHOUT the zod dependency,
 * so this SDK installs standalone from a git subdirectory.
 *
 * IMPORTANT: these shapes MUST stay wire-compatible with the ingest edge
 * function (`supabase/functions/ingest`), which validates requests against the
 * zod schemas in `packages/shared`. If a schema changes there, mirror it here.
 */

/** Standard API response envelope (mirror of packages/shared/src/envelope.ts). */
export type ApiResult<T> = {
  success: boolean;
  data: T | null;
  error: string | null;
};

export const ok = <T>(data: T): ApiResult<T> => ({ success: true, data, error: null });

export const fail = (error: string): ApiResult<never> => ({ success: false, data: null, error });

/** Mirror of `submissionTypeSchema` in packages/shared/src/schemas.ts. */
export type SubmissionType = 'bug' | 'idea';

/** Mirror of `submissionStatusSchema` in packages/shared/src/schemas.ts. */
export type SubmissionStatus = 'open' | 'planned' | 'in_progress' | 'done' | 'rejected';

/** Mirror of `deviceMetaSchema` in packages/shared/src/schemas.ts. */
export type DeviceMeta = {
  readonly os: string;
  readonly osVersion: string;
  readonly appVersion: string;
  readonly model: string;
};

/**
 * Mirror of `submitInputSchema` in packages/shared/src/schemas.ts.
 * `body` and `deviceMeta` are REQUIRED by the server-side schema
 * (body: 1-4000 chars, title: 1-120 chars) — keep them required here so
 * invalid submissions fail at compile time instead of at the API boundary.
 */
export type SubmitInput = {
  readonly publicKey: string;
  readonly type: SubmissionType;
  readonly title: string;
  readonly body: string;
  readonly deviceMeta: DeviceMeta;
};

/** Mirror of `ideaListItemSchema` in packages/shared/src/schemas.ts. */
export type IdeaListItem = {
  readonly id: string;
  readonly title: string;
  readonly body: string;
  readonly voteCount: number;
  readonly votedByMe: boolean;
};
