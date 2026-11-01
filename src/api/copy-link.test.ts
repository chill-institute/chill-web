import { describe, expect, it, vi } from "vite-plus/test";

import { getPublicAPIBaseURL } from "@/lib/env";

import { resolveCopyLink } from "./copy-link";

const downloadLink = `${getPublicAPIBaseURL()}/download/limetorrents?download_token=token`;
const magnet = "magnet:?xt=urn:btih:0123456789abcdef0123456789abcdef01234567&dn=name";

function respond(status: number, body: unknown) {
  return vi.fn<typeof fetch>(async () => new Response(JSON.stringify(body), { status }));
}

describe("resolveCopyLink", () => {
  it("copies the magnet an API download link resolves to", async () => {
    const fetchImpl = respond(200, { magnet });

    await expect(resolveCopyLink(downloadLink, fetchImpl)).resolves.toBe(magnet);
    const [url, init] = fetchImpl.mock.calls[0];
    expect(url).toEqual(new URL(downloadLink));
    expect(init?.headers).toEqual({ Accept: "application/json" });
    expect(init?.credentials).toBe("omit");
  });

  it("keeps the link when the result is not a magnet or the request fails", async () => {
    await expect(resolveCopyLink(downloadLink, respond(200, {}))).resolves.toBe(downloadLink);
    await expect(
      resolveCopyLink(downloadLink, respond(200, { magnet: "https://example.test/file.torrent" })),
    ).resolves.toBe(downloadLink);
    await expect(
      resolveCopyLink(downloadLink, respond(404, { code: "download_not_found" })),
    ).resolves.toBe(downloadLink);
    const failing = vi.fn<typeof fetch>(async () => {
      throw new TypeError("network");
    });
    await expect(resolveCopyLink(downloadLink, failing)).resolves.toBe(downloadLink);
  });

  it("copies magnets and links outside the API download path without a request", async () => {
    const fetchImpl = respond(200, { magnet });

    for (const link of [
      magnet,
      "https://indexer.example.test/download/file.torrent",
      `${getPublicAPIBaseURL()}/rss/feed`,
      "not a url",
    ]) {
      await expect(resolveCopyLink(link, fetchImpl)).resolves.toBe(link);
    }
    expect(fetchImpl).not.toHaveBeenCalled();
  });
});
