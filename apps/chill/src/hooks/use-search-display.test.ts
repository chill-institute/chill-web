import { describe, it, expect } from "vite-plus/test";

import { isSearchDisplayMode } from "./use-search-display";

describe("isSearchDisplayMode", () => {
  it("accepts the two valid modes", () => {
    expect(isSearchDisplayMode("raw")).toBe(true);
    expect(isSearchDisplayMode("detailed")).toBe(true);
  });

  it("rejects null and unknown strings", () => {
    expect(isSearchDisplayMode(null)).toBe(false);
    expect(isSearchDisplayMode("")).toBe(false);
    expect(isSearchDisplayMode("RAW")).toBe(false);
  });
});
