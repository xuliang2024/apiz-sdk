import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { Apiz } from "../../src/index.js";

describe("client config & env vars", () => {
  let saved: Record<string, string | undefined> = {};

  beforeEach(() => {
    saved = {
      APIZ_API_KEY: process.env.APIZ_API_KEY,
      APIZ_BASE_URL: process.env.APIZ_BASE_URL,
      APIZ_TIMEOUT: process.env.APIZ_TIMEOUT,
      XSKILL_API_KEY: process.env.XSKILL_API_KEY,
    };
    delete process.env.APIZ_API_KEY;
    delete process.env.APIZ_BASE_URL;
    delete process.env.APIZ_TIMEOUT;
    delete process.env.XSKILL_API_KEY;
  });

  afterEach(() => {
    for (const [k, v] of Object.entries(saved)) {
      if (v === undefined) delete process.env[k];
      else process.env[k] = v;
    }
  });

  it("constructor option > env > default for apiKey", () => {
    expect(new Apiz({ apiKey: "sk-explicit-not-real" }).apiKey).toBe("sk-explicit-not-real");

    process.env.APIZ_API_KEY = "sk-from-apiz-env-not-real";
    expect(new Apiz().apiKey).toBe("sk-from-apiz-env-not-real");

    delete process.env.APIZ_API_KEY;
    process.env.XSKILL_API_KEY = "sk-from-xskill-env-not-real";
    expect(new Apiz().apiKey).toBe("sk-from-xskill-env-not-real");

    delete process.env.XSKILL_API_KEY;
    expect(new Apiz().apiKey).toBe("");
  });

  it("default baseURL is https://api.apiz.ai", () => {
    expect(new Apiz().baseURL).toBe("https://api.apiz.ai");
  });

  it("APIZ_BASE_URL env overrides default", () => {
    process.env.APIZ_BASE_URL = "https://test-ts-api.fyshark.com";
    expect(new Apiz().baseURL).toBe("https://test-ts-api.fyshark.com");
  });

  it("trailing slash in baseURL is stripped", () => {
    expect(new Apiz({ baseURL: "https://x.example.com/" }).baseURL).toBe("https://x.example.com");
  });

  it("default timeout is 60000ms", () => {
    expect(new Apiz().timeout).toBe(60_000);
  });

  it("APIZ_TIMEOUT env overrides default", () => {
    process.env.APIZ_TIMEOUT = "12345";
    expect(new Apiz().timeout).toBe(12_345);
  });
});
