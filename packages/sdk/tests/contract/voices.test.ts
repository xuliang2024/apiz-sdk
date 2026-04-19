import { describe, it, expect } from "vitest";
import { Apiz } from "../../src/index.js";
import { MOCK_BASE_URL, TEST_API_KEY, withMockBackend } from "../helpers/mockBackend.js";

describe("voices resource — contract", () => {
  withMockBackend();

  function makeClient(): Apiz {
    return new Apiz({ apiKey: TEST_API_KEY, baseURL: MOCK_BASE_URL });
  }

  it("list() returns user + public voices and statistics", async () => {
    const client = makeClient();
    const result = await client.voices.list();
    expect(Array.isArray(result.user_voices)).toBe(true);
    expect(Array.isArray(result.public_voices)).toBe(true);
    expect(result.statistics.public_voices_count).toBeGreaterThan(0);
  });

  it("synthesize() returns audio_url and duration", async () => {
    const client = makeClient();
    const r = await client.voices.synthesize({
      text: "你好世界",
      voice_id: "male-qn-qingse",
      model: "speech-2.8-turbo",
    });
    expect(r.audio_url).toMatch(/^https?:\/\//);
    expect(typeof r.duration === "number" || r.duration === undefined).toBe(true);
  });
});
