import { describe, it, expect } from "vite-plus/test";

import { isThemePreference } from "./use-theme";

describe("isThemePreference", () => {
  it("accepts the three valid preferences", () => {
    expect(isThemePreference("light")).toBe(true);
    expect(isThemePreference("dark")).toBe(true);
    expect(isThemePreference("system")).toBe(true);
  });

  it("rejects null, empty strings, and unknown values", () => {
    expect(isThemePreference(null)).toBe(false);
    expect(isThemePreference("")).toBe(false);
    expect(isThemePreference("Dark")).toBe(false);
    expect(isThemePreference("auto")).toBe(false);
  });
});
