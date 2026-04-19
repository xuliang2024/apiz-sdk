import type { Apiz } from "apiz-sdk";
import type { Tool } from "@modelcontextprotocol/sdk/types.js";

import { accountTool } from "./account.js";
import { generateTool } from "./generate.js";
import { getResultTool } from "./getResult.js";
import { guideTool } from "./guide.js";
import { parseVideoTool } from "./parseVideo.js";
import { searchModelsTool } from "./searchModels.js";
import { speakTool } from "./speak.js";
import { transferUrlTool } from "./transferUrl.js";

export const TOOL_NAMES = [
  "generate",
  "get_result",
  "search_models",
  "guide",
  "account",
  "speak",
  "parse_video",
  "transfer_url",
] as const;
export type ToolName = (typeof TOOL_NAMES)[number];

export interface ToolHandler {
  /** MCP tool descriptor (name, description, input schema). */
  descriptor: Tool;
  /** Called when the client invokes this tool. */
  call: (client: Apiz, args: Record<string, unknown>) => Promise<unknown>;
}

export function buildTools(): Record<ToolName, ToolHandler> {
  return {
    generate: generateTool,
    get_result: getResultTool,
    search_models: searchModelsTool,
    guide: guideTool,
    account: accountTool,
    speak: speakTool,
    parse_video: parseVideoTool,
    transfer_url: transferUrlTool,
  };
}
