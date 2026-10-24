import { describe, expect, it } from "vite-plus/test";
import { create } from "@bufbuild/protobuf";
import { BingeItemSchema, BingeMediaType } from "@chill-institute/contracts/chill/v4/api_pb";

import {
  BINGE_COMMENT_MAX_LENGTH,
  BINGE_TITLE_MAX_LENGTH,
  bingeDraftToInput,
  bingeItemToMovie,
  normalizeIMDbId,
  validateBingeDraft,
  type BingeDraft,
} from "./types";

function draft(overrides: Partial<BingeDraft> = {}): BingeDraft {
  return {
    title: "Slow burns",
    blurb: "",
    items: [{ key: "a", imdbId: "tt0903747", comment: "" }],
    ...overrides,
  };
}

describe("normalizeIMDbId", () => {
  it("accepts ids and imdb urls", () => {
    expect(normalizeIMDbId("tt0903747")).toBe("tt0903747");
    expect(normalizeIMDbId(" TT0903747 ")).toBe("tt0903747");
    expect(normalizeIMDbId("https://www.imdb.com/title/tt0903747/?ref_=nv_sr")).toBe("tt0903747");
    expect(normalizeIMDbId("tt12345678")).toBe("tt12345678");
  });

  it("rejects other values", () => {
    expect(normalizeIMDbId("")).toBe("");
    expect(normalizeIMDbId("tt123")).toBe("");
    expect(normalizeIMDbId("nm0000001")).toBe("");
    expect(normalizeIMDbId("Breaking Bad")).toBe("");
  });
});

describe("validateBingeDraft", () => {
  it("passes a complete draft", () => {
    expect(validateBingeDraft(draft())).toBeNull();
  });

  it("ignores empty item rows", () => {
    expect(
      validateBingeDraft(
        draft({
          items: [
            { key: "a", imdbId: "tt0903747", comment: "" },
            { key: "b", imdbId: "", comment: "" },
          ],
        }),
      ),
    ).toBeNull();
  });

  it("requires a title and at least one item", () => {
    const errors = validateBingeDraft(draft({ title: "  ", items: [] }));
    expect(errors?.title).toBe("give the binge a title");
    expect(errors?.items).toBe("add at least one title");
  });

  it("flags bad, duplicate, and over-long items by key", () => {
    const errors = validateBingeDraft(
      draft({
        items: [
          { key: "a", imdbId: "not-an-id", comment: "" },
          { key: "b", imdbId: "tt0903747", comment: "" },
          { key: "c", imdbId: "TT0903747", comment: "" },
          { key: "d", imdbId: "tt0111161", comment: "x".repeat(BINGE_COMMENT_MAX_LENGTH + 1) },
        ],
      }),
    );
    expect(errors?.itemErrors).toEqual({
      a: "needs an IMDb title id like tt0903747",
      c: "already in this binge",
      d: `keep the comment under ${BINGE_COMMENT_MAX_LENGTH} characters`,
    });
  });

  it("limits the title length", () => {
    const errors = validateBingeDraft(draft({ title: "x".repeat(BINGE_TITLE_MAX_LENGTH + 1) }));
    expect(errors?.title).toContain("under");
  });
});

describe("bingeDraftToInput", () => {
  it("trims, normalizes ids, and drops empty rows", () => {
    expect(
      bingeDraftToInput(
        draft({
          title: " Slow burns ",
          blurb: " patience ",
          items: [
            { key: "a", imdbId: " https://imdb.com/title/tt0903747 ", comment: " start here " },
            { key: "b", imdbId: "", comment: "" },
          ],
        }),
      ),
    ).toEqual({
      title: "Slow burns",
      blurb: "patience",
      items: [{ imdbId: "tt0903747", comment: "start here" }],
    });
  });
});

describe("bingeItemToMovie", () => {
  it("carries the fields the movie modal reads", () => {
    const movie = bingeItemToMovie(
      create(BingeItemSchema, {
        imdbId: "tt0111161",
        mediaType: BingeMediaType.MOVIE,
        title: "The Shawshank Redemption",
        year: 1994,
        posterUrl: "/p.jpg",
        rating: 9.3,
        genres: ["Drama"],
      }),
    );
    expect(movie.id).toBe("tt0111161");
    expect(movie.title).toBe("The Shawshank Redemption");
    expect(movie.year).toBe(1994);
    expect(movie.rating).toBe(9.3);
    expect(movie.genres).toEqual(["Drama"]);
  });
});
