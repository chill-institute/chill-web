import { describe, expect, it } from "vite-plus/test";

import { sortCatalog } from "./sort";

const items = [
  { title: "first", rating: 8, year: 2020 },
  { title: "missing", rating: 0, year: 0 },
  { title: "second", rating: 9, year: 2010 },
  { title: "tied", rating: 8, year: 2020 },
];

describe("catalog sorting", () => {
  it("keeps provider order for ties and restores it without mutating cached results", () => {
    expect(sortCatalog(items, "rating-desc").map((item) => item.title)).toEqual([
      "second",
      "first",
      "tied",
      "missing",
    ]);
    expect(sortCatalog(items, "default")).toEqual(items);
    expect(items[0]?.title).toBe("first");
  });

  it.each([
    ["rating-asc", ["first", "tied", "second", "missing"]],
    ["year-desc", ["first", "tied", "second", "missing"]],
    ["year-asc", ["second", "first", "tied", "missing"]],
  ] as const)("sorts %s with unknown values last", (sort, expected) => {
    expect(sortCatalog(items, sort).map((item) => item.title)).toEqual(expected);
  });

  it("keeps non-finite values last in both directions", () => {
    const invalid = [{ rating: NaN, year: Infinity }, ...items];
    expect(sortCatalog(invalid, "rating-asc").slice(-2)).toEqual([invalid[0], items[1]]);
    expect(sortCatalog(invalid, "year-desc").slice(-2)).toEqual([invalid[0], items[1]]);
  });
});
