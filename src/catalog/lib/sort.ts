export const catalogSorts = [
  "default",
  "rating-desc",
  "rating-asc",
  "year-desc",
  "year-asc",
] as const;

export type CatalogSort = (typeof catalogSorts)[number];

export const catalogSortLabels: Record<CatalogSort, string> = {
  default: "popularity",
  "rating-desc": "rating: high to low",
  "rating-asc": "rating: low to high",
  "year-desc": "year: newest first",
  "year-asc": "year: oldest first",
};

export function parseCatalogSort(value: string): CatalogSort | undefined {
  return catalogSorts.find((sort) => sort === value);
}

export function sortCatalog<T extends { rating: number; year: number }>(
  items: readonly T[],
  sort: CatalogSort,
): readonly T[] {
  if (sort === "default") return items;
  const field = sort === "rating-desc" || sort === "rating-asc" ? "rating" : "year";
  const direction = sort === "rating-asc" || sort === "year-asc" ? 1 : -1;
  return items.toSorted((a, b) => {
    const left = a[field];
    const right = b[field];
    const hasLeft = Number.isFinite(left) && left > 0;
    const hasRight = Number.isFinite(right) && right > 0;
    if (!hasLeft || !hasRight) return Number(hasRight) - Number(hasLeft);
    const difference = (left - right) * direction;
    if (difference !== 0 || field === "rating") return difference;
    const leftRating = Number.isFinite(a.rating) && a.rating > 0 ? a.rating : 0;
    const rightRating = Number.isFinite(b.rating) && b.rating > 0 ? b.rating : 0;
    return rightRating - leftRating;
  });
}
