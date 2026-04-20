/**
 * Public type definitions for the apiz SDK. Mirrors the v3 backend surface.
 */

export type Channel = "api" | "mcp" | "sync" | null;

export type TaskStatus = "pending" | "processing" | "completed" | "failed";

export interface ApizOptions {
  /** API key (sk-...). Falls back to env `APIZ_API_KEY` / `XSKILL_API_KEY`. */
  apiKey?: string;
  /** Base URL of the apiz backend (defaults to `https://api.apiz.ai`). */
  baseURL?: string;
  /** Per-request timeout in milliseconds (defaults to 60000). */
  timeout?: number;
  /** Max retry attempts for retriable failures (defaults to 2). */
  maxRetries?: number;
  /** Override the global fetch implementation (mainly for tests). */
  fetch?: typeof fetch;
  /** Extra headers attached to every request. */
  defaultHeaders?: Record<string, string>;
}

// ---------- Tasks ----------

export interface TaskCreateParams {
  model: string;
  params: Record<string, unknown>;
  channel?: Channel;
  callback_url?: string;
}

export interface TaskCreateResponse {
  task_id: string;
  status: TaskStatus;
  channel?: string;
  model?: string;
  price?: number;
  created_at?: string;
  completed_at?: string;
  result?: unknown;
}

export interface TaskQueryResponse {
  task_id: string;
  status: TaskStatus;
  channel?: string;
  model?: string;
  progress?: number;
  result?: unknown;
  error?: string;
  completed_at?: string;
}

export interface WaitForOptions {
  /** Poll interval in milliseconds. Defaults to 5000. */
  pollInterval?: number;
  /** Total timeout in milliseconds. Defaults to 600000 (10 minutes). */
  timeout?: number;
  /** Invoked on every poll with the latest status. */
  onProgress?: (status: TaskQueryResponse) => void;
  /** Abort signal for cancellation. */
  signal?: AbortSignal;
}

// ---------- Models ----------

export type ModelCategory = "image" | "video" | "audio" | "all";
export type ModelCapability =
  | "t2i"
  | "i2i"
  | "t2v"
  | "i2v"
  | "v2v"
  | "t2a"
  | "stt"
  | "i2t"
  | "v2t";

export interface ModelListOptions {
  category?: ModelCategory;
  task_type?: string;
}

export interface ModelSearchOptions extends ModelListOptions {
  query?: string;
  capability?: ModelCapability;
}

export interface ModelSummary {
  id: string;
  name: string;
  category: string;
  capability?: string;
  cover_url?: string;
  tags?: string[];
  isHot?: boolean;
  stats?: Record<string, number>;
  pricing?: { unit: string; amount: number };
}

export interface ModelDetail extends ModelSummary {
  description?: string;
  params_schema?: Record<string, unknown>;
  channel?: string;
}

export interface ModelDocs {
  id: string;
  name: string;
  lang: string;
  tutorial: string;
  examples?: Array<{ title: string; params: Record<string, unknown> }>;
}

// ---------- Voices / Speak ----------

export interface VoiceItem {
  voice_id: string;
  voice_name: string;
  tags?: string[];
  audio_url?: string;
  voice_type?: string;
  description?: string;
  created_at?: string;
  expires_at?: string;
}

export interface VoiceListResponse {
  user_voices: VoiceItem[];
  public_voices: VoiceItem[];
  statistics: {
    user_total_count: number;
    user_active_count: number;
    user_expired_count: number;
    public_voices_count: number;
  };
}

export type SpeakModel = "speech-2.8-hd" | "speech-2.8-turbo" | "speech-2.6-hd" | "speech-2.6-turbo";

export interface SynthesizeParams {
  text: string;
  voice_id: string;
  model?: SpeakModel;
  speed?: number;
}

export interface SynthesizeResponse {
  task_id?: string;
  status?: TaskStatus;
  audio_url: string;
  duration?: number;
  model?: string;
  price?: number;
}

export interface VoiceDesignParams {
  prompt: string;
  voice_name?: string;
}

export interface VoiceCloneParams {
  audio_url?: string;
  file_id?: number;
  voice_name?: string;
}

export interface VoiceUpdateParams {
  voice_name?: string;
  description?: string;
}

// ---------- Account ----------

export interface BalanceResponse {
  user_id: number;
  balance: number;
  balance_yuan: number;
  vip_level: number;
  unit?: string;
  exchange_rate?: string;
}

