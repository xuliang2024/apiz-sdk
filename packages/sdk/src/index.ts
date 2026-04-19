/**
 * @apiz/sdk — Official TypeScript SDK for apiz.ai
 *
 * Phase 2A: API surface and type definitions are complete; HTTP transport,
 * helpers and waitFor polling throw `ApizError("not implemented")` until
 * Phase 2B lands the real implementation. Tests in Phase 2A are written
 * against the *target* behavior so they fail until Phase 2B.
 */

export const VERSION = "0.0.0";

export { Apiz } from "./client.js";

export {
  ApizError,
  ApizAuthenticationError,
  ApizPermissionDeniedError,
  ApizNotFoundError,
  ApizValidationError,
  ApizInsufficientBalanceError,
  ApizRateLimitError,
  ApizServerError,
  ApizTimeoutError,
  ApizConnectionError,
  errorFromStatus,
  type ApizErrorOptions,
} from "./errors.js";

export type {
  ApizOptions,
  Channel,
  TaskStatus,
  TaskCreateParams,
  TaskCreateResponse,
  TaskQueryResponse,
  WaitForOptions,
  ModelCategory,
  ModelCapability,
  ModelListOptions,
  ModelSearchOptions,
  ModelSummary,
  ModelDetail,
  ModelDocs,
  VoiceItem,
  VoiceListResponse,
  SpeakModel,
  SynthesizeParams,
  SynthesizeResponse,
  VoiceDesignParams,
  VoiceCloneParams,
  VoiceUpdateParams,
  BalanceResponse,
  CheckinResponse,
  PackageItem,
  PaymentResponse,
  SkillSummary,
  SkillDetail,
  ParseVideoResponse,
  TransferUrlType,
  TransferUrlResponse,
  SyncImageParams,
  SyncImageResponse,
  SyncVideoParams,
  SyncVideoResponse,
  SyncModelInfo,
  SyncProviderInfo,
  GenerateOptions,
  GenerateResult,
} from "./types.js";

export type { SpeakHelperOptions } from "./helpers/speak.js";
