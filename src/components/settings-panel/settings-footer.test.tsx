import { describe, expect, it } from "vite-plus/test";

import { getReleaseCommitUrl } from "./settings-footer";

describe("getReleaseCommitUrl", () => {
  it("links deployed commit-like releases to GitHub commits", () => {
    expect(getReleaseCommitUrl("bde17b3")).toBe(
      "https://github.com/chill-institute/chill-web/commit/bde17b3",
    );
    expect(getReleaseCommitUrl("bde17b31f6ce256bba1720d751179b721f28e755")).toBe(
      "https://github.com/chill-institute/chill-web/commit/bde17b31f6ce256bba1720d751179b721f28e755",
    );
  });

  it("leaves non-commit local and test releases unlinked", () => {
    expect(getReleaseCommitUrl("dev")).toBeUndefined();
    expect(getReleaseCommitUrl("unknown")).toBeUndefined();
    expect(getReleaseCommitUrl("visual-test")).toBeUndefined();
  });
});
