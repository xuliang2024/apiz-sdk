import type { Apiz } from "@apiz/sdk";
import type { ToolHandler } from "./index.js";

export const parseVideoTool: ToolHandler = {
  descriptor: {
    name: "parse_video",
    description:
      "Resolve a public video share link to a no-watermark URL. Free; supports Douyin / Kuaishou / Xiaohongshu / Bilibili / Weibo etc.",
    inputSchema: {
      type: "object",
      required: ["url"],
      properties: {
        url: { type: "string", description: "Share URL or pasted text containing a URL" },
      },
    },
  },
  async call(client: Apiz, args: Record<string, unknown>): Promise<unknown> {
    return await client.tools.parseVideo(String(args.url));
  },
};
