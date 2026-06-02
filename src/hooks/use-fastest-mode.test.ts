import { describe, expect, it } from "vite-plus/test";

import { deriveFastestModel, getFastestToast } from "./use-fastest-mode";

const emptySearch = {
  results: [],
  totalCount: 0,
  nonEmptyResolvedCount: 0,
  pendingCount: 0,
  hasPending: false,
};
const sourceKey = JSON.stringify(["yts", "rarbg"]);

describe("deriveFastestModel", () => {
  it("stays idle when fastest mode is disabled or query is blank", () => {
    expect(
      deriveFastestModel({
        enabled: false,
        generation: 0,
        intent: { tag: "auto" },
        query: "thor",
        search: { ...emptySearch, hasPending: true, pendingCount: 2, totalCount: 2 },
        sourceKey,
        snapshot: null,
      }).state,
    ).toEqual({ tag: "idle" });

    expect(
      deriveFastestModel({
        enabled: true,
        generation: 0,
        intent: { tag: "auto" },
        query: "",
        search: { ...emptySearch, hasPending: true, pendingCount: 2, totalCount: 2 },
        sourceKey,
        snapshot: null,
      }).state,
    ).toEqual({ tag: "idle" });
  });

  it("loads while fastest mode has pending indexers and no result quorum", () => {
    expect(
      deriveFastestModel({
        enabled: true,
        generation: 0,
        intent: { tag: "auto" },
        query: "thor",
        search: {
          ...emptySearch,
          results: ["first"],
          totalCount: 4,
          nonEmptyResolvedCount: 1,
          pendingCount: 3,
          hasPending: true,
        },
        sourceKey,
        snapshot: null,
      }).state,
    ).toEqual({ query: "thor", tag: "loading" });
  });

  it("previews a snapshot once enough indexers return useful rows", () => {
    const model = deriveFastestModel({
      enabled: true,
      generation: 0,
      intent: { tag: "auto" },
      query: "thor",
      search: {
        ...emptySearch,
        results: ["first", "second"],
        totalCount: 4,
        nonEmptyResolvedCount: 2,
        pendingCount: 2,
        hasPending: true,
      },
      sourceKey,
      snapshot: null,
    });

    expect(model.state).toEqual({
      availableCount: 2,
      pendingCount: 2,
      query: "thor",
      results: ["first", "second"],
      tag: "preview",
    });
    expect(model.snapshot).toEqual({
      query: "thor",
      results: ["first", "second"],
      sourceKey,
    });
  });

  it("keeps the preview snapshot stable while later indexers resolve", () => {
    const model = deriveFastestModel({
      enabled: true,
      generation: 0,
      intent: { tag: "auto" },
      query: "thor",
      search: {
        ...emptySearch,
        results: ["first", "second", "late"],
        totalCount: 4,
        nonEmptyResolvedCount: 3,
        pendingCount: 1,
        hasPending: true,
      },
      sourceKey,
      snapshot: {
        query: "thor",
        results: ["first", "second"],
        sourceKey,
      },
    });

    expect(model.state).toEqual({
      availableCount: 3,
      pendingCount: 1,
      query: "thor",
      results: ["first", "second"],
      tag: "preview",
    });
  });

  it("keeps the preview snapshot visible after all indexers finish", () => {
    const model = deriveFastestModel({
      enabled: true,
      generation: 0,
      intent: { tag: "auto" },
      query: "thor",
      search: {
        ...emptySearch,
        results: ["first", "second", "late"],
        totalCount: 4,
        nonEmptyResolvedCount: 4,
        pendingCount: 0,
        hasPending: false,
      },
      sourceKey,
      snapshot: {
        query: "thor",
        results: ["first", "second"],
        sourceKey,
      },
    });

    expect(model.state).toEqual({
      availableCount: 3,
      pendingCount: 0,
      query: "thor",
      results: ["first", "second"],
      tag: "preview",
    });
  });

  it("drops a preview snapshot when the active source set changes", () => {
    const model = deriveFastestModel({
      enabled: true,
      generation: 1,
      intent: { tag: "auto" },
      query: "thor",
      search: {
        ...emptySearch,
        results: ["remaining"],
        totalCount: 1,
        nonEmptyResolvedCount: 1,
        pendingCount: 0,
        hasPending: false,
      },
      sourceKey: JSON.stringify(["yts"]),
      snapshot: {
        query: "thor",
        results: ["first", "removed-source"],
        sourceKey,
      },
    });

    expect(model).toEqual({ snapshot: null, state: { query: "thor", tag: "all" } });
  });

  it("moves from preview to all when the user asks for all results", () => {
    expect(
      deriveFastestModel({
        enabled: true,
        generation: 0,
        intent: { generation: 0, query: "thor", tag: "showAll" },
        query: "thor",
        search: {
          ...emptySearch,
          results: ["first", "second"],
          totalCount: 4,
          nonEmptyResolvedCount: 2,
          pendingCount: 2,
          hasPending: true,
        },
        sourceKey,
        snapshot: {
          query: "thor",
          results: ["first"],
          sourceKey,
        },
      }),
    ).toEqual({ snapshot: null, state: { query: "thor", tag: "all" } });
  });

  it("does not carry a show-all intent or preview snapshot across queries", () => {
    expect(
      deriveFastestModel({
        enabled: true,
        generation: 1,
        intent: { generation: 0, query: "thor", tag: "showAll" },
        query: "alien",
        search: {
          ...emptySearch,
          results: ["alien-fast"],
          totalCount: 2,
          nonEmptyResolvedCount: 1,
          pendingCount: 1,
          hasPending: true,
        },
        sourceKey,
        snapshot: {
          query: "thor",
          results: ["thor-fast"],
          sourceKey,
        },
      }).state,
    ).toEqual({
      availableCount: 1,
      pendingCount: 1,
      query: "alien",
      results: ["alien-fast"],
      tag: "preview",
    });
  });

  it("does not carry a show-all intent back to the same query after the search generation changes", () => {
    expect(
      deriveFastestModel({
        enabled: true,
        generation: 2,
        intent: { generation: 0, query: "thor", tag: "showAll" },
        query: "thor",
        search: {
          ...emptySearch,
          results: ["first"],
          totalCount: 4,
          nonEmptyResolvedCount: 1,
          pendingCount: 3,
          hasPending: true,
        },
        sourceKey,
        snapshot: null,
      }).state,
    ).toEqual({ query: "thor", tag: "loading" });
  });

  it("distinguishes all-done empty results from all-done populated results", () => {
    expect(
      deriveFastestModel({
        enabled: true,
        generation: 0,
        intent: { tag: "auto" },
        query: "thor",
        search: {
          ...emptySearch,
          totalCount: 2,
          pendingCount: 0,
          hasPending: false,
        },
        sourceKey,
        snapshot: null,
      }).state,
    ).toEqual({ query: "thor", tag: "empty" });

    expect(
      deriveFastestModel({
        enabled: true,
        generation: 0,
        intent: { tag: "auto" },
        query: "thor",
        search: {
          ...emptySearch,
          results: ["first"],
          totalCount: 2,
          nonEmptyResolvedCount: 1,
          pendingCount: 0,
          hasPending: false,
        },
        sourceKey,
        snapshot: null,
      }).state,
    ).toEqual({ query: "thor", tag: "all" });
  });
});

describe("getFastestToast", () => {
  it("declares the Sonner toast only while previewing partial fastest results", () => {
    expect(getFastestToast({ query: "thor", tag: "loading" })).toBeNull();
    expect(getFastestToast({ query: "thor", tag: "all" })).toBeNull();
    expect(
      getFastestToast({
        availableCount: 2,
        query: "thor",
        pendingCount: 2,
        results: ["first", "second"],
        tag: "preview",
      }),
    ).toBeNull();
    expect(
      getFastestToast({
        availableCount: 3,
        query: "thor",
        pendingCount: 2,
        results: ["first", "second"],
        tag: "preview",
      }),
    ).toEqual({
      action: {
        intent: { query: "thor", tag: "showAll" },
        label: "Update",
      },
      id: "fastest-mode-search",
      kind: "loading",
      message: "Fetching more from 2 indexers",
    });
    expect(
      getFastestToast({
        availableCount: 3,
        query: "thor",
        pendingCount: 0,
        results: ["first", "second"],
        tag: "preview",
      }),
    ).toEqual({
      action: {
        intent: { query: "thor", tag: "showAll" },
        label: "Update",
      },
      id: "fastest-mode-search",
      kind: "default",
      message: "Found 1 more result",
    });
  });
});
