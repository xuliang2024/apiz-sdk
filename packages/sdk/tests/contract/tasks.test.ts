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

describe("tasks resource — contract", () => {
  const server = withMockBackend();

  function makeClient(): Apiz {
    return new Apiz({ apiKey: TEST_API_KEY, baseURL: MOCK_BASE_URL, maxRetries: 0 });
  }

  it("create() POSTs to /v3/tasks/create with model + params + null channel", async () => {
    const client = makeClient();
    const task = await client.tasks.create({
      model: "wan/v2.6/image-to-video",
      params: { prompt: "camera zooms in", image_url: "https://x" },
    });
    expect(task.task_id).toBe("task_async_demo_001");
    expect(task.status).toBe("pending");
  });

  it("create() with sync-channel model returns inline result", async () => {
    const client = makeClient();
    const task = await client.tasks.create({
      model: "jimeng-4.5",
      params: { prompt: "ink painting" },
    });
    expect(task.status).toBe("completed");
    expect(task.result).toBeDefined();
  });

  it("query() POSTs task_id and returns current status", async () => {
    const client = makeClient();
    const status = await client.tasks.query("task_async_demo_001");
    expect(status.task_id).toBe("task_async_demo_001");
    expect(["pending", "processing", "completed", "failed"]).toContain(status.status);
  });

  it("create() forwards Authorization Bearer header", async () => {
    let capturedAuth: string | null = null;
    server.use(
      http.post(url("/api/v3/tasks/create"), ({ request }) => {
        capturedAuth = request.headers.get("authorization");
        return fixtureResponse("http/POST__v3_tasks_create__async.json");
      }),
    );

    const client = makeClient();
    await client.tasks.create({ model: "fal-ai/flux-2/flash", params: { prompt: "x" } });
    expect(capturedAuth).toBe(`Bearer ${TEST_API_KEY}`);
  });

  it("waitFor() polls until status is completed", async () => {
    let calls = 0;
    server.use(
      http.post(url("/api/v3/tasks/query"), () => {
        calls += 1;
        if (calls === 1) return fixtureResponse("http/POST__v3_tasks_query__pending.json");
        if (calls === 2) return fixtureResponse("http/POST__v3_tasks_query__processing.json");
        return fixtureResponse("http/POST__v3_tasks_query__completed.json");
      }),
    );

    const client = makeClient();
    const result = await client.tasks.waitFor("task_async_demo_001", { pollInterval: 1 });
    expect(result.status).toBe("completed");
    expect(calls).toBeGreaterThanOrEqual(2);
  });

  it("waitFor() throws on failed status", async () => {
    server.use(
      http.post(url("/api/v3/tasks/query"), () =>
        fixtureResponse("http/POST__v3_tasks_query__failed.json"),
      ),
    );

    const client = makeClient();
    await expect(client.tasks.waitFor("task_async_demo_001", { pollInterval: 1 })).rejects.toThrow(
      /failed|task_async_demo_001|Upstream/i,
    );
  });

  it("waitFor() respects timeout option", async () => {
    server.use(
      http.post(url("/api/v3/tasks/query"), () =>
        fixtureResponse("http/POST__v3_tasks_query__pending.json"),
      ),
    );

    const client = makeClient();
    await expect(
      client.tasks.waitFor("task_async_demo_001", { pollInterval: 10, timeout: 5 }),
    ).rejects.toThrow(/timed out|timeout/i);
  });

  it("waitFor() invokes onProgress for each poll", async () => {
    let calls = 0;
    server.use(
      http.post(url("/api/v3/tasks/query"), () => {
        calls += 1;
        if (calls < 3) return fixtureResponse("http/POST__v3_tasks_query__processing.json");
        return fixtureResponse("http/POST__v3_tasks_query__completed.json");
      }),
    );

    const client = makeClient();
    const observed: string[] = [];
    await client.tasks.waitFor("task_async_demo_001", {
      pollInterval: 1,
      onProgress: (status) => observed.push(status.status),
    });
    expect(observed.length).toBeGreaterThanOrEqual(2);
    expect(observed[observed.length - 1]).toBe("completed");
  });
});
