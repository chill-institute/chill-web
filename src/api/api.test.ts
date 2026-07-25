import { afterEach, describe, expect, it, vi } from "vite-plus/test";

import { createApi } from "./api";

describe("createApi request metadata", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("sends client metadata on Connect requests", async () => {
    let capturedRequest: Request | undefined;
    vi.stubGlobal("fetch", async (input: RequestInfo | URL, init?: RequestInit) => {
      capturedRequest = new Request(input, init);
      return new Response("{}", {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    });

    const api = createApi({
      authToken: "placeholder",
      baseUrl: "https://api.example.test",
    });
    await api.getUserProfile();

    expect(capturedRequest).toBeDefined();
    expect(capturedRequest?.headers.get("X-Chill-Client")).toBe("web");
    expect(capturedRequest?.headers.get("X-Chill-Client-Version")).toBe(
      import.meta.env.VITE_PUBLIC_RELEASE?.trim() || "unknown",
    );
    expect(capturedRequest?.headers.get("X-Request-Id")).toBeTruthy();
  });
});
