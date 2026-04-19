/**
 * Live E2E suite — only runs when APIZ_TEST_API_KEY is set in the env. Hits
 * https://api.apiz.ai with the provided test key. Stays within the
 * "free + ≤ 0.1 yuan" whitelist documented in tests/fixtures/README.md.
 */

import { describe, it, expect } from "vitest";
import { Apiz, ApizError } from "../../src/index.js";

const apiKey = process.env.APIZ_TEST_API_KEY;
const haveKey = typeof apiKey === "string" && apiKey.length > 10;

describe.skipIf(!haveKey)("live E2E (api.apiz.ai)", () => {
  function makeClient(): Apiz {
    return new Apiz({ apiKey, baseURL: process.env.APIZ_BASE_URL ?? "https://api.apiz.ai" });
  }

  it("account.balance() returns numeric balance", async () => {
    const client = makeClient();
    const b = await client.account.balance();
    expect(typeof b.balance).toBe("number");
    expect(b.balance).toBeGreaterThanOrEqual(0);
  });

  it("account.checkin() does not throw (success or already-checked-in is fine)", async () => {
    const client = makeClient();
    const r = await client.account.checkin();
    expect(typeof r.success).toBe("boolean");
  });

  it("models.list() returns at least one model", async () => {
    const client = makeClient();
    const models = await client.models.list({ category: "image" });
    expect(models.length).toBeGreaterThan(0);
    expect(models[0]?.id).toBeDefined();
  });

  it("models.docs() returns a tutorial for jimeng-4.5", async () => {
    const client = makeClient();
    const docs = await client.models.docs("jimeng-4.5", { lang: "en" });
    expect(typeof docs.tutorial).toBe("string");
  });

  it("voices.list() returns the public voices catalogue", async () => {
    const client = makeClient();
    const r = await client.voices.list();
    expect(r.statistics.public_voices_count).toBeGreaterThan(0);
  });

  it("skills.list() returns at least one skill", async () => {
    const client = makeClient();
    const skills = await client.skills.list();
    expect(skills.length).toBeGreaterThan(0);
  });

  it(
    "tools.parseVideo() handles a public Douyin URL",
    async () => {
      const client = makeClient();
      try {
        const r = await client.tools.parseVideo("https://v.douyin.com/iJqPAfre/");
        expect(r.video_url).toMatch(/^https?:\/\//);
      } catch (err) {
        // Tolerate transient parse failures from upstream.
        expect(err).toBeInstanceOf(ApizError);
      }
    },
    30_000,
  );

  it(
    "generate() with jimeng-4.5 produces a single image (≤ 0.1 yuan)",
    async () => {
      const client = makeClient();
      const result = await client.generate({
        model: "jimeng-4.5",
        prompt: "a small grayscale cat sketch, simple",
      });
      expect((result as { status: string }).status).toBe("completed");
    },
    120_000,
  );

  it(
    "speak() short text with speech-2.8-turbo (≤ 0.1 yuan)",
    async () => {
      const client = makeClient();
      const r = await client.speak("hello", { model: "speech-2.8-turbo" });
      expect(r.audio_url).toMatch(/^https?:\/\//);
    },
    120_000,
  );
});
