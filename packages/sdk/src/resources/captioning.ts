import type { HttpClient } from "../http.js";
import type {
  AlignMode,
  AlignParams,
  AlignResult,
  AlignUtterance,
  TaskCreateParams,
  TaskCreateResponse,
  TaskQueryResponse,
} from "../types.js";

const SPEECH_MODEL = "volcengine/captioning/ata-speech";
const SINGING_MODEL = "volcengine/captioning/ata-singing";

function modelIdFor(mode: AlignMode | undefined): string {
  return mode === "singing" ? SINGING_MODEL : SPEECH_MODEL;
}

function buildTaskParams(params: AlignParams): TaskCreateParams {
  const body: Record<string, unknown> = {
    audio_url: params.audio_url,
    audio_text: params.audio_text,
  };
  if (params.sta_punc_mode !== undefined) {
    body.sta_punc_mode = params.sta_punc_mode;
  }
  return { model: modelIdFor(params.mode), params: body };
}

/**
 * Extract structured {@link AlignResult} from a task query / create response.
 *
 * The aligner result lives at `response.result` (sync mode) or
 * `response.result.utterances` (typical async case).
 */
export function parseAlignResult(
  response: TaskCreateResponse | TaskQueryResponse,
): AlignResult {
  const raw = (response as { result?: unknown }).result;
  if (!raw || typeof raw !== "object") {
    throw new Error("apiz align: response missing result");
  }
  const r = raw as { duration?: number; utterances?: AlignUtterance[] };
  return {
    duration: typeof r.duration === "number" ? r.duration : 0,
    utterances: Array.isArray(r.utterances) ? r.utterances : [],
    task_id: response.task_id,
    price: (response as { price?: number }).price,
  };
}

/**
 * Low-level resource (mirrors {@link TasksResource} pattern). Use the
 * top-level {@link Apiz.align} helper for the common case (poll-then-return).
 */
export class CaptioningResource {
  constructor(private readonly http: HttpClient) {}

  /** Submit an alignment task without waiting. */
  create(params: AlignParams): Promise<TaskCreateResponse> {
    return this.http.request<TaskCreateResponse>({
      method: "POST",
      path: "/api/v3/tasks/create",
      body: { ...buildTaskParams(params), channel: null, callback_url: null },
    });
  }

  /** Returns the model id chosen for a given mode (test/debug helper). */
  modelFor(mode: AlignMode | undefined): string {
    return modelIdFor(mode);
  }
}
