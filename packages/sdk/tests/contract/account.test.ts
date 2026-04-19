import { describe, it, expect } from "vitest";
import { Apiz } from "../../src/index.js";
import {
  MOCK_BASE_URL,
  TEST_API_KEY,
  fixtureResponse,
  http,
  url,
  withMockBackend,
} from "../helpers/mockBackend.js";

describe("account resource — contract", () => {
  const server = withMockBackend();

  function makeClient(): Apiz {
    return new Apiz({ apiKey: TEST_API_KEY, baseURL: MOCK_BASE_URL, maxRetries: 0 });
  }

  it("balance() returns user_id, balance and balance_yuan", async () => {
    const client = makeClient();
    const b = await client.account.balance();
    expect(typeof b.user_id).toBe("number");
    expect(typeof b.balance).toBe("number");
    expect(typeof b.balance_yuan).toBe("number");
  });

  it("checkin() returns success on first call", async () => {
    const client = makeClient();
    const r = await client.account.checkin();
    expect(r.success).toBe(true);
    expect(r.points_awarded).toBeGreaterThan(0);
  });

  it("checkin() handles already-checked-in case", async () => {
    server.use(
      http.post(url("/api/v3/checkin"), () =>
        fixtureResponse("http/POST__v3_checkin__already.json"),
      ),
    );
    const client = makeClient();
    const r = await client.account.checkin();
    expect(r.success).toBe(false);
    expect(r.already_checked_in).toBe(true);
  });
});
