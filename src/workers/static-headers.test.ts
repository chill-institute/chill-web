import { readFileSync } from "node:fs";
import { describe, expect, it } from "vite-plus/test";

const staticHeaders = readFileSync(new URL("../../public/_headers", import.meta.url), "utf8");

function headersFor(path: string) {
  const headers: Record<string, string> = {};
  let inRule = false;
  for (const line of staticHeaders.split("\n")) {
    if (!line.trim() || line.trimStart().startsWith("#")) continue;
    if (!/^\s/.test(line)) {
      inRule = line.trim() === path;
      continue;
    }
    if (!inRule) continue;
    const separator = line.indexOf(":");
    headers[line.slice(0, separator).trim().toLowerCase()] = line.slice(separator + 1).trim();
  }
  return headers;
}

describe("Cloudflare static response headers", () => {
  it("hardens browser navigation and preserves immutable asset caching", () => {
    expect(headersFor("/*")).toMatchObject({
      "permissions-policy": "camera=(), geolocation=(), microphone=()",
      "referrer-policy": "strict-origin-when-cross-origin",
      "x-content-type-options": "nosniff",
      "x-frame-options": "DENY",
    });
    expect(headersFor("/assets/*")).toMatchObject({
      "cache-control": "public, max-age=31536000, immutable",
      "x-content-type-options": "nosniff",
    });
  });
});
