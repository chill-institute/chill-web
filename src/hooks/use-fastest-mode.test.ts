import { describe, expect, it } from "vite-plus/test";

import { computeFastestPhase } from "./use-fastest-mode";

const emptySearch = {
  results: [],
  totalCount: 0,
  nonEmptyResolvedCount: 0,
  pendingCount: 0,
  hasPending: false,
};

describe("computeFastestPhase", () => {
  it("stays idle while fastest mode has pending indexers and no quorum", () => {
    expect(
      computeFastestPhase(
        "idle",
        {
          ...emptySearch,
          totalCount: 4,
          nonEmptyResolvedCount: 1,
          pendingCount: 3,
          hasPending: true,
        },
        1,
      ),
    ).toBe("idle");
  });

  it("shows fastest results once enough indexers return useful rows", () => {
    expect(
      computeFastestPhase(
        "idle",
        {
          ...emptySearch,
          results: [{ length: 1 }],
          totalCount: 4,
          nonEmptyResolvedCount: 2,
          pendingCount: 2,
          hasPending: true,
        },
        2,
      ),
    ).toBe("fastest");
  });

  it("moves from fastest to all when every indexer resolves", () => {
    expect(
      computeFastestPhase(
        "fastest",
        {
          ...emptySearch,
          results: [{ length: 1 }],
          totalCount: 3,
          nonEmptyResolvedCount: 2,
          pendingCount: 0,
          hasPending: false,
        },
        2,
      ),
    ).toBe("all");
  });

  it("distinguishes all-done empty results from all-done populated results", () => {
    expect(
      computeFastestPhase(
        "idle",
        {
          ...emptySearch,
          totalCount: 2,
          pendingCount: 0,
          hasPending: false,
        },
        0,
      ),
    ).toBe("empty");

    expect(
      computeFastestPhase(
        "idle",
        {
          ...emptySearch,
          results: [{ length: 1 }],
          totalCount: 2,
          nonEmptyResolvedCount: 1,
          pendingCount: 0,
          hasPending: false,
        },
        1,
      ),
    ).toBe("all");
  });
});
