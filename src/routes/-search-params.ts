import * as v from "valibot";

import { moviesSources, tvShowsSources } from "@/catalog/lib/types";

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

const movieCatalogSearchSchema = v.object({
  source: movieSourceSearchParam,
});

const tvShowsCatalogSearchSchema = v.object({
  source: tvShowsSourceSearchParam,
});

const tvShowDetailSearchSchema = v.object({
  season: positiveIntegerSearchParam,
  source: tvShowsSourceSearchParam,
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

function validateSignOutSearch(search: unknown): SignOutSearch {
  const result = v.safeParse(signOutSearchSchema, search);
  return result.success ? result.output : {};
}

type SignOutSearch = v.InferOutput<typeof signOutSearchSchema>;

export {
  movieCatalogSearchSchema,
  searchRouteSearchSchema,
  signInSearchSchema,
  signOutSearchSchema,
  tvShowDetailSearchSchema,
  tvShowsCatalogSearchSchema,
  validateSignOutSearch,
};
