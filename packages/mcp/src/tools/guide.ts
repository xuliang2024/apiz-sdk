import type { Apiz } from "apiz-sdk";
import type { ToolHandler } from "./index.js";

export const guideTool: ToolHandler = {
  descriptor: {
    name: "guide",
    description:
      "Fetch model usage tutorials. Pass `skill_id` for a specific tutorial, or `query`/`category` to search.",
    inputSchema: {
      type: "object",
      properties: {
        query: { type: "string" },
        skill_id: { type: "string" },
        category: { type: "string", enum: ["image", "video", "audio", "tool"] },
      },
    },
  },
  async call(client: Apiz, args: Record<string, unknown>): Promise<unknown> {
    if (typeof args.skill_id === "string" && args.skill_id.length > 0) {
      return await client.skills.get(args.skill_id);
    }
    const category = typeof args.category === "string" ? args.category : undefined;
    return await client.skills.list(category ? { category } : {});
  },
};
