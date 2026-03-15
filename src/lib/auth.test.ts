import { afterEach, describe, expect, it, vi } from "vite-plus/test";

import { normalizeCallbackPath, readAuthTokenFromLocation } from "./auth";

function withWindowLocation(url: string) {
  vi.stubGlobal("window", {
    location: new URL(url),
  });
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("normalizeCallbackPath", () => {
  it("keeps same-origin callback paths", () => {
    withWindowLocation("https://chill.institute/sign-in");

    expect(normalizeCallbackPath("/search?q=matrix#top")).toBe("/search?q=matrix#top");
  });

  it("rejects external origins", () => {
    withWindowLocation("https://chill.institute/sign-in");

    expect(normalizeCallbackPath("https://example.com/search")).toBeNull();
  });

  it("rejects auth routes", () => {
    withWindowLocation("https://chill.institute/sign-in");

    expect(normalizeCallbackPath("/sign-in")).toBeNull();
    expect(normalizeCallbackPath("/sign-out")).toBeNull();
    expect(normalizeCallbackPath("/auth/success")).toBeNull();
  });
});

describe("readAuthTokenFromLocation", () => {
  it("prefers the auth token from the fragment", () => {
    expect(
      readAuthTokenFromLocation({
        hash: "#auth_token=fragment-token",
        search: "?auth_token=query-token",
      }),
    ).toBe("fragment-token");
  });

  it("falls back to the auth token from the query string", () => {
    expect(
      readAuthTokenFromLocation({
        hash: "",
        search: "?auth_token=query-token",
      }),
    ).toBe("query-token");
  });

  it("returns an empty string when no auth token is present", () => {
    expect(
      readAuthTokenFromLocation({
        hash: "#foo=bar",
        search: "?baz=qux",
      }),
    ).toBe("");
  });
});
