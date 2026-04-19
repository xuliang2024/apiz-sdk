import type { Apiz } from "../client.js";
import type {
  GenerateOptions,
  GenerateResult,
  TaskCreateParams,
  TaskCreateResponse,
} from "../types.js";

/**
 * High-level helper that submits a generation job.
 *
 * Behavior:
 * - If the backend returns a `completed` status inline (sync-channel models
 *   like jimeng-4.5), the result is returned immediately.
 * - Otherwise the helper polls {@link Apiz.tasks.waitFor} until the task
 *   reaches `completed` or `failed`, then returns the final
 *   {@link TaskQueryResponse}.
 *
 * The non-prompt convenience fields (`image_url`, `image_size`,
 * `aspect_ratio`, `duration`, `options`) are merged into `params` for the
 * backend.
 */
export async function generate(
  client: Apiz,
  options: GenerateOptions,
): Promise<GenerateResult> {
  const params: Record<string, unknown> = { prompt: options.prompt };
  if (options.image_url !== undefined) params.image_url = options.image_url;
  if (options.image_size !== undefined) params.image_size = options.image_size;
  if (options.aspect_ratio !== undefined) params.aspect_ratio = options.aspect_ratio;
  if (options.duration !== undefined) params.duration = options.duration;
  if (options.options) Object.assign(params, options.options);

  const create: TaskCreateParams = { model: options.model, params };
  const submitted: TaskCreateResponse = await client.tasks.create(create);

  if (submitted.status === "completed") {
    return submitted;
  }

  return client.tasks.waitFor(submitted.task_id, {
    pollInterval: options.pollInterval ?? 5_000,
    timeout: options.timeout ?? 600_000,
    ...(options.onProgress ? { onProgress: options.onProgress } : {}),
    ...(options.signal ? { signal: options.signal } : {}),
  });
}
