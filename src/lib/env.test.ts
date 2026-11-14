import { afterEach, describe, expect, it, vi } from "vite-plus/test";

import { getPublicAPIBaseURL } from "./env";

const originalEnv = import.meta.env.VITE_PUBLIC_API_BASE_URL;

function servePageFrom(url: string) {
  vi.stubGlobal("window", { location: new URL(url) });
}

describe("getPublicAPIBaseURL", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
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

  it.each([
    ["https://chill.institute/search", "https://api.chill.institute"],
    ["https://binge.institute/search", "https://api.binge.institute"],
  ])("pins %s to its own api even when a build override is set", (page, api) => {
    vi.stubEnv("VITE_PUBLIC_API_BASE_URL", "https://api.example.test");
    servePageFrom(page);

    expect(getPublicAPIBaseURL()).toBe(api);
  });

  it.each([
    "http://localhost:58300/",
    "https://staging.chill.institute/",
    "https://binge.institute.example.test/",
  ])("keeps the build override on %s", (page) => {
    vi.stubEnv("VITE_PUBLIC_API_BASE_URL", "https://api.example.test");
    servePageFrom(page);

    expect(getPublicAPIBaseURL()).toBe("https://api.example.test");
  });

  it("falls back to the chill api on unknown hosts without an override", () => {
    vi.stubEnv("VITE_PUBLIC_API_BASE_URL", "");
    servePageFrom("https://staging.chill.institute/");

    expect(getPublicAPIBaseURL()).toBe("https://api.chill.institute");
  });
});
