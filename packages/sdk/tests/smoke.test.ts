import { describe, it, expect } from "vitest";
import { Apiz, VERSION } from "../src/index.js";

describe("@apiz/sdk smoke", () => {
  it("exports a VERSION string", () => {
    expect(VERSION).toMatch(/^\d+\.\d+\.\d+/);
  });

  it("can construct an Apiz client with defaults", () => {
    const client = new Apiz({ apiKey: "sk-test-placeholder-not-real" });
    expect(client.baseURL).toBe("https://api.apiz.ai");
    expect(client.timeout).toBe(60_000);
  });

  it("respects custom baseURL", () => {
    const client = new Apiz({ baseURL: "https://test-ts-api.fyshark.com" });
    expect(client.baseURL).toBe("https://test-ts-api.fyshark.com");
  });
});
