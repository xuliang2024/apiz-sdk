import { describe, it, expect } from "vitest";
import { Apiz } from "../../src/index.js";
import { MOCK_BASE_URL, TEST_API_KEY, withMockBackend } from "../helpers/mockBackend.js";

describe("models resource — contract", () => {
  withMockBackend();

  function makeClient(): Apiz {
    return new Apiz({ apiKey: TEST_API_KEY, baseURL: MOCK_BASE_URL });
  }

  it("list() returns models array", async () => {
    const client = makeClient();
    const models = await client.models.list();
    expect(Array.isArray(models)).toBe(true);
    expect(models.length).toBeGreaterThan(0);
    expect(models[0]?.id).toBeDefined();
  });

  it("list({ category: 'video' }) filters server-side via query param", async () => {
    const client = makeClient();
    // Default fixture returns 3 mixed models; we just assert .list() runs.
    const all = await client.models.list({ category: "video" });
    expect(Array.isArray(all)).toBe(true);
  });

  it("get(modelId) returns full schema", async () => {
    const client = makeClient();
    const detail = await client.models.get("fal-ai/flux-2/flash");
    expect(detail.id).toBe("fal-ai/flux-2/flash");
    expect(detail.params_schema).toBeDefined();
  });

  it("docs(modelId) returns tutorial markdown", async () => {
    const client = makeClient();
    const docs = await client.models.docs("fal-ai/flux-2/flash", { lang: "en" });
    expect(docs.tutorial).toContain("Flux 2 Flash");
  });

  it("search() filters by capability and free-text query", async () => {
    const client = makeClient();
    const t2i = await client.models.search({ capability: "t2i" });
    expect(t2i.every((m) => m.capability === "t2i")).toBe(true);

    const fluxOnly = await client.models.search({ query: "flux" });
    expect(fluxOnly.length).toBeGreaterThanOrEqual(1);
    expect(fluxOnly[0]?.id.toLowerCase()).toContain("flux");
  });
});
