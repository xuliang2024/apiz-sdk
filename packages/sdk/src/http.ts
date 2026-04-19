/**
 * Low-level HTTP transport with retry, timeout and typed error mapping.
 */

import {
  ApizConnectionError,
  ApizError,
  ApizTimeoutError,
  errorFromStatus,
} from "./errors.js";
import type { ApizOptions } from "./types.js";

export interface RequestOptions {
  method: "GET" | "POST" | "PATCH" | "DELETE" | "PUT";
  path: string;
  body?: unknown;
  /** Append query parameters. Falsy values are dropped. */
  query?: Record<string, string | number | boolean | undefined | null>;
  headers?: Record<string, string>;
  /** Treat this request as auth-required (default true). */
  auth?: boolean;
  /** Override per-request signal (composed with timeout signal). */
  signal?: AbortSignal;
}

const DEFAULT_BASE_URL = "https://api.apiz.ai";
const RETRYABLE_STATUSES = new Set([408, 425, 429, 500, 502, 503, 504]);

export interface ResolvedConfig {
  apiKey: string;
  baseURL: string;
  timeout: number;
  maxRetries: number;
  fetch: typeof fetch;
  defaultHeaders: Record<string, string>;
}

export function resolveConfig(options: ApizOptions = {}): ResolvedConfig {
  const env = (typeof process !== "undefined" ? process.env : undefined) ?? {};
  const apiKey = options.apiKey ?? env["APIZ_API_KEY"] ?? env["XSKILL_API_KEY"] ?? "";
  const baseURL = options.baseURL ?? env["APIZ_BASE_URL"] ?? DEFAULT_BASE_URL;
  const timeoutEnv = env["APIZ_TIMEOUT"];
  const timeout =
    options.timeout ?? (timeoutEnv ? Number.parseInt(timeoutEnv, 10) : 60_000);
  const maxRetries = options.maxRetries ?? 2;
  const fetchImpl = options.fetch ?? globalThis.fetch.bind(globalThis);
  const defaultHeaders = options.defaultHeaders ?? {};
  return {
    apiKey,
    baseURL: baseURL.replace(/\/+$/, ""),
    timeout,
    maxRetries,
    fetch: fetchImpl,
    defaultHeaders,
  };
}

function buildURL(baseURL: string, path: string, query?: RequestOptions["query"]): string {
  const url = baseURL + (path.startsWith("/") ? path : `/${path}`);
  if (!query) return url;
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null || value === "") continue;
    params.append(key, String(value));
  }
  const qs = params.toString();
  return qs ? `${url}?${qs}` : url;
}

function isAbortError(err: unknown): boolean {
  if (!err || typeof err !== "object") return false;
  const name = (err as { name?: string }).name;
  return name === "AbortError" || name === "TimeoutError";
}

function combineSignals(signals: (AbortSignal | undefined)[]): AbortSignal | undefined {
  const present = signals.filter((s): s is AbortSignal => Boolean(s));
  if (present.length === 0) return undefined;
  if (present.length === 1) return present[0];
  // Manual composition for environments without AbortSignal.any (Node 20+ has it).
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const anyFn = (AbortSignal as any).any as ((sigs: AbortSignal[]) => AbortSignal) | undefined;
  if (typeof anyFn === "function") return anyFn(present);
  const ctl = new AbortController();
  for (const s of present) {
    if (s.aborted) {
      ctl.abort(s.reason);
      break;
    }
    s.addEventListener("abort", () => ctl.abort(s.reason), { once: true });
  }
  return ctl.signal;
}

export class HttpClient {
  readonly config: ResolvedConfig;

  constructor(config: ResolvedConfig) {
    this.config = config;
  }

