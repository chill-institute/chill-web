import { create } from "@bufbuild/protobuf";
import { ReleaseInfoSchema, SearchResultSchema } from "@chill-institute/contracts/chill/v4/api_pb";
import { describe, expect, it } from "vite-plus/test";

import { groupIdentityLabel, groupSearchResults } from "./search-groups";

type Info = Partial<{
  title: string;
  year: number;
  season: number;
  episode: number;
  episodeEnd: number;
  resolution: string;
  codec: string;
}>;

function result(id: string, info?: Info) {
  return create(SearchResultSchema, {
    id,
    title: `raw ${id}`,
    link: `magnet:?xt=urn:btih:${id}`,
    releaseInfo: info ? create(ReleaseInfoSchema, info) : undefined,
  });
}

const ids = (groups: ReturnType<typeof groupSearchResults>) =>
  groups.map((group) => group.releases.map((release) => release.id));

describe("groupSearchResults", () => {
  it("merges releases of one episode and keeps a same-named film apart", () => {
    const groups = groupSearchResults([
      result("ep-1080", { title: "Sample Show", season: 3, episode: 1, resolution: "1080p" }),
      result("film", { title: "Sample Show", year: 1941 }),
      result("ep-720", { title: "sample-show", season: 3, episode: 1, resolution: "720p" }),
      result("ep-2", { title: "Sample Show", season: 3, episode: 2 }),
    ]);

    expect(ids(groups)).toEqual([["ep-1080", "ep-720"], ["film"], ["ep-2"]]);
    expect(groupIdentityLabel(groups[0])).toBe("S03E01");
    expect(groupIdentityLabel(groups[1])).toBe("1941");
  });

  it.each([
    ["dated episodes", {}],
    ["season-zero specials", { season: 0 }],
  ])("keeps distinct %s apart from each other and a same-named film", (_, season) => {
    const info = { title: "Sample Show", year: 2024, ...season };
    const groups = groupSearchResults([
      result("ep-1", { ...info, episode: 1 }),
      result("ep-2", { ...info, episode: 2 }),
      result("ep-1-alt", { ...info, episode: 1, resolution: "720p" }),
      result("ep-range", { ...info, episode: 1, episodeEnd: 2 }),
      result("film", info),
    ]);

    expect(ids(groups)).toEqual([["ep-1", "ep-1-alt"], ["ep-2"], ["ep-range"], ["film"]]);
    expect(groups.map(groupIdentityLabel)).toEqual([
      "E01 · 2024",
      "E02 · 2024",
      "E01-E02 · 2024",
      "2024",
    ]);
  });

  it("lists groups before single releases, keeping the sort order within each", () => {
    const groups = groupSearchResults([
      result("single-top", { title: "Other Film", year: 1999 }),
      result("ep-a", { title: "Sample Show", season: 1, episode: 1 }),
      result("single-next", { title: "Third Film", year: 2001 }),
      result("ep-b", { title: "Sample Show", season: 1, episode: 1 }),
    ]);

    expect(ids(groups)).toEqual([["ep-a", "ep-b"], ["single-top"], ["single-next"]]);
  });

  it("leaves results without a parsed identity ungrouped", () => {
    const groups = groupSearchResults([
      result("bare-a", { title: "Sample Collection" }),
      result("bare-b", { title: "Sample Collection" }),
      result("unparsed-a"),
      result("unparsed-b"),
    ]);

    expect(ids(groups)).toEqual([["bare-a"], ["bare-b"], ["unparsed-a"], ["unparsed-b"]]);
  });

  it("merges film releases despite uploader tags and articles", () => {
    const groups = groupSearchResults([
      result("plain", { title: "Sample The Dark Film", year: 2013 }),
      result("tagged", { title: "www.example.org - Sample The Dark Film", year: 2013 }),
      result("no-article", { title: "Sample Dark Film", year: 2013 }),
    ]);

    expect(ids(groups)).toEqual([["plain", "tagged", "no-article"]]);
    expect(groups[0].title).toBe("Sample The Dark Film");
  });
});
