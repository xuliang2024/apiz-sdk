import { Apiz } from "@apiz/sdk";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";

import { createApizServer } from "../src/server.js";
import { TOOL_NAMES } from "../src/tools/index.js";

const MOCK_BASE_URL = "https://mock.api.apiz.ai";
const TEST_API_KEY = "sk-mock-mcp-test-not-real-0000000000000000000000";

const fixtures = setupServer(
  http.get(`${MOCK_BASE_URL}/api/v3/balance`, () =>
    HttpResponse.json({
      code: 200,
      data: { user_id: 42, balance: 12500, balance_yuan: 125, vip_level: 1 },
    }),
  ),
  http.get(`${MOCK_BASE_URL}/api/v3/mcp/models`, () =>
    HttpResponse.json({
      code: 200,
      data: {
        models: [
          {
            id: "fal-ai/flux-2/flash",
            name: "Flux 2 Flash",
            category: "image",
            capability: "t2i",
          },
        ],
        total: 1,
      },
    }),
  ),
  http.post(`${MOCK_BASE_URL}/api/v3/tasks/create`, () =>
    HttpResponse.json({
      code: 200,
      data: {
        task_id: "t1",
        status: "completed",
        model: "jimeng-4.5",
        result: { images: [{ url: "https://cdn-video.51sux.com/x.png" }] },
      },
    }),
  ),
  http.post(`${MOCK_BASE_URL}/api/v3/tasks/query`, () =>
    HttpResponse.json({
      code: 200,
      data: { task_id: "t1", status: "completed" },
    }),
  ),
  http.post(`${MOCK_BASE_URL}/api/v3/tools/parse-video`, () =>
    HttpResponse.json({
      code: 200,
      data: {
        platform: "douyin",
        video_url: "https://cdn-video.51sux.com/x.mp4",
      },
    }),
  ),
);

beforeAll(() => fixtures.listen({ onUnhandledRequest: "error" }));
afterEach(() => fixtures.resetHandlers());
afterAll(() => fixtures.close());

async function makeConnectedPair(): Promise<{ client: Client; cleanup: () => Promise<void> }> {
  const apiz = new Apiz({ apiKey: TEST_API_KEY, baseURL: MOCK_BASE_URL, maxRetries: 0 });
  const server = createApizServer({ client: apiz });
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();

  const client = new Client(
    { name: "test-client", version: "0.0.0" },
    { capabilities: {} },
  );

  await Promise.all([client.connect(clientTransport), server.connect(serverTransport)]);

  return {
    client,
    cleanup: async () => {
      await client.close();
      await server.close();
    },
  };
}

describe("@apiz/mcp protocol", () => {
  it("lists all 8 tools matching legacy user-xskill-ai", async () => {
    const { client, cleanup } = await makeConnectedPair();
    try {
      const result = await client.listTools();
      const names = result.tools.map((t) => t.name).sort();
      expect(names).toEqual([...TOOL_NAMES].sort());
      // Spot-check a descriptor: `generate` should have `model` + `prompt` required.
      const gen = result.tools.find((t) => t.name === "generate");
      expect(gen?.inputSchema?.required).toEqual(expect.arrayContaining(["model", "prompt"]));
    } finally {
      await cleanup();
    }
  });

  it("calls account.balance via `account` tool with default action", async () => {
    const { client, cleanup } = await makeConnectedPair();
    try {
      const result = await client.callTool({ name: "account", arguments: {} });
      expect(result.isError).toBeFalsy();
      const text = (result.content as Array<{ type: string; text: string }>)[0]?.text ?? "";
      const body = JSON.parse(text);
      expect(body.balance).toBe(12500);
    } finally {
      await cleanup();
    }
  });

  it("calls search_models with category filter", async () => {
    const { client, cleanup } = await makeConnectedPair();
    try {
      const result = await client.callTool({
        name: "search_models",
        arguments: { category: "image" },
      });
      expect(result.isError).toBeFalsy();
      const text = (result.content as Array<{ type: string; text: string }>)[0]?.text ?? "";
      const body = JSON.parse(text);
      expect(Array.isArray(body)).toBe(true);
      expect(body[0].id).toBe("fal-ai/flux-2/flash");
    } finally {
      await cleanup();
    }
  });

  it("calls generate (sync model returns inline)", async () => {
    const { client, cleanup } = await makeConnectedPair();
    try {
      const result = await client.callTool({
        name: "generate",
        arguments: { model: "jimeng-4.5", prompt: "ink" },
      });
      expect(result.isError).toBeFalsy();
      const text = (result.content as Array<{ type: string; text: string }>)[0]?.text ?? "";
      const body = JSON.parse(text);
      expect(body.status).toBe("completed");
    } finally {
      await cleanup();
    }
  });

  it("calls parse_video (free tool, no auth required)", async () => {
    const { client, cleanup } = await makeConnectedPair();
    try {
      const result = await client.callTool({
        name: "parse_video",
        arguments: { url: "https://v.douyin.com/example" },
      });
      expect(result.isError).toBeFalsy();
      const text = (result.content as Array<{ type: string; text: string }>)[0]?.text ?? "";
      const body = JSON.parse(text);
      expect(body.platform).toBe("douyin");
    } finally {
      await cleanup();
    }
  });

  it("returns isError for unknown tool", async () => {
    const { client, cleanup } = await makeConnectedPair();
    try {
      const result = await client.callTool({ name: "frobnicate", arguments: {} });
      expect(result.isError).toBe(true);
    } finally {
      await cleanup();
    }
  });

  it("returns isError when sdk throws (e.g. account pay missing package_id)", async () => {
    const { client, cleanup } = await makeConnectedPair();
    try {
      const result = await client.callTool({
        name: "account",
        arguments: { action: "pay" },
      });
      expect(result.isError).toBe(true);
      const text = (result.content as Array<{ type: string; text: string }>)[0]?.text ?? "";
      expect(text).toMatch(/package_id/i);
    } finally {
      await cleanup();
    }
  });
});
