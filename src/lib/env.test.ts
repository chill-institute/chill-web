import { afterEach, describe, expect, it, vi } from "vite-plus/test";

import { getPublicAPIBaseURL } from "./env";

afterEach(() => {
  vi.unstubAllGlobals();
});

const originalEnv = import.meta.env.VITE_PUBLIC_API_BASE_URL;

describe("getPublicAPIBaseURL", () => {
  afterEach(() => {
    vi.stubEnv("VITE_PUBLIC_API_BASE_URL", originalEnv);
  });

  it("uses the production api by default", () => {
    expect(getPublicAPIBaseURL()).toBe("https://api.chill.institute");
  });

  it("prefers an explicit api override", () => {
    vi.stubEnv("VITE_PUBLIC_API_BASE_URL", "http://localhost:58780");

    expect(getPublicAPIBaseURL()).toBe("http://localhost:58780");
  });

  it("trims explicit api overrides", () => {
    vi.stubEnv("VITE_PUBLIC_API_BASE_URL", " https://api.example.test ");

    expect(getPublicAPIBaseURL()).toBe("https://api.example.test");
  });
});
