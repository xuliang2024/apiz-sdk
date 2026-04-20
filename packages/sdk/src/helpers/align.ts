import type { Apiz } from "../client.js";
import { ApizError } from "../errors.js";
import {
  CaptioningResource,
  parseAlignResult,
} from "../resources/captioning.js";
import type {
  AlignHelperOptions,
  AlignParams,
  AlignResult,
  TaskCreateResponse,
} from "../types.js";

/**
 * High-level helper that submits a forced alignment job and returns the
 * structured {@link AlignResult}.
 *
 * Behavior:
 * - If the backend returns a `completed` status inline, parses the result and
 *   returns immediately.
 * - Otherwise polls {@link Apiz.tasks.waitFor} until completion.
 *
 * Both `volcengine/captioning/ata-speech` and `ata-singing` are async, so the
 * polling path is taken in normal use.
 */
export async function align(
  client: Apiz,
  params: AlignParams,
  options: AlignHelperOptions = {},
): Promise<AlignResult> {
  const captioning = new CaptioningResource((client as unknown as { _http: ConstructorParameters<typeof CaptioningResource>[0] })._http);

  const submitted: TaskCreateResponse = await captioning.create(params);

  if (submitted.status === "completed" && (submitted as { result?: unknown }).result) {
    return parseAlignResult(submitted);
  }

  if (!submitted.task_id) {
    throw new ApizError("apiz align: backend returned no task_id", { detail: submitted });
  }

  const final = await client.tasks.waitFor(submitted.task_id, {
    pollInterval: options.pollInterval ?? 2_000,
    timeout: options.timeout ?? 300_000,
    ...(options.onProgress ? { onProgress: options.onProgress } : {}),
    ...(options.signal ? { signal: options.signal } : {}),
  });

  return parseAlignResult(final);
}
