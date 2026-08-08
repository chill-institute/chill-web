import { beforeEach, describe, expect, it, vi } from "vite-plus/test";

import { ClientRequestTimeoutError } from "@/api/request-timeout";

import { reportMoviesError, reportMoviesSourceSyncError } from "./-movies-error";

const { captureAppException } = vi.hoisted(() => ({ captureAppException: vi.fn() }));

vi.mock("@/lib/sentry", () => ({ captureAppException }));

describe("movies error reporting", () => {
  beforeEach(() => {
    captureAppException.mockReset();
    vi.stubGlobal("window", { location: { pathname: "/movies" } });
  });

  it("keeps loader reporting limited to handled timeouts", () => {
    reportMoviesError(new Error("settings unavailable"));
    expect(captureAppException).not.toHaveBeenCalled();

    const timeout = new ClientRequestTimeoutError("Settings request");
    reportMoviesError(timeout);

    expect(captureAppException).toHaveBeenCalledWith(timeout, {
      release: expect.any(String),
      routePath: "/movies",
    });
  });

  it("reports every detached source-sync failure", () => {
    const error = new Error("settings unavailable");
    reportMoviesSourceSyncError(error);

    expect(captureAppException).toHaveBeenCalledWith(error, {
      release: expect.any(String),
      routePath: "/movies",
    });
  });
});
