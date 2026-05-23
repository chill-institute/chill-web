import { afterEach, describe, expect, it, vi } from "vite-plus/test";

import {
  authCallbackHref,
  clearPendingAuthRedirectSearch,
  clearStoredAuthState,
  consumeCallbackToken,
  readPendingAuthRedirectSearch,
  normalizeCallbackPath,
  prepareAuthSuccessURL,
  prepareSignInAgainURL,
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

    expect(normalizeCallbackPath("/search?q=aurora#top")).toBe("/search?q=aurora#top");
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

describe("authCallbackHref", () => {
  it("preserves any same-origin callback href for TanStack Router", () => {
    withWindowLocation("https://app.test/sign-in");

    expect(authCallbackHref("/search?q=aurora#top")).toBe("/search?q=aurora#top");
    expect(authCallbackHref("/movies/The%20Perfect%20Neighbor-2025?source=3")).toBe(
      "/movies/The%20Perfect%20Neighbor-2025?source=3",
    );
    expect(authCallbackHref("/tv-shows/tt17220216?season=2&source=3")).toBe(
      "/tv-shows/tt17220216?season=2&source=3",
    );
    expect(authCallbackHref("/movies/?source=3")).toBe("/movies/?source=3");
  });

  it("falls back home for rejected callback hrefs", () => {
    withWindowLocation("https://app.test/sign-in");

    expect(authCallbackHref("https://example.com/search")).toBe("/");
    expect(authCallbackHref("/sign-in")).toBe("/");
  });
});

describe("storePendingCallbackURL", () => {
  it("stores normalized same-origin callbacks", () => {
    withWindowLocation("https://app.test/settings");

    storePendingCallbackURL("/search?q=aurora#top");

    expect(window.sessionStorage.getItem("chill.auth_callback")).toBe("/search?q=aurora#top");
  });

  it("does not store rejected callback paths", () => {
    withWindowLocation("https://app.test/settings");

    storePendingCallbackURL("/sign-in");

    expect(window.sessionStorage.getItem("chill.auth_callback")).toBeNull();
  });

  it("clears stale callback values when the next callback is rejected", () => {
    withWindowLocation("https://app.test/settings");
    window.sessionStorage.setItem("chill.auth_callback", "/search?q=aurora");

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

describe("prepareSignInAgainURL", () => {
  it("stores the current callback and passes a nonce-stamped success URL into the OAuth start URL", () => {
    withWindowLocation("https://chill.institute/settings?tab=download#folder");

    const startURL = prepareSignInAgainURL((successURL) => {
      const url = new URL("https://api.chill.institute/auth/putio/start");
      if (successURL) {
        url.searchParams.set("success_url", successURL);
      }
      return url.toString();
    });

    expect(window.sessionStorage.getItem("chill.auth_callback")).toBe(
      "/settings?tab=download#folder",
    );
    const successURL = new URL(startURL).searchParams.get("success_url");
    expect(successURL).not.toBeNull();
    const nonceFromURL = new URL(successURL!).searchParams.get("nonce");
    expect(nonceFromURL).toMatch(/^[0-9a-f]{32}$/);
    expect(window.sessionStorage.getItem("chill.auth_nonce")).toBe(nonceFromURL);
  });

  it("keeps rejected current routes out of callback storage", () => {
    withWindowLocation("https://chill.institute/auth/success");

    prepareSignInAgainURL((successURL) => successURL ?? "");

    expect(window.sessionStorage.getItem("chill.auth_callback")).toBeNull();
    expect(window.sessionStorage.getItem("chill.auth_nonce")).toMatch(/^[0-9a-f]{32}$/);
  });
});

describe("readPendingAuthRedirectSearch", () => {
  it("returns a stored session-expired redirect", () => {
    withWindowLocation("https://chill.institute/search");
    window.sessionStorage.setItem(
      "chill.auth_redirect",
      JSON.stringify({ error: "SessionExpired", callbackUrl: "/search?q=aurora" }),
    );

    expect(readPendingAuthRedirectSearch("/settings")).toEqual({
      error: "SessionExpired",
      callbackUrl: "/search?q=aurora",
    });
    expect(window.sessionStorage.getItem("chill.auth_redirect")).not.toBeNull();
  });

  it("drops unsafe stored callbacks and keeps the current fallback", () => {
    withWindowLocation("https://chill.institute/search");
    window.sessionStorage.setItem(
      "chill.auth_redirect",
      JSON.stringify({ error: "SessionExpired", callbackUrl: "/auth/success" }),
    );

    expect(readPendingAuthRedirectSearch("/movies?sort=recent")).toEqual({
      error: "SessionExpired",
      callbackUrl: "/movies?sort=recent",
    });
  });

  it("clears pending auth redirects explicitly", () => {
    withWindowLocation("https://chill.institute/search");
    window.sessionStorage.setItem(
      "chill.auth_redirect",
      JSON.stringify({ error: "SessionExpired", callbackUrl: "/search?q=aurora" }),
    );

    clearPendingAuthRedirectSearch();

    expect(window.sessionStorage.getItem("chill.auth_redirect")).toBeNull();
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
    window.sessionStorage.setItem("chill.auth_callback", "/search?q=aurora");

    expect(consumeCallbackToken()).toBe("/search?q=aurora");
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
