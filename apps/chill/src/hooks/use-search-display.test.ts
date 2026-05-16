import { describe, it, expect } from "vite-plus/test";

import { isSearchDisplayMode, migrateLegacyValue } from "./use-search-display";

describe("isSearchDisplayMode", () => {
  it("accepts the two valid modes", () => {
    expect(isSearchDisplayMode("raw")).toBe(true);
    expect(isSearchDisplayMode("detailed")).toBe(true);
  });

  it("rejects null and unknown strings", () => {
    expect(isSearchDisplayMode(null)).toBe(false);
    expect(isSearchDisplayMode("")).toBe(false);
    expect(isSearchDisplayMode("legacy")).toBe(false);
    expect(isSearchDisplayMode("RAW")).toBe(false);
  });
});

describe("migrateLegacyValue", () => {
  it("maps the legacy 'legacy' key to 'raw'", () => {
    expect(migrateLegacyValue("legacy")).toBe("raw");
  });

  it("maps the legacy 'clean' and 'full' keys to 'detailed'", () => {
    expect(migrateLegacyValue("clean")).toBe("detailed");
    expect(migrateLegacyValue("full")).toBe("detailed");
  });

  it("returns null for current-shape values so the caller can fall through", () => {
    expect(migrateLegacyValue("raw")).toBeNull();
    expect(migrateLegacyValue("detailed")).toBeNull();
  });

  it("returns null for null and unknown values", () => {
    expect(migrateLegacyValue(null)).toBeNull();
    expect(migrateLegacyValue("")).toBeNull();
    expect(migrateLegacyValue("garbage")).toBeNull();
  });
});
