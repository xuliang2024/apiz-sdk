import { describe, it, expect } from "vitest";
import { Apiz } from "../../src/index.js";
import { MOCK_BASE_URL, TEST_API_KEY, withMockBackend } from "../helpers/mockBackend.js";

describe("speak() helper — integration", () => {
  withMockBackend();

  function makeClient(): Apiz {
    return new Apiz({ apiKey: TEST_API_KEY, baseURL: MOCK_BASE_URL });
  }

  it("with explicit voice_id returns audio_url", async () => {
    const client = makeClient();
    const r = await client.speak("你好世界", { voice_id: "male-qn-qingse" });
    expect(r.audio_url).toMatch(/^https?:\/\//);
  });

  it("without voice_id picks a default from voices.list()", async () => {
    const client = makeClient();
    const r = await client.speak("hi");
    expect(r.audio_url).toMatch(/^https?:\/\//);
  });
});
