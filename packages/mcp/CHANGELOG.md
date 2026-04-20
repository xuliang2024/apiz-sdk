# apiz-mcp

## 0.2.0

### Minor Changes

- 13571c4: Add forced-alignment support across all SDK products:
  - **`apiz-sdk`** (TypeScript): new `client.align(params)` helper, low-level
    `client.captioning.create()` resource, and `AlignParams` / `AlignResult` /
    `AlignWord` / `AlignUtterance` / `AlignMode` types.
  - **`apiz-mcp`**: new `align` tool exposing the same functionality to MCP
    clients (Cursor, Claude Desktop, Cline). The total number of MCP tools goes
    from 8 → 9.

  Both wrap the new `volcengine/captioning/ata-{speech,singing}` backend models,
  which take "audio + known subtitle/lyric text" and return per-word millisecond
  timestamps. Use cases: subtitle authoring, karaoke timing, dub-track
  synchronization. Pricing is 10 credits/minute, billed at a 1-minute minimum.

### Patch Changes

- Updated dependencies [13571c4]
  - apiz-sdk@0.2.0
