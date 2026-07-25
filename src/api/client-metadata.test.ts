import { describe, expect, it } from "vite-plus/test";

import { setClientMetadata } from "./client-metadata";

describe("setClientMetadata", () => {
  it("sets the web client and trimmed build release", () => {
    const headers = new Headers();

    setClientMetadata(headers, " abcdef1 ");

    expect(headers.get("X-Chill-Client")).toBe("web");
    expect(headers.get("X-Chill-Client-Version")).toBe("abcdef1");
  });

  it("uses an explicit unknown version when the build release is empty", () => {
    const headers = new Headers();

    setClientMetadata(headers, " ");

    expect(headers.get("X-Chill-Client-Version")).toBe("unknown");
  });

  it("uses an explicit unknown version when the build release is unavailable", () => {
    const headers = new Headers();

    setClientMetadata(headers, undefined);

    expect(headers.get("X-Chill-Client-Version")).toBe("unknown");
  });
});
