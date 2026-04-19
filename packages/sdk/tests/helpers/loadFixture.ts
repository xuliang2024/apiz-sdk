import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));

/** Resolve a fixture path relative to sdk/tests/fixtures/. */
export function fixturePath(relPath: string): string {
  return resolve(here, "..", "..", "..", "..", "tests", "fixtures", relPath);
}

/** Load and parse a JSON fixture from sdk/tests/fixtures/. */
export function loadFixture<T = unknown>(relPath: string): T {
  const path = fixturePath(relPath);
  const raw = readFileSync(path, "utf-8");
  return JSON.parse(raw) as T;
}

/** Load a plain text fixture. */
export function loadTextFixture(relPath: string): string {
  return readFileSync(fixturePath(relPath), "utf-8").trim();
}
