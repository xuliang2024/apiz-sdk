import type { HttpClient } from "../http.js";
import type { ParseVideoResponse, TransferUrlResponse, TransferUrlType } from "../types.js";

export class ToolsResource {
  constructor(private readonly http: HttpClient) {}

  parseVideo(url: string): Promise<ParseVideoResponse> {
    return this.http.request<ParseVideoResponse>({
      method: "POST",
      path: "/api/v3/tools/parse-video",
      body: { url },
      auth: false,
    });
  }

  transferUrl(url: string, type: TransferUrlType = "image"): Promise<TransferUrlResponse> {
    return this.http.request<TransferUrlResponse>({
      method: "POST",
      path: "/api/v3/tools/transfer-url",
      body: { url, type },
      auth: false,
    });
  }
}
