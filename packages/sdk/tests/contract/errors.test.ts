import { describe, it, expect } from "vitest";
import {
  Apiz,
  ApizAuthenticationError,
  ApizError,
  ApizInsufficientBalanceError,
  ApizNotFoundError,
  ApizRateLimitError,
  ApizServerError,
  ApizValidationError,
  errorFromStatus,
} from "../../src/index.js";
import {
  MOCK_BASE_URL,
  TEST_API_KEY,
  http,
  url,
  withMockBackend,
  fixtureResponse,
} from "../helpers/mockBackend.js";

describe("errorFromStatus()", () => {
  it("401 → ApizAuthenticationError", () => {
    expect(errorFromStatus(401, "x")).toBeInstanceOf(ApizAuthenticationError);
  });
  it("402 → ApizInsufficientBalanceError", () => {
    expect(errorFromStatus(402, "x")).toBeInstanceOf(ApizInsufficientBalanceError);
  });
  it("404 → ApizNotFoundError", () => {
    expect(errorFromStatus(404, "x")).toBeInstanceOf(ApizNotFoundError);
  });
  it("422 → ApizValidationError", () => {
    expect(errorFromStatus(422, "x")).toBeInstanceOf(ApizValidationError);
  });
  it("429 → ApizRateLimitError", () => {
    expect(errorFromStatus(429, "x")).toBeInstanceOf(ApizRateLimitError);
  });
  it("500 → ApizServerError", () => {
    expect(errorFromStatus(500, "x")).toBeInstanceOf(ApizServerError);
  });
  it("base error retains status and detail", () => {
    const e = errorFromStatus(403, "forbidden", { detail: { code: "E_PERM" } });
    expect(e.status).toBe(403);
    expect(e.detail).toEqual({ code: "E_PERM" });
    expect(e).toBeInstanceOf(ApizError);
  });
});

describe("HTTP error mapping (live wire)", () => {
  const server = withMockBackend();

  function makeClient(): Apiz {
    return new Apiz({ apiKey: TEST_API_KEY, baseURL: MOCK_BASE_URL, maxRetries: 0 });
  }

  it("401 response → ApizAuthenticationError", async () => {
    server.use(
      http.get(url("/api/v3/balance"), () =>
        fixtureResponse("errors/401_unauthorized.json", 401),
      ),
    );
    const client = makeClient();
    await expect(client.account.balance()).rejects.toBeInstanceOf(ApizAuthenticationError);
  });

  it("402 response → ApizInsufficientBalanceError", async () => {
    server.use(
      http.post(url("/api/v3/tasks/create"), () =>
        fixtureResponse("errors/402_insufficient_balance.json", 402),
      ),
    );
    const client = makeClient();
    await expect(
      client.tasks.create({ model: "wan/v2.6/image-to-video", params: { prompt: "x" } }),
    ).rejects.toBeInstanceOf(ApizInsufficientBalanceError);
  });

  it("422 response → ApizValidationError carrying schema in detail", async () => {
    server.use(
      http.post(url("/api/v3/tasks/create"), () =>
        fixtureResponse("errors/422_validation_error.json", 422),
      ),
    );
    const client = makeClient();
    try {
      await client.tasks.create({ model: "fal-ai/flux-2/flash", params: {} });
      throw new Error("expected ApizValidationError to be thrown");
    } catch (err) {
      expect(err).toBeInstanceOf(ApizValidationError);
      const e = err as ApizValidationError;
      expect(e.status).toBe(422);
      expect(e.detail).toBeDefined();
    }
  });

  it("500 response → ApizServerError (after retries exhausted)", async () => {
    server.use(
      http.get(url("/api/v3/balance"), () =>
        fixtureResponse("errors/500_server_error.json", 500),
      ),
    );
    const client = new Apiz({ apiKey: TEST_API_KEY, baseURL: MOCK_BASE_URL, maxRetries: 0 });
    await expect(client.account.balance()).rejects.toBeInstanceOf(ApizServerError);
  });
});
