import type { HttpClient } from "../http.js";
import type {
  SyncImageParams,
  SyncImageResponse,
  SyncModelInfo,
  SyncProviderInfo,
  SyncVideoParams,
  SyncVideoResponse,
} from "../types.js";

export class SyncResource {
  constructor(private readonly http: HttpClient) {}

  image(params: SyncImageParams): Promise<SyncImageResponse> {
    return this.http.request<SyncImageResponse>({
      method: "POST",
      path: "/api/v3/sync/image",
      body: params,
    });
  }

  video(params: SyncVideoParams): Promise<SyncVideoResponse> {
    return this.http.request<SyncVideoResponse>({
      method: "POST",
      path: "/api/v3/sync/video",
      body: params,
    });
  }

  async models(options: { media_type?: string } = {}): Promise<SyncModelInfo[]> {
    const resp = await this.http.request<{ models: SyncModelInfo[] }>({
      method: "GET",
      path: "/api/v3/sync/models",
      query: { media_type: options.media_type ?? "all" },
    });
    return resp.models;
  }

  async providers(): Promise<SyncProviderInfo[]> {
    const resp = await this.http.request<{ providers: SyncProviderInfo[] }>({
      method: "GET",
      path: "/api/v3/sync/providers",
    });
    return resp.providers;
  }
}
