/**
 * apiz-mcp — Model Context Protocol server for apiz.ai
 *
 * Drop-in replacement for the legacy `user-xskill-ai` MCP. All 8 tools
 * (generate, get_result, search_models, guide, account, speak, parse_video,
 * transfer_url) delegate to `apiz-sdk`, so behavior stays in lock-step
 * with the official SDK.
 */

export { createApizServer, runStdio } from "./server.js";
export { TOOL_NAMES, type ToolName } from "./tools/index.js";

export const VERSION = "0.0.0";
