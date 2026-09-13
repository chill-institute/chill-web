import { afterEach, describe, expect, it, vi } from "vite-plus/test";
import { createInstallation, listInstallations, revokeInstallation } from "./api";

const valid = {
  id: "fixture-id",
  folderId: "0",
  createdAt: 1,
  manifestUrl: "https://stremio.chill.institute/addons/fixture/manifest.json",
};
afterEach(() => vi.unstubAllGlobals());
describe("private installation boundary", () => {
  it.each([
    "https://evil.example/addons/key/manifest.json",
    "https://stremio.chill.institute/addons/key/manifest.json?token=bad",
    "javascript:alert(1)",
  ])("rejects unsafe link %s", async (manifestUrl) => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(Response.json({ installations: [{ ...valid, manifestUrl }] })),
    );
    await expect(listInstallations("fixture-token")).rejects.toThrow();
  });
  it("sends auth only in headers and refuses redirects", async () => {
    const fetch = vi.fn().mockResolvedValue(Response.json(valid));
    vi.stubGlobal("fetch", fetch);
    await createInstallation("fixture-token", "0");
    expect(fetch).toHaveBeenCalledWith(
      "https://stremio.chill.institute/api/installations",
      expect.objectContaining({
        redirect: "error",
        credentials: "omit",
        cache: "no-store",
        headers: { Authorization: "Bearer fixture-token", "Content-Type": "application/json" },
        body: '{"folderId":"0"}',
      }),
    );
  });
  it("does not expose server error bodies", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("secret", { status: 500 })));
    await expect(revokeInstallation("fixture-token", "fixture-id")).rejects.toThrow(
      "Couldn't update your Stremio add-on. Please try again.",
    );
  });
});
