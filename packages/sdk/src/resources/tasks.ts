import type { HttpClient } from "../http.js";
import { ApizError, ApizTimeoutError } from "../errors.js";
import type {
  TaskCreateParams,
  TaskCreateResponse,
  TaskQueryResponse,
  WaitForOptions,
} from "../types.js";

const DEFAULT_POLL_INTERVAL = 5_000;
const DEFAULT_WAIT_TIMEOUT = 600_000;

export class TasksResource {
  constructor(private readonly http: HttpClient) {}

  create(params: TaskCreateParams): Promise<TaskCreateResponse> {
    return this.http.request<TaskCreateResponse>({
      method: "POST",
      path: "/api/v3/tasks/create",
      body: {
        model: params.model,
        params: params.params,
        channel: params.channel ?? null,
        callback_url: params.callback_url ?? null,
      },
    });
  }

  query(taskId: string): Promise<TaskQueryResponse> {
    return this.http.request<TaskQueryResponse>({
      method: "POST",
      path: "/api/v3/tasks/query",
      body: { task_id: taskId },
    });
  }

  get(taskId: string): Promise<TaskQueryResponse> {
    return this.http.request<TaskQueryResponse>({
      method: "GET",
      path: `/api/v3/tasks/${encodeURIComponent(taskId)}`,
    });
  }

  /**
   * Poll {@link query} until status is `completed` or `failed`. Returns the
   * final {@link TaskQueryResponse} on success; throws {@link ApizError} on
   * failure or {@link ApizTimeoutError} if `options.timeout` is reached.
   */
  async waitFor(taskId: string, options: WaitForOptions = {}): Promise<TaskQueryResponse> {
    const pollInterval = options.pollInterval ?? DEFAULT_POLL_INTERVAL;
    const timeout = options.timeout ?? DEFAULT_WAIT_TIMEOUT;
    const start = Date.now();

    while (true) {
      if (options.signal?.aborted) {
        throw new ApizError("waitFor aborted by caller", { cause: options.signal.reason });
      }
      const status = await this.query(taskId);
      if (options.onProgress) {
        try {
          options.onProgress(status);
        } catch {
          // Caller-supplied callback errors must not break polling.
        }
      }
      if (status.status === "completed") return status;
      if (status.status === "failed") {
        throw new ApizError(
          status.error ?? `Task ${taskId} failed`,
          { detail: status, code: 200 },
        );
      }
      if (Date.now() - start + pollInterval > timeout) {
        throw new ApizTimeoutError(
          `Task ${taskId} timed out after ${timeout}ms (last status: ${status.status})`,
          { detail: status },
        );
      }
      await new Promise<void>((resolve, reject) => {
        const t = setTimeout(resolve, pollInterval);
        if (options.signal) {
          const onAbort = () => {
            clearTimeout(t);
            reject(new ApizError("waitFor aborted by caller", { cause: options.signal?.reason }));
          };
          options.signal.addEventListener("abort", onAbort, { once: true });
        }
      });
    }
  }
}
