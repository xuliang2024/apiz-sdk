import type { AlignMode, AlignParams, AlignPunctMode, Apiz } from "apiz-sdk";
import type { ToolHandler } from "./index.js";

const VALID_MODES = new Set<AlignMode>(["speech", "singing"]);
const VALID_PUNCT = new Set<number>([1, 2, 3]);

export const alignTool: ToolHandler = {
  descriptor: {
    name: "align",
    description:
      "Align spoken or sung audio with given subtitle/lyric text. Returns utterance-level and word-level millisecond timestamps. Use when you have BOTH the audio and its original text, and need precise time alignment for subtitle authoring or karaoke timing. (For pure speech-to-text without known text, use a speech-to-text model via `generate` instead.)",
    inputSchema: {
      type: "object",
      required: ["audio_url", "audio_text"],
      properties: {
        audio_url: {
          type: "string",
          description: "Audio URL (mp3/wav/m4a etc.). Max 120 minutes.",
        },
        audio_text: {
          type: "string",
          description:
            "The known subtitle text (speech) or lyric (singing). Returned timestamps will align word-by-word to this text.",
        },
        mode: {
          type: "string",
          enum: ["speech", "singing"],
          default: "speech",
          description: "speech for talking, singing for songs.",
        },
        sta_punc_mode: {
          type: "integer",
          enum: [1, 2, 3],
          default: 1,
          description:
            "1 = omit trailing comma/period at sentence end (default), 2 = replace some punctuation with spaces, 3 = preserve original punctuation.",
        },
      },
    },
  },
  async call(client: Apiz, args: Record<string, unknown>): Promise<unknown> {
    if (typeof args.audio_url !== "string" || !args.audio_url) {
      throw new Error("align: audio_url is required");
    }
    if (typeof args.audio_text !== "string" || !args.audio_text) {
      throw new Error("align: audio_text is required");
    }

    const params: AlignParams = {
      audio_url: args.audio_url,
      audio_text: args.audio_text,
    };

    if (typeof args.mode === "string" && VALID_MODES.has(args.mode as AlignMode)) {
      params.mode = args.mode as AlignMode;
    }
    if (typeof args.sta_punc_mode === "number" && VALID_PUNCT.has(args.sta_punc_mode)) {
      params.sta_punc_mode = args.sta_punc_mode as AlignPunctMode;
    }

    return await client.align(params);
  },
};
