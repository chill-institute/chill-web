import { afterEach, describe, expect, it, vi } from "vite-plus/test";

import {
  buildAuthHandoffURL,
  clearStoredAuthState,
  consumeCallbackToken,
  consumeHandoffToken,
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
  const location = new URL(url);
  const replaceState = vi.fn((_state: unknown, _title: string, nextURL?: string | URL | null) => {
    if (nextURL != null) {
      location.href = new URL(String(nextURL), location.origin).href;
    }
  });
  vi.stubGlobal("window", {
    location,
    sessionStorage: createMapStorage(),
    localStorage: createMapStorage(),
    crypto: globalThis.crypto,
    history: { replaceState },
  });
  vi.stubGlobal("document", {
    referrer: "",
  });
  return { replaceState };
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("normalizeCallbackPath", () => {
  it("keeps same-origin callback paths", () => {
    withWindowLocation("https://app.test/sign-in");

    expect(normalizeCallbackPath("/search?q=matrix#top")).toBe("/search?q=matrix#top");
  });

  it("rejects external origins", () => {
    withWindowLocation("https://app.test/sign-in");

    expect(normalizeCallbackPath("https://example.com/search")).toBeNull();
  });

  it("rejects auth routes", () => {
    withWindowLocation("https://app.test/sign-in");

    expect(normalizeCallbackPath("/sign-in")).toBeNull();
    expect(normalizeCallbackPath("/sign-out")).toBeNull();
    expect(normalizeCallbackPath("/auth/success")).toBeNull();
  });
});

describe("storePendingCallbackURL", () => {
  it("stores normalized same-origin callbacks", () => {
    withWindowLocation("https://app.test/settings");

    storePendingCallbackURL("/search?q=matrix#top");

    expect(window.sessionStorage.getItem("chill.auth_callback")).toBe("/search?q=matrix#top");
  });

  it("does not store rejected callback paths", () => {
    withWindowLocation("https://app.test/settings");

    storePendingCallbackURL("/sign-in");

    expect(window.sessionStorage.getItem("chill.auth_callback")).toBeNull();
  });

  it("clears stale callback values when the next callback is rejected", () => {
    withWindowLocation("https://app.test/settings");
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

describe("buildAuthHandoffURL", () => {
  it("puts the token in the fragment and not the query string", () => {
    const url = new URL(
      buildAuthHandoffURL({
        targetOrigin: "https://binge.institute",
        token: "handoff-token",
      }),
    );

    expect(url.origin).toBe("https://binge.institute");
    expect(url.pathname).toBe("/auth/handoff");
    expect(url.searchParams.get("auth_token")).toBeNull();
    expect(url.hash).toBe("#auth_token=handoff-token");
  });

  it("keeps same-origin callback paths", () => {
    expect(
      buildAuthHandoffURL({
        targetOrigin: "https://binge.institute",
        token: "handoff-token",
        callbackPath: "/movies?sort=recent",
      }),
    ).toBe(
      "https://binge.institute/auth/handoff?callbackUrl=%2Fmovies%3Fsort%3Drecent#auth_token=handoff-token",
    );
  });

  it("drops auth callback paths", () => {
    expect(
      buildAuthHandoffURL({
        targetOrigin: "https://binge.institute",
        token: "handoff-token",
        callbackPath: "/auth/success",
      }),
    ).toBe("https://binge.institute/auth/handoff#auth_token=handoff-token");
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

describe("consumeHandoffToken", () => {
  it("stores the fragment token when the referrer is trusted", () => {
    const { replaceState } = withWindowLocation(
      "https://binge.institute/auth/handoff#auth_token=valid-token",
    );
    vi.stubGlobal("document", { referrer: "https://chill.institute/search?q=matrix" });

    expect(consumeHandoffToken({ trustedReferrerOrigins: ["https://chill.institute"] })).toBe("/");
    expect(window.localStorage.getItem("chill.auth_token")).toBe("valid-token");
    expect(replaceState).toHaveBeenCalledWith(null, "", "/auth/handoff");
  });

  it("honors a safe callback path", () => {
    withWindowLocation(
      "https://binge.institute/auth/handoff?callbackUrl=%2Fmovies%3Fsort%3Drecent#auth_token=valid-token",
    );
    vi.stubGlobal("document", { referrer: "https://chill.institute/" });

    expect(consumeHandoffToken({ trustedReferrerOrigins: ["https://chill.institute"] })).toBe(
      "/movies?sort=recent",
    );
  });

  it("rejects missing and untrusted referrers", () => {
    withWindowLocation("https://binge.institute/auth/handoff#auth_token=attacker-token");

    expect(consumeHandoffToken({ trustedReferrerOrigins: ["https://chill.institute"] })).toBeNull();
    expect(window.localStorage.getItem("chill.auth_token")).toBeNull();

    vi.stubGlobal("document", { referrer: "https://evil.example/" });

    expect(consumeHandoffToken({ trustedReferrerOrigins: ["https://chill.institute"] })).toBeNull();
    expect(window.localStorage.getItem("chill.auth_token")).toBeNull();
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
