import { Code, ConnectError } from "@connectrpc/connect";
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test";

import { isAuthFailure } from "@/api/auth-failure";

import { redirectToSignInOnAuthFailure } from "./auth-failure";

describe("isAuthFailure", () => {
  it("returns true for ConnectError with Unauthenticated code", () => {
    expect(isAuthFailure(new ConnectError("nope", Code.Unauthenticated))).toBe(true);
  });

  it("returns true for ConnectError with PermissionDenied code", () => {
    expect(isAuthFailure(new ConnectError("nope", Code.PermissionDenied))).toBe(true);
  });

  it("returns true for ConnectError carrying a legacy auth message", () => {
    expect(isAuthFailure(new ConnectError("invalid auth token", Code.Internal))).toBe(true);
    expect(isAuthFailure(new ConnectError("Missing API key or auth token", Code.Internal))).toBe(
      true,
    );
    expect(isAuthFailure(new ConnectError("Unauthorized", Code.Internal))).toBe(true);
    expect(isAuthFailure(new ConnectError("HTTP 401", Code.Internal))).toBe(true);
  });

  it("returns true for plain Error carrying a legacy auth message", () => {
    expect(isAuthFailure(new Error("missing credentials"))).toBe(true);
    expect(isAuthFailure(new Error("INVALID AUTH TOKEN"))).toBe(true);
  });

  it("returns false for non-auth ConnectError codes without legacy markers", () => {
    expect(isAuthFailure(new ConnectError("boom", Code.Internal))).toBe(false);
    expect(isAuthFailure(new ConnectError("timeout", Code.DeadlineExceeded))).toBe(false);
  });

  it("returns false for plain Error without legacy markers", () => {
    expect(isAuthFailure(new Error("network failed"))).toBe(false);
  });

  it("returns false for non-Error values", () => {
    expect(isAuthFailure(undefined)).toBe(false);
    expect(isAuthFailure(null)).toBe(false);
    expect(isAuthFailure("just a string")).toBe(false);
    expect(isAuthFailure({ code: 401 })).toBe(false);
  });
});

describe("redirectToSignInOnAuthFailure", () => {
  const localStorage = new Map<string, string>();
  const sessionStorage = new Map<string, string>();
  let replaceSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    localStorage.clear();
    localStorage.set("chill.auth_token", "stale-token");
    sessionStorage.clear();
    sessionStorage.set("chill.auth_callback", "/results?q=aurora");
    replaceSpy = vi.fn();
    vi.stubGlobal("window", {
      location: {
        pathname: "/search",
        search: "?q=aurora",
        hash: "",
        replace: replaceSpy,
      },
      localStorage: {
        getItem: (k: string) => localStorage.get(k) ?? null,
        setItem: (k: string, v: string) => localStorage.set(k, v),
        removeItem: (k: string) => localStorage.delete(k),
      },
      sessionStorage: {
        getItem: (k: string) => sessionStorage.get(k) ?? null,
        setItem: (k: string, v: string) => sessionStorage.set(k, v),
        removeItem: (k: string) => sessionStorage.delete(k),
      },
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("clears stored auth state and redirects on auth failure", () => {
    redirectToSignInOnAuthFailure(new ConnectError("expired", Code.Unauthenticated));

    expect(localStorage.has("chill.auth_token")).toBe(false);
    expect(sessionStorage.has("chill.auth_callback")).toBe(false);
    expect(sessionStorage.get("chill.auth_redirect")).toBe(
      JSON.stringify({ error: "SessionExpired", callbackUrl: "/search?q=aurora" }),
    );
    expect(replaceSpy).toHaveBeenCalledWith(
      "/sign-in?error=SessionExpired&callbackUrl=%2Fsearch%3Fq%3Daurora",
    );
  });

  it("preserves catalog deep links on auth failure", () => {
    vi.stubGlobal("window", {
      location: {
        pathname: "/movies",
        search: "?sort=recent&source=2",
        hash: "#grid",
        replace: replaceSpy,
      },
      localStorage: {
        getItem: (k: string) => localStorage.get(k) ?? null,
        setItem: (k: string, v: string) => localStorage.set(k, v),
        removeItem: (k: string) => localStorage.delete(k),
      },
      sessionStorage: {
        getItem: (k: string) => sessionStorage.get(k) ?? null,
        setItem: (k: string, v: string) => sessionStorage.set(k, v),
        removeItem: (k: string) => sessionStorage.delete(k),
      },
    });

    redirectToSignInOnAuthFailure(new ConnectError("expired", Code.Unauthenticated));

    expect(replaceSpy).toHaveBeenCalledWith(
      "/sign-in?error=SessionExpired&callbackUrl=%2Fmovies%3Fsort%3Drecent%26source%3D2%23grid",
    );
    expect(sessionStorage.get("chill.auth_redirect")).toBe(
      JSON.stringify({ error: "SessionExpired", callbackUrl: "/movies?sort=recent&source=2#grid" }),
    );
  });

  it("drops unsafe callback paths on auth failure", () => {
    for (const pathname of ["/sign-out", "/auth/success", "//evil.test/path"]) {
      replaceSpy.mockClear();
      vi.stubGlobal("window", {
        location: { pathname, search: "?q=aurora", hash: "", replace: replaceSpy },
        localStorage: {
          getItem: (k: string) => localStorage.get(k) ?? null,
          setItem: (k: string, v: string) => localStorage.set(k, v),
          removeItem: (k: string) => localStorage.delete(k),
        },
        sessionStorage: {
          getItem: (k: string) => sessionStorage.get(k) ?? null,
          setItem: (k: string, v: string) => sessionStorage.set(k, v),
          removeItem: (k: string) => sessionStorage.delete(k),
        },
      });

      redirectToSignInOnAuthFailure(new ConnectError("expired", Code.Unauthenticated));

      if (pathname === "/sign-out") {
        expect(replaceSpy).not.toHaveBeenCalled();
      } else {
        expect(replaceSpy).toHaveBeenCalledWith("/sign-in?error=SessionExpired");
        expect(sessionStorage.get("chill.auth_redirect")).toBe(
          JSON.stringify({ error: "SessionExpired" }),
        );
      }
    }
  });

  it("is a no-op when the error is not an auth failure", () => {
    redirectToSignInOnAuthFailure(new ConnectError("boom", Code.Internal));

    expect(localStorage.has("chill.auth_token")).toBe(true);
    expect(sessionStorage.has("chill.auth_callback")).toBe(true);
    expect(replaceSpy).not.toHaveBeenCalled();
  });

  it("does not loop back when already on /sign-in or /sign-out", () => {
    vi.stubGlobal("window", {
      location: { pathname: "/sign-in", search: "", hash: "", replace: replaceSpy },
      localStorage: {
        getItem: (k: string) => localStorage.get(k) ?? null,
        setItem: (k: string, v: string) => localStorage.set(k, v),
        removeItem: (k: string) => localStorage.delete(k),
      },
      sessionStorage: {
        getItem: (k: string) => sessionStorage.get(k) ?? null,
        setItem: (k: string, v: string) => sessionStorage.set(k, v),
        removeItem: (k: string) => sessionStorage.delete(k),
      },
    });

    redirectToSignInOnAuthFailure(new ConnectError("expired", Code.Unauthenticated));

    expect(replaceSpy).not.toHaveBeenCalled();
    expect(localStorage.has("chill.auth_token")).toBe(true);
  });

  it("returns silently when window is undefined", () => {
    vi.stubGlobal("window", undefined);

    expect(() =>
      redirectToSignInOnAuthFailure(new ConnectError("expired", Code.Unauthenticated)),
    ).not.toThrow();
  });
});
