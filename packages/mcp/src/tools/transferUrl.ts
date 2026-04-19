import type { Apiz, TransferUrlType } from "@apiz/sdk";
import type { ToolHandler } from "./index.js";

const VALID_TYPES = new Set<TransferUrlType>(["image", "audio"]);

export const transferUrlTool: ToolHandler = {
  descriptor: {
    name: "transfer_url",
    description:
      "Mirror an external URL into the apiz CDN (free). Returns the new cdn_url plus original_url.",
    inputSchema: {
      type: "object",
      required: ["url"],
      properties: {
        url: { type: "string", description: "External image / audio URL" },
        type: { type: "string", enum: ["image", "audio"], default: "image" },
      },
    },
  },
  async call(client: Apiz, args: Record<string, unknown>): Promise<unknown> {
    const type =
      typeof args.type === "string" && VALID_TYPES.has(args.type as TransferUrlType)
        ? (args.type as TransferUrlType)
        : "image";
    return await client.tools.transferUrl(String(args.url), type);
  },
};
