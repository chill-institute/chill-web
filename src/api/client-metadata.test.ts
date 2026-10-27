import { describe, expect, it } from "vite-plus/test";

import { setClientMetadata } from "./client-metadata";

describe("setClientMetadata", () => {
  it("sets the web client and trimmed app version", () => {
    const headers = new Headers();

    setClientMetadata(headers, " 0.0.339 ");

    expect(headers.get("X-Chill-Client")).toBe("web");
    expect(headers.get("X-Chill-Client-Version")).toBe("0.0.339");
  });

  it.each([" ", undefined])("uses an explicit unknown version for app version %j", (version) => {
    const headers = new Headers();

    setClientMetadata(headers, version);

    expect(headers.get("X-Chill-Client-Version")).toBe("unknown");
  });
});
