import { describe, expect, it } from "vite-plus/test";

import { setClientMetadata } from "./client-metadata";

describe("setClientMetadata", () => {
  it("sets the web client and trimmed app version", () => {
    const headers = new Headers();

    setClientMetadata(headers, " 0.0.339 ");

    expect(headers.get("X-Chill-Client")).toBe("web");
    expect(headers.get("X-Chill-Client-Version")).toBe("0.0.339");
  });

  it("uses an explicit unknown version when the app version is empty", () => {
    const headers = new Headers();

    setClientMetadata(headers, " ");

    expect(headers.get("X-Chill-Client-Version")).toBe("unknown");
  });

  it("uses an explicit unknown version when the app version is unavailable", () => {
    const headers = new Headers();

    setClientMetadata(headers, undefined);

    expect(headers.get("X-Chill-Client-Version")).toBe("unknown");
  });
});
