import type { HttpClient } from "../http.js";
import type {
  SynthesizeParams,
  SynthesizeResponse,
  VoiceCloneParams,
  VoiceDesignParams,
  VoiceItem,
  VoiceListResponse,
  VoiceUpdateParams,
} from "../types.js";

export class VoicesResource {
  constructor(private readonly http: HttpClient) {}

  list(options: { status?: "active" | "expired" | "all" } = {}): Promise<VoiceListResponse> {
    return this.http.request<VoiceListResponse>({
      method: "POST",
      path: "/api/v3/minimax/voices",
      query: { status: options.status ?? "active" },
      body: {},
    });
  }

  get(voiceId: string): Promise<VoiceItem & Record<string, unknown>> {
    return this.http.request({
      method: "GET",
      path: `/api/v3/minimax/voices/${encodeURIComponent(voiceId)}`,
    });
  }

  update(voiceId: string, params: VoiceUpdateParams): Promise<VoiceItem> {
    return this.http.request<VoiceItem>({
      method: "PATCH",
      path: "/api/v3/minimax/voices/update",
      body: { voice_id: voiceId, ...params },
    });
  }

  synthesize(params: SynthesizeParams): Promise<SynthesizeResponse> {
    return this.http.request<SynthesizeResponse>({
      method: "POST",
      path: "/api/v3/minimax/t2a",
      body: {
        text: params.text,
        voice_id: params.voice_id,
        model: params.model ?? "speech-2.8-hd",
        speed: params.speed ?? 1,
      },
    });
  }

  design(params: VoiceDesignParams): Promise<VoiceItem> {
    return this.http.request<VoiceItem>({
      method: "POST",
      path: "/api/v3/minimax/voice-design",
      body: params,
    });
  }

  clone(params: VoiceCloneParams): Promise<VoiceItem> {
    return this.http.request<VoiceItem>({
      method: "POST",
      path: "/api/v3/minimax/voice-clone",
      body: params,
    });
  }

  uploadAudio(audioUrl: string): Promise<{ file_id: number; size_bytes?: number }> {
    return this.http.request({
      method: "POST",
      path: "/api/v3/minimax/upload-audio",
      body: { audio_url: audioUrl },
    });
  }
}
