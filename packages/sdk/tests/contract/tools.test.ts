import { describe, it, expect } from "vitest";
import { Apiz } from "../../src/index.js";
import { MOCK_BASE_URL, TEST_API_KEY, withMockBackend } from "../helpers/mockBackend.js";

describe("tools resource — contract", () => {
  withMockBackend();

  function makeClient(): Apiz {
    return new Apiz({ apiKey: TEST_API_KEY, baseURL: MOCK_BASE_URL });
  }

  it("parseVideo() returns video_url + platform metadata", async () => {
    const client = makeClient();
    const r = await client.tools.parseVideo("https://v.douyin.com/example");
    expect(r.platform).toBeDefined();
    expect(r.video_url).toMatch(/^https?:\/\//);
  });

  it("transferUrl() returns CDN url and original_url echoes input", async () => {
    const client = makeClient();
    const r = await client.tools.transferUrl("https://example.com/external/image.png");
    expect(r.cdn_url).toMatch(/^https?:\/\//);
    expect(r.original_url).toBe("https://example.com/external/image.png");
  });
});
