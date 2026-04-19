import { describe, it, expect } from "vitest";
import { Apiz } from "../../src/index.js";
import { MOCK_BASE_URL, TEST_API_KEY, withMockBackend } from "../helpers/mockBackend.js";

describe("skills resource — contract", () => {
  withMockBackend();

  function makeClient(): Apiz {
    return new Apiz({ apiKey: TEST_API_KEY, baseURL: MOCK_BASE_URL });
  }

  it("list() returns skill summaries", async () => {
    const client = makeClient();
    const skills = await client.skills.list();
    expect(Array.isArray(skills)).toBe(true);
    expect(skills.length).toBeGreaterThan(0);
    expect(skills[0]?.id).toBeDefined();
  });
});
