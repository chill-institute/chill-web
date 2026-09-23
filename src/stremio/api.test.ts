import { afterEach, describe, expect, it, vi } from "vite-plus/test";
import {
  createStremioLink,
  disconnectStremio,
  isStremioManifestURL,
  maskedStremioManifestURL,
  stremioInstallURL,
} from "./api";

afterEach(() => vi.unstubAllGlobals());

function stubFetch(response: Response) {
  const fetch = vi.fn().mockResolvedValue(response);
  vi.stubGlobal("fetch", fetch);
  return fetch;
}

describe("createStremioLink", () => {
  it("sends the chill token only in headers and builds the manifest link", async () => {
    const fetch = stubFetch(Response.json({ credential: "fixture.credential_1-~" }));
    await expect(createStremioLink("fixture-token")).resolves.toBe(
      "https://stremio.chill.institute/s/fixture.credential_1-~/manifest.json",
    );
    expect(fetch).toHaveBeenCalledWith(
      "https://api.chill.institute/stremio/credential",
      expect.objectContaining({
        method: "POST",
        redirect: "error",
        credentials: "omit",
        cache: "no-store",
        headers: { Authorization: "Bearer fixture-token", "Content-Type": "application/json" },
        body: "{}",
      }),
    );
  });

  it("sends a chosen folder as a decimal string", async () => {
    const fetch = stubFetch(Response.json({ credential: "fixture" }));
    await createStremioLink("fixture-token", 42n);
    expect(fetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ body: '{"folder_id":"42"}' }),
    );
  });

  it.each(["", "../x", "a/b", "a?b", "a#b", ".hidden", "a%2Fb", 42])(
    "rejects unsafe credential %j",
    async (credential) => {
      stubFetch(Response.json({ credential }));
      await expect(createStremioLink("fixture-token")).rejects.toMatchObject({ kind: "failed" });
    },
  );

  it.each([
    [409, { code: "download_folder_missing", message: "x" }, "folder-missing"],
    [409, { code: "conflict", message: "x" }, "failed"],
    [503, { code: "stremio_not_configured", message: "x" }, "unavailable"],
    [401, { code: "unauthenticated", message: "x" }, "unauthenticated"],
    [500, "secret", "failed"],
  ])("maps status %i to %s without exposing the body", async (status, body, kind) => {
    stubFetch(
      typeof body === "string" ? new Response(body, { status }) : Response.json(body, { status }),
    );
    const error = await createStremioLink("fixture-token").catch((caught: unknown) => caught);
    expect(error).toMatchObject({ kind });
    expect(String(error)).not.toContain("secret");
  });

  it("reports network failures", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("Failed to fetch")));
    await expect(createStremioLink("fixture-token")).rejects.toMatchObject({ kind: "network" });
  });
});

describe("disconnectStremio", () => {
  it("posts without a body", async () => {
    const fetch = stubFetch(new Response(null, { status: 204 }));
    await disconnectStremio("fixture-token");
    expect(fetch).toHaveBeenCalledWith(
      "https://api.chill.institute/stremio/disconnect",
      expect.objectContaining({
        method: "POST",
        headers: { Authorization: "Bearer fixture-token" },
        body: undefined,
      }),
    );
  });
});

describe("manifest links", () => {
  it.each([
    ["https://stremio.chill.institute/s/fixture/manifest.json", true],
    ["https://evil.example/s/fixture/manifest.json", false],
    ["https://stremio.chill.institute/s/fixture/manifest.json?x=1", false],
    ["https://stremio.chill.institute/s/fixture/manifest.json#x", false],
    ["https://user@stremio.chill.institute/s/fixture/manifest.json", false],
    ["https://stremio.chill.institute/addons/fixture/manifest.json", false],
    ["https://stremio.chill.institute/s/a/b/manifest.json", false],
    ["javascript:alert(1)", false],
  ])("validates %s", (url, valid) => {
    expect(isStremioManifestURL(url)).toBe(valid);
  });

  it("masks the credential and builds a Stremio deep link", () => {
    expect(maskedStremioManifestURL()).toBe("stremio.chill.institute/s/••••/manifest.json");
    expect(stremioInstallURL("https://stremio.chill.institute/s/fixture/manifest.json")).toBe(
      "stremio://stremio.chill.institute/s/fixture/manifest.json",
    );
  });
});
