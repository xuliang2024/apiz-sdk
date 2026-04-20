import { describe, expect, it } from "vitest";
import { http } from "msw";
import { Apiz, parseAlignResult } from "../../src/index.js";
import type { TaskQueryResponse } from "../../src/types.js";
import {
  fixtureResponse,
  MOCK_BASE_URL,
  TEST_API_KEY,
  url,
  withMockBackend,
} from "../helpers/mockBackend.js";

const SPEECH_MODEL = "volcengine/captioning/ata-speech";
const SINGING_MODEL = "volcengine/captioning/ata-singing";
const TEST_AUDIO_URL =
  "https://fal-task-hk.tos-cn-hongkong.volces.com/transfer/audio/2026/04/20/619fa17492bf40079afe2ee5e43aa42b.mp3";
const TEST_AUDIO_TEXT =
  "如果您没有其他需要举报的话，这边就先挂断了。祝您生活愉快，再见。";

// Use a focused handler list (not defaultHandlers) so that the captioning
// fixtures are the only thing the mock backend serves for /tasks/*.
const captioningHandlers = [
  http.post(url("/api/v3/tasks/create"), () =>
    fixtureResponse("http/POST__v3_tasks_create__captioning.json"),
  ),
  http.post(url("/api/v3/tasks/query"), () =>
    fixtureResponse("http/POST__v3_tasks_query__captioning_completed.json"),
  ),
];

describe("captioning resource — contract", () => {
  withMockBackend(captioningHandlers);

  function makeClient(): Apiz {
    return new Apiz({ apiKey: TEST_API_KEY, baseURL: MOCK_BASE_URL });
  }

  it("captioning.modelFor() picks the right backend model id", () => {
    const c = makeClient();
    expect(c.captioning.modelFor("speech")).toBe(SPEECH_MODEL);
    expect(c.captioning.modelFor("singing")).toBe(SINGING_MODEL);
    expect(c.captioning.modelFor(undefined)).toBe(SPEECH_MODEL);
  });

  it("captioning.create() submits to /tasks/create and returns task_id + price", async () => {
    const c = makeClient();
    const r = await c.captioning.create({
      audio_url: TEST_AUDIO_URL,
      audio_text: TEST_AUDIO_TEXT,
      mode: "speech",
    });
    expect(r.task_id).toBe("task_volc_ata_001");
    expect(r.price).toBe(10);
    expect(r.model).toBe(SPEECH_MODEL);
  });

  it("client.align() returns structured AlignResult with utterances + word timestamps", async () => {
    const c = makeClient();
    const r = await c.align(
      {
        audio_url: TEST_AUDIO_URL,
        audio_text: TEST_AUDIO_TEXT,
        mode: "speech",
      },
      { pollInterval: 10, timeout: 5_000 },
    );

    // Top-level shape
    expect(r.duration).toBe(5.503);
    expect(r.task_id).toBe("task_volc_ata_001");
    expect(Array.isArray(r.utterances)).toBe(true);
    expect(r.utterances).toHaveLength(3);

    // Utterance breakdown matches the recorded fixture
    expect(r.utterances[0].text).toBe("如果您没有其他需要举报的话");
    expect(r.utterances[0].words).toHaveLength(13);
    expect(r.utterances[1].text).toBe("这边就先挂断了");
    expect(r.utterances[1].words).toHaveLength(7);
    expect(r.utterances[2].text).toBe("祝您生活愉快，再见");
    expect(r.utterances[2].words).toHaveLength(9);

    // Word-level timestamps are millisecond integers and within audio length
    for (const u of r.utterances) {
      let lastEnd = -1;
      for (const w of u.words) {
        expect(typeof w.start_time).toBe("number");
        expect(typeof w.end_time).toBe("number");
        expect(w.end_time).toBeGreaterThanOrEqual(w.start_time);
        expect(w.end_time).toBeLessThanOrEqual(5510); // duration_ms + small tolerance
        expect(w.start_time).toBeGreaterThanOrEqual(lastEnd - 1);
        lastEnd = Math.max(lastEnd, w.end_time);
      }
    }
  });

  it("parseAlignResult() handles a synthetic completed response", () => {
    const fake: TaskQueryResponse = {
      task_id: "task_x",
      status: "completed",
      result: {
        duration: 1.0,
        utterances: [
          { text: "你好", start_time: 0, end_time: 500, words: [{ text: "你", start_time: 0, end_time: 250 }] },
        ],
      },
    } as unknown as TaskQueryResponse;
    const r = parseAlignResult(fake);
    expect(r.duration).toBe(1.0);
    expect(r.utterances[0].text).toBe("你好");
    expect(r.task_id).toBe("task_x");
  });
});