  async request<T>(options: RequestOptions): Promise<T> {
    const url = buildURL(this.config.baseURL, options.path, options.query);
    const auth = options.auth !== false;
    const headers: Record<string, string> = {
      Accept: "application/json",
      ...this.config.defaultHeaders,
      ...(options.headers ?? {}),
    };
    if (auth && this.config.apiKey) {
      headers["Authorization"] = `Bearer ${this.config.apiKey}`;
    }
    const hasBody = options.body !== undefined && options.method !== "GET";
    let bodyPayload: string | undefined;
    if (hasBody) {
      headers["Content-Type"] = headers["Content-Type"] ?? "application/json";
      bodyPayload = JSON.stringify(options.body);
    }

    let lastError: unknown;
    const maxAttempts = Math.max(1, this.config.maxRetries + 1);

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      const timer = new AbortController();
      const timeoutId = setTimeout(
        () => timer.abort(new Error("apiz request timeout")),
        this.config.timeout,
      );
      const signal = combineSignals([options.signal, timer.signal]);

      try {
        const response = await this.config.fetch(url, {
          method: options.method,
          headers,
          body: bodyPayload,
          signal,
        });

        if (!response.ok) {
          const status = response.status;
          const parsed = await this._parseErrorBody(response);
          const message = parsed.message ?? `HTTP ${status} from ${options.method} ${options.path}`;
          const apizError = errorFromStatus(status, message, {
            code: parsed.code,
            detail: parsed.detail,
          });
          if (RETRYABLE_STATUSES.has(status) && attempt < maxAttempts) {
            lastError = apizError;
            await this._sleep(this._backoffMs(attempt));
            continue;
          }
          throw apizError;
        }

        return (await this._parseSuccessBody<T>(response)) as T;
      } catch (err) {
        if (err instanceof ApizError) {
          throw err;
        }
        // Distinguish: caller-abort vs our-timeout vs network failure.
        // We trust our own AbortController's signal as ground truth — fetch
        // implementations vary in the error name they raise on abort.
        const callerAborted = options.signal?.aborted === true;
        const timedOut = timer.signal.aborted;
        if (callerAborted) {
          throw new ApizError("Request aborted by caller", { cause: err });
        }
        if (timedOut || isAbortError(err)) {
          throw new ApizTimeoutError(
            `Request to ${options.method} ${options.path} timed out after ${this.config.timeout}ms`,
            { cause: err },
          );
        }
        // network / DNS / TLS failures
        lastError = new ApizConnectionError(
          `Network error contacting ${this.config.baseURL}: ${(err as Error).message ?? String(err)}`,
          { cause: err },
        );
        if (attempt < maxAttempts) {
          await this._sleep(this._backoffMs(attempt));
          continue;
        }
        throw lastError;
      } finally {
        clearTimeout(timeoutId);
      }
    }

    throw lastError instanceof Error
      ? lastError
      : new ApizError("Exhausted retries with unknown error");
  }

  private _backoffMs(attempt: number): number {
    // Tiny jittered backoff: 50ms / 100ms / 200ms ... capped at 2s.
    const base = Math.min(50 * 2 ** (attempt - 1), 2000);
    return base + Math.floor(Math.random() * 25);
  }

  private _sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private async _parseSuccessBody<T>(response: Response): Promise<T> {
    if (response.status === 204) return undefined as T;
    const text = await response.text();
    if (!text) return undefined as T;
    let payload: unknown;
    try {
      payload = JSON.parse(text);
    } catch {
      throw new ApizError(`Invalid JSON in response body: ${text.slice(0, 200)}`);
    }
    if (payload && typeof payload === "object" && "data" in (payload as Record<string, unknown>)) {
      return (payload as { data: T }).data;
    }
    return payload as T;
  }

  private async _parseErrorBody(
    response: Response,
  ): Promise<{ message?: string; detail?: unknown; code?: number }> {
    let payload: unknown = null;
    try {
      const text = await response.text();
      if (text) payload = JSON.parse(text);
    } catch {
      // Non-JSON body: leave payload as null.
    }
    if (payload && typeof payload === "object") {
      const obj = payload as Record<string, unknown>;
      const message =
        typeof obj.detail === "string"
          ? obj.detail
          : typeof obj.message === "string"
            ? obj.message
            : undefined;
      const code = typeof obj.code === "number" ? obj.code : undefined;
      const detail = "data" in obj ? obj.data : obj.detail;
      return { message, detail, code };
    }
    return {};
  }
}
