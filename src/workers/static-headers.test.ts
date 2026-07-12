import { readFileSync } from "node:fs";
import { describe, expect, it } from "vite-plus/test";

const staticHeaders = readFileSync(new URL("../../public/_headers", import.meta.url), "utf8");

describe("Cloudflare static response headers", () => {
  it("hardens browser navigation and preserves immutable asset caching", () => {
    expect(staticHeaders).toContain(`/*
  Permissions-Policy: camera=(), geolocation=(), microphone=()
  Referrer-Policy: strict-origin-when-cross-origin
  X-Content-Type-Options: nosniff
  X-Frame-Options: DENY`);
    expect(staticHeaders).toContain(`/assets/*
  Cache-Control: public, max-age=31536000, immutable
  X-Content-Type-Options: nosniff`);
  });
});
