import { afterEach, describe, expect, it, vi } from "vite-plus/test";

import {
  clearStoredAuthState,
  consumeCallbackToken,
  normalizeCallbackPath,
  prepareAuthSuccessURL,
  readAuthTokenFromLocation,
  storePendingCallbackURL,
} from "./auth";

function createMapStorage() {
  const storage = new Map<string, string>();

  return {
    getItem(key: string) {
      return storage.get(key) ?? null;
    },
    setItem(key: string, value: string) {
      storage.set(key, value);
    },
    removeItem(key: string) {
      storage.delete(key);
    },
  };
}

function withWindowLocation(url: string) {
  vi.stubGlobal("window", {
    location: new URL(url),
    sessionStorage: createMapStorage(),
    localStorage: createMapStorage(),
    crypto: globalThis.crypto,
    history: { replaceState: vi.fn() },
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

describe("storePendingCallbackURL", () => {
  it("stores normalized same-origin callbacks", () => {
    withWindowLocation("https://chill.institute/settings");

    storePendingCallbackURL("/search?q=matrix#top");

    expect(window.sessionStorage.getItem("chill.auth_callback")).toBe("/search?q=matrix#top");
  });

  it("does not store rejected callback paths", () => {
    withWindowLocation("https://chill.institute/settings");

    storePendingCallbackURL("/sign-in");

    expect(window.sessionStorage.getItem("chill.auth_callback")).toBeNull();
  });

  it("clears stale callback values when the next callback is rejected", () => {
    withWindowLocation("https://chill.institute/settings");
    window.sessionStorage.setItem("chill.auth_callback", "/search?q=matrix");

    storePendingCallbackURL("/sign-in");

    expect(window.sessionStorage.getItem("chill.auth_callback")).toBeNull();
  });
});

describe("readAuthTokenFromLocation", () => {
  it("reads the auth token from the URL fragment", () => {
    expect(
      readAuthTokenFromLocation({
        hash: "#auth_token=fragment-token",
      }),
    ).toBe("fragment-token");
  });

  it("returns an empty string when no auth token is in the fragment", () => {
    expect(
      readAuthTokenFromLocation({
        hash: "#foo=bar",
      }),
    ).toBe("");
  });
});

describe("prepareAuthSuccessURL", () => {
  it("stamps a 128-bit hex nonce on the URL and records the same value in sessionStorage", () => {
    withWindowLocation("https://chill.institute/sign-in");

    const url = prepareAuthSuccessURL("https://chill.institute/auth/success");

    const nonceFromURL = new URL(url).searchParams.get("nonce");
    expect(nonceFromURL).toMatch(/^[0-9a-f]{32}$/);
    expect(window.sessionStorage.getItem("chill.auth_nonce")).toBe(nonceFromURL);
  });

  it("preserves existing query params on the success URL", () => {
    withWindowLocation("https://chill.institute/sign-in");

    const url = prepareAuthSuccessURL("https://chill.institute/auth/success?foo=bar");

    const parsed = new URL(url);
    expect(parsed.searchParams.get("foo")).toBe("bar");
    expect(parsed.searchParams.get("nonce")).toMatch(/^[0-9a-f]{32}$/);
  });

  it("regenerates the nonce on each call and overwrites the stored value", () => {
    withWindowLocation("https://chill.institute/sign-in");

    const first = new URL(prepareAuthSuccessURL("https://chill.institute/auth/success"));
    const second = new URL(prepareAuthSuccessURL("https://chill.institute/auth/success"));

    expect(first.searchParams.get("nonce")).not.toBe(second.searchParams.get("nonce"));
    expect(window.sessionStorage.getItem("chill.auth_nonce")).toBe(
      second.searchParams.get("nonce"),
    );
  });
});

describe("consumeCallbackToken", () => {
  it("stores the token and returns the home path when the nonce matches", () => {
    withWindowLocation(
      "https://chill.institute/auth/success?nonce=good-nonce#auth_token=valid-token",
    );
    window.sessionStorage.setItem("chill.auth_nonce", "good-nonce");

    expect(consumeCallbackToken()).toBe("/");
    expect(window.localStorage.getItem("chill.auth_token")).toBe("valid-token");
    expect(window.sessionStorage.getItem("chill.auth_nonce")).toBeNull();
  });

  it("returns null and rejects the token when no nonce was stored", () => {
    withWindowLocation(
      "https://chill.institute/auth/success?nonce=planted#auth_token=attacker-token",
    );

    expect(consumeCallbackToken()).toBeNull();
    expect(window.localStorage.getItem("chill.auth_token")).toBeNull();
  });

  it("returns null and consumes the stored nonce when the URL nonce mismatches", () => {
    withWindowLocation(
      "https://chill.institute/auth/success?nonce=wrong#auth_token=attacker-token",
    );
    window.sessionStorage.setItem("chill.auth_nonce", "expected");

    expect(consumeCallbackToken()).toBeNull();
    expect(window.localStorage.getItem("chill.auth_token")).toBeNull();
    expect(window.sessionStorage.getItem("chill.auth_nonce")).toBeNull();
  });

  it("ignores an auth_token planted in the query string even when the nonce matches", () => {
    withWindowLocation("https://chill.institute/auth/success?nonce=good&auth_token=query-token");
    window.sessionStorage.setItem("chill.auth_nonce", "good");

    expect(consumeCallbackToken()).toBeNull();
    expect(window.localStorage.getItem("chill.auth_token")).toBeNull();
  });

  it("returns null and clears the pending callback when the nonce matches but no token is in the fragment", () => {
    withWindowLocation("https://chill.institute/auth/success?nonce=ok");
    window.sessionStorage.setItem("chill.auth_nonce", "ok");
    window.sessionStorage.setItem("chill.auth_callback", "/should-be-cleared");

    expect(consumeCallbackToken()).toBeNull();
    expect(window.localStorage.getItem("chill.auth_token")).toBeNull();
    expect(window.sessionStorage.getItem("chill.auth_callback")).toBeNull();
  });

  it("honors a stored pending callback URL on success", () => {
    withWindowLocation("https://chill.institute/auth/success?nonce=ok#auth_token=valid");
    window.sessionStorage.setItem("chill.auth_nonce", "ok");
    window.sessionStorage.setItem("chill.auth_callback", "/search?q=matrix");

    expect(consumeCallbackToken()).toBe("/search?q=matrix");
    expect(window.sessionStorage.getItem("chill.auth_callback")).toBeNull();
  });
});

describe("clearStoredAuthState", () => {
  it("clears auth_token, auth_callback, and auth_nonce in one call", () => {
    withWindowLocation("https://chill.institute/");
    window.localStorage.setItem("chill.auth_token", "stored-token");
    window.sessionStorage.setItem("chill.auth_callback", "/somewhere");
    window.sessionStorage.setItem("chill.auth_nonce", "in-flight-nonce");

    clearStoredAuthState();

    expect(window.localStorage.getItem("chill.auth_token")).toBeNull();
    expect(window.sessionStorage.getItem("chill.auth_callback")).toBeNull();
    expect(window.sessionStorage.getItem("chill.auth_nonce")).toBeNull();
  });
});
