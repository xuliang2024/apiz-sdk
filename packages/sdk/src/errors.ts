/**
 * Error hierarchy for the apiz SDK. All errors thrown by this library extend
 * {@link ApizError} so callers can catch broadly when desired.
 *
 * Phase 2A surface only — runtime mapping from HTTP responses is implemented
 * in Phase 2B.
 */

export interface ApizErrorOptions {
  status?: number;
  code?: number;
  detail?: unknown;
  cause?: unknown;
  requestId?: string;
}

export class ApizError extends Error {
  readonly status?: number;
  readonly code?: number;
  readonly detail?: unknown;
  readonly requestId?: string;

  constructor(message: string, options: ApizErrorOptions = {}) {
    super(message, options.cause !== undefined ? { cause: options.cause } : undefined);
    this.name = new.target.name;
    if (options.status !== undefined) this.status = options.status;
    if (options.code !== undefined) this.code = options.code;
    if (options.detail !== undefined) this.detail = options.detail;
    if (options.requestId !== undefined) this.requestId = options.requestId;
  }
}

export class ApizAuthenticationError extends ApizError {}
export class ApizPermissionDeniedError extends ApizError {}
export class ApizNotFoundError extends ApizError {}
export class ApizValidationError extends ApizError {}
export class ApizInsufficientBalanceError extends ApizError {}
export class ApizRateLimitError extends ApizError {}
export class ApizServerError extends ApizError {}
export class ApizTimeoutError extends ApizError {}
export class ApizConnectionError extends ApizError {}

/**
 * Pick the right subclass for a given HTTP status. Phase 2B uses this in the
 * HTTP layer to translate raw responses into typed errors.
 */
export function errorFromStatus(
  status: number,
  message: string,
  options: Omit<ApizErrorOptions, "status"> = {},
): ApizError {
  const opts = { ...options, status };
  if (status === 401) return new ApizAuthenticationError(message, opts);
  if (status === 402) return new ApizInsufficientBalanceError(message, opts);
  if (status === 403) return new ApizPermissionDeniedError(message, opts);
  if (status === 404) return new ApizNotFoundError(message, opts);
  if (status === 422 || status === 400) return new ApizValidationError(message, opts);
  if (status === 429) return new ApizRateLimitError(message, opts);
  if (status >= 500) return new ApizServerError(message, opts);
  return new ApizError(message, opts);
}
