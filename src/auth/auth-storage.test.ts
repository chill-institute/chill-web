import { afterEach, describe, expect, it, vi } from "vite-plus/test";

import {
  clearStoredAuthState,
  readStoredToken,
  storeAuthToken,
  storeAuthNonce,
  storePendingCallbackURL,
} from "./auth-storage";

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

function createThrowingStorage(error: Error) {
  return {
    getItem() {
      throw error;
    },
    setItem() {
      throw error;
    },
    removeItem() {
      throw error;
    },
  };
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("auth-storage blocked storage", () => {
  it("treats SecurityError localStorage access as signed out", () => {
    const securityError = new DOMException(
      "Failed to read the 'localStorage' property from 'Window': Access is denied for this document.",
      "SecurityError",
    );
    vi.stubGlobal("window", {
      location: new URL("https://app.test/"),
      get localStorage() {
        throw securityError;
      },
      sessionStorage: createMapStorage(),
      history: { replaceState: vi.fn() },
    });

    expect(readStoredToken()).toBeNull();
    expect(() => storeAuthToken("token-value")).not.toThrow();
    expect(() => clearStoredAuthState()).not.toThrow();
  });

  it("treats null localStorage as signed out", () => {
    vi.stubGlobal("window", {
      location: new URL("https://app.test/"),
      localStorage: null,
      sessionStorage: createMapStorage(),
      history: { replaceState: vi.fn() },
    });

    expect(readStoredToken()).toBeNull();
    expect(() => storeAuthToken("token-value")).not.toThrow();
  });

  it("treats getItem TypeError on null-like storage as signed out", () => {
    vi.stubGlobal("window", {
      location: new URL("https://app.test/"),
      localStorage: createThrowingStorage(
        new TypeError("Cannot read properties of null (reading 'getItem')"),
      ),
      sessionStorage: createMapStorage(),
      history: { replaceState: vi.fn() },
    });

    expect(readStoredToken()).toBeNull();
  });

  it("keeps session helpers resilient when sessionStorage throws", () => {
    const securityError = new DOMException("Access is denied", "SecurityError");
    vi.stubGlobal("window", {
      location: new URL("https://app.test/"),
      localStorage: createMapStorage(),
      sessionStorage: createThrowingStorage(securityError),
      history: { replaceState: vi.fn() },
    });

    expect(() => storeAuthNonce("nonce-value")).not.toThrow();
    expect(() => storePendingCallbackURL("/movies")).not.toThrow();
    expect(() => clearStoredAuthState()).not.toThrow();
  });
});
