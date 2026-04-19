import type { HttpClient } from "../http.js";
import type {
  ModelDetail,
  ModelDocs,
  ModelListOptions,
  ModelSearchOptions,
  ModelSummary,
} from "../types.js";

/**
 * Encode a model id for use in a URL path while preserving `/` separators
 * (the backend route uses FastAPI's `{model_id:path}` matcher which accepts
 * raw slashes).
 */
function encodeModelId(modelId: string): string {
  return encodeURIComponent(modelId).replace(/%2F/g, "/");
}

export class ModelsResource {
  constructor(private readonly http: HttpClient) {}

  async list(options: ModelListOptions = {}): Promise<ModelSummary[]> {
    const resp = await this.http.request<{ models: ModelSummary[]; total: number }>({
      method: "GET",
      path: "/api/v3/mcp/models",
      query: { category: options.category, task_type: options.task_type },
    });
    return resp.models;
  }

  get(modelId: string, options: { lang?: string } = {}): Promise<ModelDetail> {
    return this.http.request<ModelDetail>({
      method: "GET",
      path: `/api/v3/mcp/models/${encodeModelId(modelId)}`,
      query: { lang: options.lang ?? "zh" },
    });
  }

  docs(modelId: string, options: { lang?: string } = {}): Promise<ModelDocs> {
    return this.http.request<ModelDocs>({
      method: "GET",
      path: `/api/v3/models/${encodeModelId(modelId)}/docs`,
      query: { lang: options.lang ?? "zh" },
    });
  }

  /**
   * Free-text + capability search. Currently delegates to {@link list} with
   * client-side filtering; future versions may use a dedicated backend route.
   */
  async search(options: ModelSearchOptions = {}): Promise<ModelSummary[]> {
    const all = await this.list({ category: options.category, task_type: options.task_type });
    return all.filter((m) => {
      if (options.capability && m.capability !== options.capability) return false;
      if (options.query) {
        const q = options.query.toLowerCase();
        const hay = `${m.id} ${m.name} ${(m.tags ?? []).join(" ")}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }
}
