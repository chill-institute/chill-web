import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vite-plus/test";

import { createApi } from "@/api/api";

import { ApiProvider, useApi, useGetPutioStartURL } from "./api-context";

function ApiHarness({ expectedURL }: { expectedURL: string }) {
  const api = useApi();
  const getPutioStartURL = useGetPutioStartURL();

  return (
    <pre>
      {JSON.stringify({
        hasSearch: typeof api.search === "function",
        startURL: getPutioStartURL("/settings"),
        expectedURL,
      })}
    </pre>
  );
}

function MissingProviderHarness() {
  useApi();
  return null;
}

describe("ApiProvider", () => {
  it("provides the API client and put.io start URL helper", () => {
    const api = createApi({ authToken: "test-token", baseUrl: "https://api.test" });
    const getPutioStartURL = (successURL?: string) =>
      `https://api.test/auth/putio/start?success_url=${encodeURIComponent(successURL ?? "")}`;
    const expectedURL = getPutioStartURL("/settings");

    const html = renderToString(
      <ApiProvider api={api} getPutioStartURL={getPutioStartURL}>
        <ApiHarness expectedURL={expectedURL} />
      </ApiProvider>,
    );

    expect(html).toContain("&quot;hasSearch&quot;:true");
    expect(html).toContain(expectedURL);
  });

  it("fails loudly when hooks are used outside the provider", () => {
    expect(() => renderToString(<MissingProviderHarness />)).toThrow(
      "useApi must be used within ApiProvider",
    );
  });
});
