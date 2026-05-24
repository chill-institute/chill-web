import { describe, expect, it } from "vite-plus/test";
import * as v from "valibot";

import {
  movieCatalogSearchSchema,
  searchRouteSearchSchema,
  signInSearchSchema,
  tvShowDetailSearchSchema,
} from "./-search-params";

describe("route search schemas", () => {
  it("coerces known movie sources from URL strings", () => {
    const result = v.parse(movieCatalogSearchSchema, { source: "2" });

    expect(result.source).toBe(2);
  });

  it("drops unknown source and season params", () => {
    const result = v.parse(tvShowDetailSearchSchema, {
      season: "nope",
      source: "999",
    });

    expect(result).toEqual({
      season: undefined,
      source: undefined,
    });
  });

  it("does not coerce non-decimal season syntax", () => {
    expect(v.parse(tvShowDetailSearchSchema, { season: "2e2" }).season).toBeUndefined();
    expect(v.parse(tvShowDetailSearchSchema, { season: "0x10" }).season).toBeUndefined();
    expect(v.parse(tvShowDetailSearchSchema, { season: "02" }).season).toBe(2);
  });

  it("keeps only string sign-in and search fields", () => {
    expect(v.parse(searchRouteSearchSchema, { q: 42 }).q).toBeUndefined();
    expect(
      v.parse(signInSearchSchema, { callbackUrl: "/movies", error: 404, code: "oauth" }),
    ).toEqual({
      callbackUrl: "/movies",
      error: undefined,
    });
  });
});
