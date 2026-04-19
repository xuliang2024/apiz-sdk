import { Apiz } from "apiz-sdk";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

import { buildTools } from "./tools/index.js";

export interface CreateServerOptions {
  /** Reuse an existing apiz client (mainly for testing). */
  client?: Apiz;
  /** Override apiz API key (defaults to APIZ_API_KEY / XSKILL_API_KEY env). */
  apiKey?: string;
  /** Override apiz base URL (defaults to APIZ_BASE_URL or production). */
  baseURL?: string;
  /** Optional name reported to the MCP client. Defaults to `apiz`. */
  name?: string;
  /** Optional version. Defaults to package version. */
  version?: string;
}

/**
 * Build a fully-wired MCP {@link Server}. The caller is responsible for
 * connecting it to a transport (stdio for CLI usage, in-memory for tests).
 */
export function createApizServer(options: CreateServerOptions = {}): Server {
  const client =
    options.client ??
    new Apiz({
      ...(options.apiKey ? { apiKey: options.apiKey } : {}),
      ...(options.baseURL ? { baseURL: options.baseURL } : {}),
    });
  const tools = buildTools();

  const server = new Server(
    { name: options.name ?? "apiz", version: options.version ?? "0.0.0" },
    { capabilities: { tools: {} } },
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: Object.values(tools).map((t) => t.descriptor),
  }));

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const name = request.params.name;
    const args = (request.params.arguments ?? {}) as Record<string, unknown>;
    const handler = (tools as Record<string, (typeof tools)[keyof typeof tools]>)[name];
    if (!handler) {
      return {
        isError: true,
        content: [{ type: "text", text: `Unknown tool: ${name}` }],
      };
    }
    try {
      const result = await handler.call(client, args);
      return {
        content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return {
        isError: true,
        content: [{ type: "text", text: message }],
      };
    }
  });

  return server;
}

/**
 * Convenience: create a server, connect to stdio, and block until the parent
 * process closes the pipe.
 */
export async function runStdio(options: CreateServerOptions = {}): Promise<void> {
  const server = createApizServer(options);
  await server.connect(new StdioServerTransport());
}
