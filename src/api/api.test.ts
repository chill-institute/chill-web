import { afterEach, describe, expect, it, vi } from "vite-plus/test";

import { createApi } from "./api";
import { getClientRequestTimeoutDetails } from "./request-timeout";

describe("createApi request metadata", () => {
  afterEach(() => {
    vi.useRealTimers();
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

  it("keeps timeout evidence aligned with the request sent to the API", async () => {
    vi.useFakeTimers();
    let capturedRequestId: string | null = null;
    vi.stubGlobal("fetch", async (input: RequestInfo | URL, init?: RequestInit) => {
      const request = new Request(input, init);
      capturedRequestId = request.headers.get("X-Request-Id");
      await new Promise<void>((_resolve, reject) => {
        request.signal.addEventListener("abort", () => reject(request.signal.reason), {
          once: true,
        });
      });
      return new Response();
    });

    const api = createApi({
      authToken: "placeholder",
      baseUrl: "https://api.example.test",
    });
    const request = api.getUserSettings().catch((error: unknown) => error);

    await vi.advanceTimersByTimeAsync(20000);
    const error = await request;

    expect(capturedRequestId).toBeTruthy();
    expect(getClientRequestTimeoutDetails(error)).toEqual({
      operation: "Settings request",
      requestId: capturedRequestId,
      timeoutMs: 20000,
    });
  });
});
