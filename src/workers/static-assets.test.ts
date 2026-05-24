import { describe, expect, it } from "vite-plus/test";

import staticAssetsWorker from "./static-assets";
import { handleStaticAssetRequest, type StaticAssetEnv } from "./static-assets";

function createEnv(response: Response): StaticAssetEnv {
  return {
    ASSETS: {
      fetch: async () => response,
    },
  };
}

describe("handleStaticAssetRequest", () => {
  it("exposes the Cloudflare module worker fetch entrypoint", () => {
    expect(staticAssetsWorker.fetch).toBe(handleStaticAssetRequest);
  });

  it("passes non-asset requests through to Cloudflare static assets", async () => {
    const response = new Response("<!doctype html>", {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
      },
    });

    await expect(
      handleStaticAssetRequest(new Request("https://chill.institute/movies"), createEnv(response)),
    ).resolves.toBe(response);
  });

  it("keeps real asset responses cacheable and nosniffed", async () => {
    const response = await handleStaticAssetRequest(
      new Request("https://chill.institute/assets/index-DqBKRWUW.js"),
      createEnv(
        new Response("console.log('ok')", {
          headers: {
            "Content-Type": "text/javascript",
          },
        }),
      ),
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe("public, max-age=31536000, immutable");
    expect(response.headers.get("X-Content-Type-Options")).toBe("nosniff");
  });

  it("turns SPA HTML fallbacks for assets into real misses", async () => {
    const response = await handleStaticAssetRequest(
      new Request("https://chill.institute/assets/stale-chunk.js"),
      createEnv(
        new Response("<!doctype html>", {
          headers: {
            "Content-Type": "text/html; charset=utf-8",
          },
        }),
      ),
    );

    expect(response.status).toBe(404);
    expect(response.headers.get("Cache-Control")).toBe("public, max-age=0, must-revalidate");
    expect(response.headers.get("Content-Type")).toBe("text/plain; charset=utf-8");
  });

  it("preserves non-OK asset responses for hosting failures", async () => {
    const upstream = new Response("<!doctype html>", {
      status: 500,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
      },
    });

    await expect(
      handleStaticAssetRequest(
        new Request("https://chill.institute/assets/index-DqBKRWUW.js"),
        createEnv(upstream),
      ),
    ).resolves.toBe(upstream);
  });
});
