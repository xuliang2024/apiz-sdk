import type { Apiz, GenerateOptions } from "@apiz/sdk";
import type { ToolHandler } from "./index.js";

export const generateTool: ToolHandler = {
  descriptor: {
    name: "generate",
    description:
      "Generate an image or video. Common parameters are first-class; pass model-specific options under `options`.",
    inputSchema: {
      type: "object",
      required: ["model", "prompt"],
      properties: {
        model: { type: "string", description: "Model id (use search_models to discover)" },
        prompt: { type: "string", description: "Generation prompt" },
        image_url: { type: "string", description: "Input image URL (image-to-image / image-to-video)" },
        image_size: { type: "string", description: "square_hd | landscape_16_9 | portrait_4_3 …" },
        aspect_ratio: { type: "string", description: "16:9 | 9:16 | 1:1 …" },
        duration: { type: "string", description: "Video duration in seconds" },
        options: { type: "object", description: "Model-specific extra parameters" },
      },
    },
  },
  async call(client: Apiz, args: Record<string, unknown>): Promise<unknown> {
    const opts: GenerateOptions = {
      model: String(args.model),
      prompt: String(args.prompt ?? ""),
    };
    if (typeof args.image_url === "string") opts.image_url = args.image_url;
    if (typeof args.image_size === "string") opts.image_size = args.image_size;
    if (typeof args.aspect_ratio === "string") opts.aspect_ratio = args.aspect_ratio;
    if (typeof args.duration === "string" || typeof args.duration === "number") {
      opts.duration = args.duration;
    }
    if (args.options && typeof args.options === "object") {
      opts.options = args.options as Record<string, unknown>;
    }
    return await client.generate(opts);
  },
};
