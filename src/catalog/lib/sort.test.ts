import { CatalogSort as ProtoCatalogSort } from "@chill-institute/contracts/chill/v4/api_pb";
import { describe, expect, it } from "vite-plus/test";

import {
  catalogSortFromProto,
  catalogSorts,
  catalogSortToProto,
  parseCatalogSort,
  sortCatalog,
} from "./sort";

const items = [
  { title: "first", rating: 8, year: 2020, date: "2020-02-29" },
  { title: "missing", rating: 0, year: 2099, date: "" },
  { title: "second", rating: 9, year: 2020, date: "2020-01-01" },
  { title: "tied", rating: 8, year: 2020, date: "2020-02-29" },
];
const getDate = (item: { date: string }) => item.date;

describe("catalog sorting", () => {
  it("keeps provider order for rating ties and restores it without mutating cached results", () => {
    expect(sortCatalog(items, "rating-desc", getDate).map((item) => item.title)).toEqual([
      "second",
      "first",
      "tied",
      "missing",
    ]);
    expect(sortCatalog(items, "default", getDate)).toBe(items);
    expect(items[0]?.title).toBe("first");
  });

  it.each([
    ["rating-asc", ["first", "tied", "second", "missing"]],
    ["date-desc", ["first", "tied", "second", "missing"]],
    ["date-asc", ["second", "first", "tied", "missing"]],
  ] as const)("sorts %s by full dates without falling back to release year", (sort, expected) => {
    expect(sortCatalog(items, sort, getDate).map((item) => item.title)).toEqual(expected);
  });

  it.each(["date-asc", "date-desc"] as const)(
    "breaks %s same-day ties by highest rating, with missing ratings last",
    (sort) => {
      const sameDay = [
        { title: "unrated", date: "2020-01-01", rating: 0 },
        { title: "lower", date: "2020-01-01", rating: 7 },
        { title: "highest", date: "2020-01-01", rating: 9 },
        { title: "tied", date: "2020-01-01", rating: 9 },
        { title: "invalid", date: "2020-01-01", rating: NaN },
        { title: "older", date: "2019-12-31", rating: 10 },
      ];
      const sortedDay = ["highest", "tied", "lower", "unrated", "invalid"];
      expect(sortCatalog(sameDay, sort, getDate).map((item) => item.title)).toEqual(
        sort === "date-asc" ? ["older", ...sortedDay] : [...sortedDay, "older"],
      );
    },
  );

  it.each(["date-asc", "date-desc"] as const)(
    "keeps invalid dates last and stable for %s",
    (sort) => {
      const invalidDates = [
        "2021-02-29",
        "2020-02-30",
        "2020-13-01",
        "2020-00-01",
        "2020-01-00",
        "2020-1-01",
        "2020",
        "0000-01-01",
        "2020-01-01T00:00:00Z",
        "",
      ].map((date, index) => ({ date, rating: index + 1 }));
      const valid = { date: "1960-01-01", rating: 0 };
      expect(sortCatalog([...invalidDates, valid], sort, getDate)).toEqual([
        valid,
        ...invalidDates,
      ]);
    },
  );

  it.each(["rating-asc", "rating-desc"] as const)("keeps invalid ratings last for %s", (sort) => {
    const invalidRatings = [NaN, Infinity, -1, 0].map((rating) => ({ rating, date: "" }));
    const rated = { rating: 8, date: "" };
    expect(sortCatalog([...invalidRatings, rated], sort, getDate)).toEqual([
      rated,
      ...invalidRatings,
    ]);
  });

  it("maps preferences independently from search sorting and preserves explicit popularity", () => {
    for (const sort of catalogSorts) {
      expect(catalogSortFromProto(catalogSortToProto(sort))).toBe(sort);
      expect(parseCatalogSort(sort)).toBe(sort);
    }
    expect(catalogSortToProto("default")).toBe(ProtoCatalogSort.POPULARITY);
    expect(catalogSortToProto("date-desc")).toBe(ProtoCatalogSort.RELEASE_DATE_DESC);
    expect(catalogSortToProto("date-asc")).toBe(ProtoCatalogSort.RELEASE_DATE_ASC);
    expect(catalogSortFromProto(undefined)).toBe("default");
    expect(catalogSortFromProto(ProtoCatalogSort.UNSPECIFIED)).toBe("default");
    expect(parseCatalogSort("year-desc")).toBe("date-desc");
    expect(parseCatalogSort("year-asc")).toBe("date-asc");
    expect(parseCatalogSort("random")).toBeUndefined();
  });
});
