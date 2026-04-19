import type { Apiz, ModelCapability, ModelCategory } from "@apiz/sdk";
import type { ToolHandler } from "./index.js";

const VALID_CATEGORIES = new Set(["image", "video", "audio", "all"]);
const VALID_CAPABILITIES = new Set(["t2i", "i2i", "t2v", "i2v", "v2v", "t2a", "stt", "i2t", "v2t"]);

export const searchModelsTool: ToolHandler = {
  descriptor: {
    name: "search_models",
    description:
      "Discover models. Filter by category, capability or free-text query. Pass `model_id` to fetch the full schema for one specific model.",
    inputSchema: {
      type: "object",
      properties: {
        query: { type: "string" },
        category: { type: "string", enum: ["image", "video", "audio", "all"] },
        capability: {
          type: "string",
          enum: ["t2i", "i2i", "t2v", "i2v", "v2v", "t2a", "stt", "i2t", "v2t"],
        },
        model_id: { type: "string", description: "Return the full schema for this model id" },
      },
    },
  },
  async call(client: Apiz, args: Record<string, unknown>): Promise<unknown> {
    if (typeof args.model_id === "string" && args.model_id.length > 0) {
      return await client.models.get(args.model_id);
    }
    const category =
      typeof args.category === "string" && VALID_CATEGORIES.has(args.category)
        ? (args.category as ModelCategory)
        : undefined;
    const capability =
      typeof args.capability === "string" && VALID_CAPABILITIES.has(args.capability)
        ? (args.capability as ModelCapability)
        : undefined;
    const query = typeof args.query === "string" ? args.query : undefined;
    return await client.models.search({
      ...(category ? { category } : {}),
      ...(capability ? { capability } : {}),
      ...(query ? { query } : {}),
    });
  },
};
