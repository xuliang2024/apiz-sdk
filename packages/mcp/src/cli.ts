/**
 * stdio entry point for `npx apiz-mcp`. Reads API key from APIZ_API_KEY
 * (or XSKILL_API_KEY) and serves the 8 apiz tools over stdio.
 */

import { runStdio } from "./server.js";

async function main(): Promise<void> {
  await runStdio();
}

main().catch((err: unknown) => {
  const msg = err instanceof Error ? err.stack ?? err.message : String(err);
  process.stderr.write(`apiz-mcp: fatal error: ${msg}\n`);
  process.exit(1);
});
