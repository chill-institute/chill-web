import { create } from "@bufbuild/protobuf";
import { ReleaseInfoSchema, SearchResultSchema } from "@chill-institute/contracts/chill/v4/api_pb";
import { describe, expect, it } from "vite-plus/test";

import { groupFormatSummary, groupIdentityLabel, groupSearchResults } from "./search-groups";

type Info = Partial<{
  title: string;
  year: number;
  season: number;
  episode: number;
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

  it("leaves results without a parsed identity ungrouped", () => {
    const groups = groupSearchResults([
      result("bare-a", { title: "Sample Collection" }),
      result("bare-b", { title: "Sample Collection" }),
      result("unparsed-a"),
      result("unparsed-b"),
    ]);

    expect(ids(groups)).toEqual([["bare-a"], ["bare-b"], ["unparsed-a"], ["unparsed-b"]]);
  });

  it("summarizes distinct formats with codec aliases normalized", () => {
    const [group] = groupSearchResults([
      result("a", { title: "Sample Film", year: 2001, resolution: "1080p", codec: "H.264" }),
      result("b", { title: "Sample Film", year: 2001, resolution: "720p", codec: "x264" }),
      result("c", { title: "Sample Film", year: 2001, resolution: "1080p", codec: "HEVC" }),
    ]);

    expect(groupFormatSummary(group)).toBe("1080p · 720p · x264 · x265");
  });
});
