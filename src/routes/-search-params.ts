import * as v from "valibot";

import { moviesSources, tvShowsSources } from "@/catalog/lib/types";
import { parseCatalogSort } from "@/catalog/lib/sort";

const numericSearchParam = v.union([
  v.number(),
  v.pipe(
    v.string(),
    v.check((value) => /^\d+$/.test(value)),
    v.transform((value) => Number(value)),
  ),
]);

const stringSearchParam = v.fallback(v.optional(v.string()), undefined);

function numberFrom(values: readonly number[]) {
  return v.fallback(
    v.optional(
      v.pipe(
        numericSearchParam,
        v.check((value) => values.includes(value)),
      ),
    ),
    undefined,
  );
}

const positiveIntegerSearchParam = v.fallback(
  v.optional(v.pipe(numericSearchParam, v.integer(), v.minValue(1))),
  undefined,
);

const movieSourceSearchParam = numberFrom(moviesSources);
const tvShowsSourceSearchParam = numberFrom(tvShowsSources);
const catalogSortSearchParam = v.fallback(
  v.optional(v.pipe(v.string(), v.transform(parseCatalogSort))),
  undefined,
);

const movieCatalogSearchSchema = v.object({
  source: movieSourceSearchParam,
  sort: catalogSortSearchParam,
});

const tvShowsCatalogSearchSchema = v.object({
  source: tvShowsSourceSearchParam,
  sort: catalogSortSearchParam,
});

const tvShowDetailSearchSchema = v.object({
  season: positiveIntegerSearchParam,
  source: tvShowsSourceSearchParam,
  sort: catalogSortSearchParam,
});

const searchRouteSearchSchema = v.object({
  q: stringSearchParam,
});

const signInSearchSchema = v.object({
  callbackUrl: stringSearchParam,
  error: stringSearchParam,
});

const signOutSearchSchema = v.object({
  error: stringSearchParam,
});

type SignInSearch = v.InferOutput<typeof signInSearchSchema>;

export {
  movieCatalogSearchSchema,
  searchRouteSearchSchema,
  signInSearchSchema,
  signOutSearchSchema,
  tvShowDetailSearchSchema,
  tvShowsCatalogSearchSchema,
};
export type { SignInSearch };
