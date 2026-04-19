import { http, HttpResponse, type RequestHandler } from "msw";
import { setupServer, type SetupServerApi } from "msw/node";
import { afterAll, afterEach, beforeAll } from "vitest";
import { loadFixture } from "./loadFixture.js";

export const MOCK_BASE_URL = "https://mock.api.apiz.ai";

/** Build a full URL pattern for the mock backend. */
export const url = (path: string): string => `${MOCK_BASE_URL}${path}`;

/** Reply with a tracked-fixture JSON document at the given status. */
export function fixtureResponse(relPath: string, status = 200): Response {
  const body = loadFixture(relPath);
  return HttpResponse.json(body, { status });
}

/** Convenient assertion: the request must carry our test bearer token. */
export const TEST_API_KEY = "sk-mock-test-not-real-0000000000000000000000";

/** Default handlers used by most contract tests. */
export const defaultHandlers: RequestHandler[] = [
  http.get(url("/api/v3/balance"), () => fixtureResponse("http/GET__v3_balance.json")),
  http.post(url("/api/v3/checkin"), () =>
    fixtureResponse("http/POST__v3_checkin__success.json"),
  ),
  http.get(url("/api/v3/mcp/models"), () =>
    fixtureResponse("http/GET__v3_mcp_models.json"),
  ),
  http.get(url("/api/v3/mcp/models/fal-ai/flux-2/flash"), () =>
    fixtureResponse("http/GET__v3_mcp_models__flux2flash.json"),
  ),
  http.get(url("/api/v3/models/fal-ai/flux-2/flash/docs"), () =>
    fixtureResponse("http/GET__v3_models_docs.json"),
  ),
  http.post(url("/api/v3/tasks/create"), async ({ request }) => {
    const body = (await request.json()) as { model?: string };
    if (body.model === "jimeng-4.5") {
      return fixtureResponse("http/POST__v3_tasks_create__sync.json");
    }
    return fixtureResponse("http/POST__v3_tasks_create__async.json");
  }),
  http.post(url("/api/v3/tasks/query"), () =>
    fixtureResponse("http/POST__v3_tasks_query__pending.json"),
  ),
  http.post(url("/api/v3/minimax/voices"), () =>
    fixtureResponse("http/POST__v3_minimax_voices.json"),
  ),
  http.post(url("/api/v3/minimax/t2a"), () =>
    fixtureResponse("http/POST__v3_minimax_t2a.json"),
  ),
  http.get(url("/api/v3/mcp/skills"), () =>
    fixtureResponse("http/GET__v3_mcp_skills.json"),
  ),
  http.post(url("/api/v3/tools/parse-video"), () =>
    fixtureResponse("http/POST__v3_tools_parse_video.json"),
  ),
  http.post(url("/api/v3/tools/transfer-url"), () =>
    fixtureResponse("http/POST__v3_tools_transfer_url.json"),
  ),
];

/**
 * MUST be called at the top level of a `describe` block (not inside `it`).
 * Returns the server instance; use `server.use(...handlers)` inside `it`
 * to override responses for individual scenarios.
 */
export function withMockBackend(handlers: RequestHandler[] = defaultHandlers): SetupServerApi {
  const server = setupServer(...handlers);
  beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
  afterEach(() => server.resetHandlers(...handlers));
  afterAll(() => server.close());
  return server;
}

export { http, HttpResponse, type RequestHandler };
