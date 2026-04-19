import type { Apiz, SpeakModel } from "apiz-sdk";
import type { ToolHandler } from "./index.js";

const VALID_MODELS = new Set([
  "speech-2.8-hd",
  "speech-2.8-turbo",
  "speech-2.6-hd",
  "speech-2.6-turbo",
]);

export const speakTool: ToolHandler = {
  descriptor: {
    name: "speak",
    description: "Text-to-speech and voice management (synthesize, list, design, clone).",
    inputSchema: {
      type: "object",
      properties: {
        action: {
          type: "string",
          enum: ["synthesize", "list_voices", "design_voice", "clone_voice"],
          default: "synthesize",
        },
        text: { type: "string" },
        voice_id: { type: "string" },
        prompt: { type: "string" },
        audio_url: { type: "string" },
        voice_name: { type: "string" },
        model: {
          type: "string",
          enum: ["speech-2.8-hd", "speech-2.8-turbo", "speech-2.6-hd", "speech-2.6-turbo"],
          default: "speech-2.8-hd",
        },
        speed: { type: "number", default: 1 },
      },
    },
  },
  async call(client: Apiz, args: Record<string, unknown>): Promise<unknown> {
    const action = typeof args.action === "string" ? args.action : "synthesize";
    switch (action) {
      case "list_voices":
        return await client.voices.list();
      case "design_voice": {
        if (typeof args.prompt !== "string" || !args.prompt) {
          throw new Error("speak design_voice: prompt is required");
        }
        const params: { prompt: string; voice_name?: string } = { prompt: args.prompt };
        if (typeof args.voice_name === "string") params.voice_name = args.voice_name;
        return await client.voices.design(params);
      }
      case "clone_voice": {
        const params: { audio_url?: string; voice_name?: string } = {};
        if (typeof args.audio_url === "string") params.audio_url = args.audio_url;
        if (typeof args.voice_name === "string") params.voice_name = args.voice_name;
        return await client.voices.clone(params);
      }
      case "synthesize":
      default: {
        if (typeof args.text !== "string" || !args.text) {
          throw new Error("speak synthesize: text is required");
        }
        const model =
          typeof args.model === "string" && VALID_MODELS.has(args.model)
            ? (args.model as SpeakModel)
            : "speech-2.8-hd";
        const speed = typeof args.speed === "number" ? args.speed : 1;
        const voiceId = typeof args.voice_id === "string" ? args.voice_id : undefined;
        return await client.speak(args.text, {
          ...(voiceId ? { voice_id: voiceId } : {}),
          model,
          speed,
        });
      }
    }
  },
};