export interface CheckinResponse {
  success: boolean;
  already_checked_in?: boolean;
  points_awarded?: number;
  vip_level?: number;
  balance?: number;
  balance_yuan?: number;
  message?: string;
}

export interface PackageItem {
  id: number;
  name: string;
  price_cents: number;
  points: number;
  bonus_points?: number;
  description?: string;
}

export interface PaymentResponse {
  package_id: number;
  amount_cents: number;
  payment_url: string;
  order_id: string;
  expires_at?: string;
}

// ---------- Skills (guide) ----------

export interface SkillSummary {
  id: string;
  name: string;
  category: string;
  description?: string;
  models?: string[];
}

export interface SkillDetail extends SkillSummary {
  tutorial?: string;
  recommended_for?: string[];
}

// ---------- Tools (free) ----------

export interface ParseVideoResponse {
  platform: string;
  title?: string;
  author?: string;
  video_url: string;
  cover_url?: string;
  duration?: number;
}

export type TransferUrlType = "image" | "audio";

export interface TransferUrlResponse {
  original_url: string;
  cdn_url: string;
  type: TransferUrlType;
  size_bytes?: number;
}

// ---------- Sync (synchronous generation) ----------

export interface SyncImageParams {
  model: string;
  prompt: string;
  image_url?: string;
  image_size?: string;
  options?: Record<string, unknown>;
}

export interface SyncVideoParams {
  model: string;
  prompt: string;
  image_url?: string;
  duration?: number;
  aspect_ratio?: string;
  options?: Record<string, unknown>;
}

export interface SyncImageResponse {
  task_id: string;
  status: TaskStatus;
  images?: Array<{ url: string; width?: number; height?: number }>;
  price?: number;
}

export interface SyncVideoResponse {
  task_id: string;
  status: TaskStatus;
  videos?: Array<{ url: string; duration?: number; width?: number; height?: number }>;
  price?: number;
}

export interface SyncModelInfo {
  id: string;
  name: string;
  media_type: "image" | "video";
  provider: string;
}

export interface SyncProviderInfo {
  id: string;
  name: string;
  media_types: string[];
}

// ---------- Captioning / Forced Alignment ----------

/**
 * Caption alignment mode. Maps to backend model:
 * - `speech` → `volcengine/captioning/ata-speech`
 * - `singing` → `volcengine/captioning/ata-singing`
 */
export type AlignMode = "speech" | "singing";

/**
 * Punctuation mode for the aligner output.
 * - 1 = omit trailing comma/period at sentence end (default)
 * - 2 = replace some punctuation with spaces
 * - 3 = preserve original punctuation
 */
export type AlignPunctMode = 1 | 2 | 3;

export interface AlignParams {
  /** Audio file URL (mp3/wav/m4a etc.). Max 120 minutes. */
  audio_url: string;
  /** The known subtitle text or lyric. Returned timestamps will align word-by-word to this text. */
  audio_text: string;
  /** Speech (default) or singing. */
  mode?: AlignMode;
  /** Punctuation mode, see {@link AlignPunctMode}. Defaults to 1. */
  sta_punc_mode?: AlignPunctMode;
}

export interface AlignWord {
  text: string;
  /** Milliseconds from audio start. */
  start_time: number;
  /** Milliseconds from audio start. */
  end_time: number;
}

export interface AlignUtterance {
  text: string;
  start_time: number;
  end_time: number;
  words: AlignWord[];
}

export interface AlignResult {
  /** Audio duration in seconds. */
  duration: number;
  utterances: AlignUtterance[];
  /** Underlying backend task id for traceability. */
  task_id?: string;
  /** Credits charged. */
  price?: number;
}

export interface AlignHelperOptions {
  /** Override default poll interval / timeout for the underlying task. */
  pollInterval?: number;
  timeout?: number;
  signal?: AbortSignal;
  onProgress?: (status: TaskQueryResponse) => void;
}

// ---------- Helpers (top-level) ----------

export interface GenerateOptions {
  model: string;
  prompt: string;
  image_url?: string;
  image_size?: string;
  aspect_ratio?: string;
  duration?: string | number;
  options?: Record<string, unknown>;
  /** Override default poll interval / timeout for async tasks. */
  pollInterval?: number;
  timeout?: number;
  signal?: AbortSignal;
  onProgress?: (status: TaskQueryResponse) => void;
}

export type GenerateResult = TaskCreateResponse | TaskQueryResponse;
