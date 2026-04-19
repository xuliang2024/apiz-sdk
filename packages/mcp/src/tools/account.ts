import type { Apiz } from "apiz-sdk";
import type { ToolHandler } from "./index.js";

export const accountTool: ToolHandler = {
  descriptor: {
    name: "account",
    description: "Account management: balance, daily check-in, packages, payment links.",
    inputSchema: {
      type: "object",
      properties: {
        action: {
          type: "string",
          enum: ["balance", "checkin", "packages", "pay"],
          default: "balance",
        },
        package_id: { type: "integer", description: "Required when action=pay" },
      },
    },
  },
  async call(client: Apiz, args: Record<string, unknown>): Promise<unknown> {
    const action = typeof args.action === "string" ? args.action : "balance";
    switch (action) {
      case "checkin":
        return await client.account.checkin();
      case "packages":
        return await client.account.packages();
      case "pay": {
        const id = typeof args.package_id === "number" ? args.package_id : Number(args.package_id);
        if (!Number.isFinite(id)) {
          throw new Error("account: action=pay requires a numeric package_id");
        }
        return await client.account.pay(id);
      }
      case "balance":
      default:
        return await client.account.balance();
    }
  },
};
