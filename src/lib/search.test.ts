import { create } from "@bufbuild/protobuf";
import { ReleaseInfoSchema, SearchResultSchema } from "@chill-institute/contracts/chill/v4/api_pb";
import { describe, expect, it } from "vite-plus/test";

import { defaultSortDirection, formatSearchResults, normalizeQuery } from "./search";
import { CodecFilter, OtherFilter, ResolutionFilter, SortBy, SortDirection } from "./types";

function release(overrides: Partial<{ resolution: string; codec: string; hdr: string }>) {
  return create(ReleaseInfoSchema, overrides);
}

describe("formatSearchResults", () => {
  it("applies quick filters via releaseInfo before sorting", () => {
    const results = [
      create(SearchResultSchema, {
        id: "x264",
        title: "Movie.A.1080p.x264.HDR",
        indexer: "yts",
        source: "yts",
        peers: BigInt(120),
        seeders: BigInt(90),
        size: BigInt(100),
        uploadedAt: "2025-01-01T00:00:00Z",
        link: "https://example.com/x264",
        releaseInfo: release({ resolution: "1080p", codec: "x264", hdr: "HDR" }),
      }),
      create(SearchResultSchema, {
        id: "match-high",
        title: "Movie.B.1080p.x265.HDR",
        indexer: "yts",
        source: "yts",
        peers: BigInt(60),
        seeders: BigInt(50),
        size: BigInt(200),
        uploadedAt: "2025-01-02T00:00:00Z",
        link: "https://example.com/match-high",
        releaseInfo: release({ resolution: "1080p", codec: "x265", hdr: "HDR" }),
      }),
      create(SearchResultSchema, {
        id: "match-low",
        title: "Movie.C.1080p.x265.HDR",
        indexer: "rarbg",
        source: "rarbg",
        peers: BigInt(20),
        seeders: BigInt(10),
        size: BigInt(150),
        uploadedAt: "2025-01-03T00:00:00Z",
        link: "https://example.com/match-low",
        releaseInfo: release({ resolution: "1080p", codec: "x265", hdr: "HDR" }),
      }),
      create(SearchResultSchema, {
        id: "wrong-resolution",
        title: "Movie.D.720p.x265.HDR",
        indexer: "yts",
        source: "yts",
        peers: BigInt(1000),
        seeders: BigInt(999),
        size: BigInt(300),
        uploadedAt: "2025-01-04T00:00:00Z",
        link: "https://example.com/wrong-resolution",
        releaseInfo: release({ resolution: "720p", codec: "x265", hdr: "HDR" }),
      }),
    ];

    const formatted = formatSearchResults(
      results,
      [ResolutionFilter.RESOLUTION_FILTER_1080P],
      [CodecFilter.X265],
      [OtherFilter.HDR],
      SortBy.SEEDERS,
      SortDirection.DESC,
    );

    expect(formatted.map((result) => result.id)).toEqual(["match-high", "match-low"]);
  });

  it("matches H.264-family releaseInfo values with the x264 quick filter", () => {
    const results = [
      create(SearchResultSchema, {
        id: "h264",
        title: "Movie.2024.1080p.WEB.H-264-GRP",
        indexer: "yts",
        source: "yts",
        peers: BigInt(0),
        seeders: BigInt(10),
        size: BigInt(100),
        uploadedAt: "2025-01-01T00:00:00Z",
        link: "https://example.com/h264",
        releaseInfo: release({ resolution: "1080p", codec: "H264" }),
      }),
      create(SearchResultSchema, {
        id: "h265",
        title: "Movie.2024.1080p.WEB.H-265-GRP",
        indexer: "yts",
        source: "yts",
        peers: BigInt(0),
        seeders: BigInt(20),
        size: BigInt(100),
        uploadedAt: "2025-01-02T00:00:00Z",
        link: "https://example.com/h265",
        releaseInfo: release({ resolution: "1080p", codec: "H265" }),
      }),
    ];

    const formatted = formatSearchResults(
      results,
      [],
      [CodecFilter.X264],
      [],
      SortBy.SEEDERS,
      SortDirection.DESC,
    );

    expect(formatted.map((result) => result.id)).toEqual(["h264"]);
  });
});

describe("defaultSortDirection", () => {
  it("starts text sorts ascending", () => {
    expect(defaultSortDirection(SortBy.TITLE)).toBe(SortDirection.ASC);
    expect(defaultSortDirection(SortBy.SOURCE)).toBe(SortDirection.ASC);
  });

  it("starts ranked sorts descending", () => {
    expect(defaultSortDirection(SortBy.SEEDERS)).toBe(SortDirection.DESC);
    expect(defaultSortDirection(SortBy.SIZE)).toBe(SortDirection.DESC);
    expect(defaultSortDirection(SortBy.UPLOADED_AT)).toBe(SortDirection.DESC);
  });
});

describe("normalizeQuery", () => {
  it("extracts IMDb ID from a full IMDb URL", () => {
    expect(normalizeQuery("https://www.imdb.com/title/tt9000001/?ref_=ext_shr_lnk")).toBe(
      "tt9000001",
    );
  });

  it("extracts IMDb ID from an IMDb URL without query params", () => {
    expect(normalizeQuery("https://www.imdb.com/title/tt9000001/")).toBe("tt9000001");
  });

  it("extracts IMDb ID from an IMDb URL with trailing whitespace", () => {
    expect(normalizeQuery("  https://www.imdb.com/title/tt9000001/  ")).toBe("tt9000001");
  });

  it("extracts IMDb ID from a mobile IMDb URL", () => {
    expect(normalizeQuery("https://m.imdb.com/title/tt9000001/")).toBe("tt9000001");
  });

  it("returns the original query trimmed when not an IMDb URL", () => {
    expect(normalizeQuery("  Synthetic Feature Alpha  ")).toBe("Synthetic Feature Alpha");
  });

  it("returns the original query when it is already an IMDb ID", () => {
    expect(normalizeQuery("tt9000001")).toBe("tt9000001");
  });

  it("returns empty string for empty input", () => {
    expect(normalizeQuery("")).toBe("");
    expect(normalizeQuery("   ")).toBe("");
  });
});
