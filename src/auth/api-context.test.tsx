import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vite-plus/test";

import { useApi } from "./api-context";

function MissingProviderHarness() {
  useApi();
  return null;
}

describe("ApiProvider", () => {
  it("fails loudly when hooks are used outside the provider", () => {
    expect(() => renderToString(<MissingProviderHarness />)).toThrow(
      "useApi must be used within ApiProvider",
    );
  });
});
