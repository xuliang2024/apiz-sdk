import { describe, it, expect } from "vitest";
import { Apiz, ApizConnectionError, ApizTimeoutError } from "../../src/index.js";
import {
  MOCK_BASE_URL,
  TEST_API_KEY,
  http,
  url,
  withMockBackend,
  HttpResponse,
} from "../helpers/mockBackend.js";

describe("HTTP layer — contract", () => {
  const server = withMockBackend();

  function makeClient(opts: Partial<ConstructorParameters<typeof Apiz>[0]> = {}): Apiz {
    return new Apiz({ apiKey: TEST_API_KEY, baseURL: MOCK_BASE_URL, ...opts });
  }

  it("attaches Authorization Bearer header to authed requests", async () => {
    let auth: string | null = null;
    server.use(
      http.get(url("/api/v3/balance"), ({ request }) => {
        auth = request.headers.get("authorization");
        return HttpResponse.json({
          code: 200,
          data: { user_id: 1, balance: 1, balance_yuan: 0.01, vip_level: 0 },
        });
      }),
    );

    const client = makeClient();
    await client.account.balance();
    expect(auth).toBe(`Bearer ${TEST_API_KEY}`);
  });

  it("retries on 5xx then succeeds", async () => {
    let calls = 0;
    server.use(
      http.get(url("/api/v3/balance"), () => {
        calls += 1;
        if (calls < 2) {
          return new HttpResponse(JSON.stringify({ code: 500, detail: "transient" }), {
            status: 500,
          });
        }
        return HttpResponse.json({
          code: 200,
          data: { user_id: 1, balance: 100, balance_yuan: 1, vip_level: 0 },
        });
      }),
    );

    const client = makeClient({ maxRetries: 3 });
    const b = await client.account.balance();
    expect(calls).toBeGreaterThanOrEqual(2);
    expect(b.balance).toBe(100);
  });

  it("does NOT retry on 4xx", async () => {
    let calls = 0;
    server.use(
      http.get(url("/api/v3/balance"), () => {
        calls += 1;
        return new HttpResponse(JSON.stringify({ code: 401, detail: "nope" }), { status: 401 });
      }),
    );

    const client = makeClient({ maxRetries: 5 });
    await expect(client.account.balance()).rejects.toThrow();
    expect(calls).toBe(1);
  });

  it("times out via ApizTimeoutError when server hangs past `timeout`", async () => {
    server.use(
      http.get(url("/api/v3/balance"), async () => {
        await new Promise((r) => setTimeout(r, 200));
        return HttpResponse.json({ code: 200, data: {} });
      }),
    );

    const client = makeClient({ timeout: 20, maxRetries: 0 });
    await expect(client.account.balance()).rejects.toBeInstanceOf(ApizTimeoutError);
  });

  it("network failure → ApizConnectionError", async () => {
    server.use(http.get(url("/api/v3/balance"), () => HttpResponse.error()));

    const client = makeClient({ maxRetries: 0 });
    await expect(client.account.balance()).rejects.toBeInstanceOf(ApizConnectionError);
  });
});
