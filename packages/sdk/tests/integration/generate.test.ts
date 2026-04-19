import { describe, it, expect } from "vitest";
import { Apiz } from "../../src/index.js";
import {
  MOCK_BASE_URL,
  TEST_API_KEY,
  http,
  url,
  withMockBackend,
  fixtureResponse,
} from "../helpers/mockBackend.js";

describe("generate() helper — integration", () => {
  const server = withMockBackend();

  function makeClient(): Apiz {
    return new Apiz({ apiKey: TEST_API_KEY, baseURL: MOCK_BASE_URL, maxRetries: 0 });
  }

  it("sync model returns inline result without polling", async () => {
    let queryCalls = 0;
    server.use(
      http.post(url("/api/v3/tasks/query"), () => {
        queryCalls += 1;
        return fixtureResponse("http/POST__v3_tasks_query__completed.json");
      }),
    );

    const client = makeClient();
    const result = await client.generate({ model: "jimeng-4.5", prompt: "ink painting" });
    expect((result as { status: string }).status).toBe("completed");
    expect(queryCalls).toBe(0);
  });

  it("async model polls until completed", async () => {
    let queryCalls = 0;
    server.use(
      http.post(url("/api/v3/tasks/query"), () => {
        queryCalls += 1;
        if (queryCalls < 2)
          return fixtureResponse("http/POST__v3_tasks_query__processing.json");
        return fixtureResponse("http/POST__v3_tasks_query__completed.json");
      }),
    );

    const client = makeClient();
    const result = await client.generate({
      model: "wan/v2.6/image-to-video",
      prompt: "x",
      pollInterval: 1,
    });
    expect((result as { status: string }).status).toBe("completed");
    expect(queryCalls).toBeGreaterThanOrEqual(2);
  });

  it("forwards image_url / aspect_ratio / duration into params", async () => {
    let captured: unknown = null;
    server.use(
      http.post(url("/api/v3/tasks/create"), async ({ request }) => {
        captured = await request.json();
        return fixtureResponse("http/POST__v3_tasks_create__sync.json");
      }),
    );

    const client = makeClient();
    await client.generate({
      model: "wan/v2.6/image-to-video",
      prompt: "go",
      image_url: "https://x",
      duration: 5,
      aspect_ratio: "16:9",
    });
    const body = captured as { model: string; params: Record<string, unknown> };
    expect(body.params.prompt).toBe("go");
    expect(body.params.image_url).toBe("https://x");
    expect(body.params.duration).toBe(5);
    expect(body.params.aspect_ratio).toBe("16:9");
  });
});
