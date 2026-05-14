import { afterEach, describe, expect, it, vi } from "vite-plus/test";

import {
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

function withWindowLocation(url: string, options: { nonces?: string[] } = {}) {
  let nonceIndex = 0;
  const nonces = options.nonces ?? ["nonce-1", "nonce-2"];
  vi.stubGlobal("window", {
    location: new URL(url),
    sessionStorage: createMapStorage(),
    localStorage: createMapStorage(),
    crypto: {
      randomUUID: () => nonces[nonceIndex++] ?? `nonce-fallback-${nonceIndex}`,
    },
    history: { replaceState: vi.fn() },
  });
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("normalizeCallbackPath", () => {
  it("keeps same-origin callback paths", () => {
    withWindowLocation("https://binge.institute/sign-in");

    expect(normalizeCallbackPath("/settings#top")).toBe("/settings#top");
  });

  it("rejects external origins", () => {
    withWindowLocation("https://binge.institute/sign-in");

    expect(normalizeCallbackPath("https://example.com/search")).toBeNull();
  });

  it("rejects auth routes", () => {
    withWindowLocation("https://binge.institute/sign-in");

    expect(normalizeCallbackPath("/sign-in")).toBeNull();
    expect(normalizeCallbackPath("/sign-out")).toBeNull();
    expect(normalizeCallbackPath("/auth/success")).toBeNull();
  });
});

describe("storePendingCallbackURL", () => {
  it("stores normalized same-origin callbacks", () => {
    withWindowLocation("https://binge.institute/settings");

    storePendingCallbackURL("/settings#top");

    expect(window.sessionStorage.getItem("chill.auth_callback")).toBe("/settings#top");
  });

  it("does not store rejected callback paths", () => {
    withWindowLocation("https://binge.institute/settings");

    storePendingCallbackURL("/sign-in");

    expect(window.sessionStorage.getItem("chill.auth_callback")).toBeNull();
  });

  it("clears stale callback values when the next callback is rejected", () => {
    withWindowLocation("https://binge.institute/settings");
    window.sessionStorage.setItem("chill.auth_callback", "/settings");

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
  it("stamps a nonce on the URL and records it in sessionStorage", () => {
    withWindowLocation("https://binge.institute/sign-in", { nonces: ["abc-123"] });

    const url = prepareAuthSuccessURL("https://binge.institute/auth/success");

    expect(new URL(url).searchParams.get("nonce")).toBe("abc-123");
    expect(window.sessionStorage.getItem("chill.auth_nonce")).toBe("abc-123");
  });

  it("preserves existing query params on the success URL", () => {
    withWindowLocation("https://binge.institute/sign-in", { nonces: ["xyz-789"] });

    const url = prepareAuthSuccessURL("https://binge.institute/auth/success?foo=bar");

    const parsed = new URL(url);
    expect(parsed.searchParams.get("foo")).toBe("bar");
    expect(parsed.searchParams.get("nonce")).toBe("xyz-789");
  });

  it("regenerates the nonce on each call and overwrites stored value", () => {
    withWindowLocation("https://binge.institute/sign-in", { nonces: ["one", "two"] });

    const a = new URL(prepareAuthSuccessURL("https://binge.institute/auth/success"));
    const b = new URL(prepareAuthSuccessURL("https://binge.institute/auth/success"));

    expect(a.searchParams.get("nonce")).toBe("one");
    expect(b.searchParams.get("nonce")).toBe("two");
    expect(window.sessionStorage.getItem("chill.auth_nonce")).toBe("two");
  });
});

describe("consumeCallbackToken", () => {
  it("stores the token and returns the home path when the nonce matches", () => {
    withWindowLocation(
      "https://binge.institute/auth/success?nonce=good-nonce#auth_token=valid-token",
    );
    window.sessionStorage.setItem("chill.auth_nonce", "good-nonce");

    expect(consumeCallbackToken()).toBe("/");
    expect(window.localStorage.getItem("chill.auth_token")).toBe("valid-token");
    expect(window.sessionStorage.getItem("chill.auth_nonce")).toBeNull();
  });

  it("returns null and rejects the token when no nonce was stored", () => {
    withWindowLocation(
      "https://binge.institute/auth/success?nonce=planted#auth_token=attacker-token",
    );

    expect(consumeCallbackToken()).toBeNull();
    expect(window.localStorage.getItem("chill.auth_token")).toBeNull();
  });

  it("returns null and consumes the stored nonce when the URL nonce mismatches", () => {
    withWindowLocation(
      "https://binge.institute/auth/success?nonce=wrong#auth_token=attacker-token",
    );
    window.sessionStorage.setItem("chill.auth_nonce", "expected");

    expect(consumeCallbackToken()).toBeNull();
    expect(window.localStorage.getItem("chill.auth_token")).toBeNull();
    expect(window.sessionStorage.getItem("chill.auth_nonce")).toBeNull();
  });

  it("ignores an auth_token planted in the query string even when the nonce matches", () => {
    withWindowLocation("https://binge.institute/auth/success?nonce=good&auth_token=query-token");
    window.sessionStorage.setItem("chill.auth_nonce", "good");

    expect(consumeCallbackToken()).toBeNull();
    expect(window.localStorage.getItem("chill.auth_token")).toBeNull();
  });

  it("honors a stored pending callback URL on success", () => {
    withWindowLocation("https://binge.institute/auth/success?nonce=ok#auth_token=valid");
    window.sessionStorage.setItem("chill.auth_nonce", "ok");
    window.sessionStorage.setItem("chill.auth_callback", "/settings");

    expect(consumeCallbackToken()).toBe("/settings");
    expect(window.sessionStorage.getItem("chill.auth_callback")).toBeNull();
  });
});
