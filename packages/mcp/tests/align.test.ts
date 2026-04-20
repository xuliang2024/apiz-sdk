import { describe, expect, it } from "vitest";
import { buildTools, TOOL_NAMES } from "../src/tools/index.js";

describe("apiz-mcp align tool", () => {
  it("is registered and exposed in TOOL_NAMES", () => {
    const tools = buildTools();
    expect(TOOL_NAMES).toContain("align");
    expect(tools.align).toBeDefined();
  });

  it("has a complete descriptor", () => {
    const tools = buildTools();
    const desc = tools.align.descriptor;
    expect(desc.name).toBe("align");
    expect(typeof desc.description).toBe("string");
    expect(desc.description!.length).toBeGreaterThan(20);

    const schema = desc.inputSchema as {
      required?: string[];
      properties?: Record<string, unknown>;
    };
    expect(schema.required).toEqual(expect.arrayContaining(["audio_url", "audio_text"]));
    expect(schema.properties).toBeDefined();
    expect(schema.properties!.audio_url).toBeDefined();
    expect(schema.properties!.audio_text).toBeDefined();
    expect(schema.properties!.mode).toBeDefined();
    expect(schema.properties!.sta_punc_mode).toBeDefined();
  });

  it("rejects calls missing required args", async () => {
    const tools = buildTools();
    // We pass a stub client because the handler validates args before any I/O.
    const stubClient = {} as never;
    await expect(tools.align.call(stubClient, {})).rejects.toThrow(/audio_url/);
    await expect(
      tools.align.call(stubClient, { audio_url: "https://x.mp3" }),
    ).rejects.toThrow(/audio_text/);
  });
});
