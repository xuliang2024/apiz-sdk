import type { Apiz } from "apiz-sdk";
import type { ToolHandler } from "./index.js";

export const getResultTool: ToolHandler = {
  descriptor: {
    name: "get_result",
    description: "Query a task by id (returns current status). Used to poll async generations.",
    inputSchema: {
      type: "object",
      required: ["task_id"],
      properties: {
        task_id: { type: "string", description: "Task id returned by `generate`" },
      },
    },
  },
  async call(client: Apiz, args: Record<string, unknown>): Promise<unknown> {
    return await client.tasks.query(String(args.task_id));
  },
};
