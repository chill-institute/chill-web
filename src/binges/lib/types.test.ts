import { describe, expect, it } from "vite-plus/test";
import { BingeMediaType } from "@chill-institute/contracts/chill/v4/api_pb";

import {
  BINGE_COMMENT_MAX_LENGTH,
  BINGE_TITLE_MAX_LENGTH,
  bingeDraftToInput,
  curatorLabel,
  normalizeCuratorName,
  normalizeIMDbId,
  bingeTitleLabel,
  bingeToDraft,
  moveDraftItem,
  validateBingeDraft,
  type BingeDraft,
} from "./types";

const unresolved = {
  mediaType: BingeMediaType.UNSPECIFIED,
  title: "",
  year: 0,
  posterUrl: "",
};

function draft(overrides: Partial<BingeDraft> = {}): BingeDraft {
  return {
    title: "Slow burns",
    blurb: "",
    items: [{ key: "a", imdbId: "tt0903747", ...unresolved, comment: "" }],
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

  it("requires a title and at least one item", () => {
    const errors = validateBingeDraft(draft({ title: "  ", items: [] }));
    expect(errors?.title).toBe("give the binge a title");
    expect(errors?.items).toBe("add at least one title");
  });

  it("flags duplicate and over-long items by key", () => {
    const errors = validateBingeDraft(
      draft({
        items: [
          { key: "b", imdbId: "tt0903747", ...unresolved, comment: "" },
          { key: "c", imdbId: "TT0903747", ...unresolved, comment: "" },
          {
            key: "d",
            imdbId: "tt0111161",
            ...unresolved,
            comment: "x".repeat(BINGE_COMMENT_MAX_LENGTH + 1),
          },
        ],
      }),
    );
    expect(errors?.itemErrors).toEqual({
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
  it("trims text and normalizes ids", () => {
    expect(
      bingeDraftToInput(
        draft({
          title: " Slow burns ",
          blurb: " patience ",
          items: [
            {
              key: "a",
              imdbId: " https://imdb.com/title/tt0903747 ",
              ...unresolved,
              comment: " start here ",
            },
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

describe("normalizeCuratorName", () => {
  it("collapses whitespace and bounds the length", () => {
    expect(normalizeCuratorName("  the   night\nshift ")).toEqual({ name: "the night shift" });
    expect(normalizeCuratorName(" x ").error).toContain("at least");
    expect(normalizeCuratorName("x".repeat(41)).error).toContain("under");
  });
});

describe("curatorLabel", () => {
  it("falls back when no name was chosen", () => {
    expect(curatorLabel("Alberto")).toBe("Alberto");
    expect(curatorLabel("  ")).toBe("a curator");
    expect(curatorLabel(undefined)).toBe("a curator");
  });
});

describe("bingeTitleLabel", () => {
  it("joins title and year, and tolerates unknown years and titles", () => {
    expect(bingeTitleLabel("The Long Kiss Goodnight", 1996)).toBe("The Long Kiss Goodnight (1996)");
    expect(bingeTitleLabel(" Breaking Bad ", 0)).toBe("Breaking Bad");
    expect(bingeTitleLabel("", 1996)).toBe("");
  });

  it("carries what the editor shows for each item", () => {
    const draft = bingeToDraft(
      {
        id: "b1",
        title: "t",
        blurb: "",
        curatorName: "",
        items: [
          {
            imdbId: "tt0903747",
            mediaType: BingeMediaType.TV_SHOW,
            title: "Breaking Bad",
            year: 2008,
            posterUrl: "https://image.test/bb.jpg",
            comment: "slow start",
          },
        ],
      } as never,
      () => "k",
    );
    expect(draft.items).toEqual([
      {
        key: "k",
        imdbId: "tt0903747",
        mediaType: BingeMediaType.TV_SHOW,
        title: "Breaking Bad",
        year: 2008,
        posterUrl: "https://image.test/bb.jpg",
        comment: "slow start",
      },
    ]);
  });

  it("starts a new binge with an empty list", () => {
    expect(bingeToDraft(undefined, () => "k").items).toEqual([]);
  });
});

describe("moveDraftItem", () => {
  const three = draft({
    items: ["a", "b", "c"].map((key) => ({
      key,
      imdbId: `tt000000${key.charCodeAt(0)}`,
      ...unresolved,
      comment: "",
    })),
  });
  const order = (value: BingeDraft) => value.items.map((item) => item.key).join("");

  it("moves an item to a new position", () => {
    expect(order(moveDraftItem(three, "a", 2))).toBe("bca");
    expect(order(moveDraftItem(three, "c", 0))).toBe("cab");
  });

  it("clamps out-of-range targets and ignores unknown keys", () => {
    expect(order(moveDraftItem(three, "b", 9))).toBe("acb");
    expect(order(moveDraftItem(three, "b", -1))).toBe("bac");
    expect(moveDraftItem(three, "z", 0)).toBe(three);
  });
});
