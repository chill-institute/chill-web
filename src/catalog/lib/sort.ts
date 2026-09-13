import { CatalogSort as ProtoCatalogSort } from "@chill-institute/contracts/chill/v4/api_pb";

export const catalogSorts = [
  "default",
  "rating-desc",
  "rating-asc",
  "date-desc",
  "date-asc",
] as const;

export type CatalogSort = (typeof catalogSorts)[number];

export const catalogSortLabels: Record<CatalogSort, string> = {
  default: "popularity",
  "rating-desc": "rating: high to low",
  "rating-asc": "rating: low to high",
  "date-desc": "date: newest first",
  "date-asc": "date: oldest first",
};

const protoSorts: Record<CatalogSort, ProtoCatalogSort> = {
  default: ProtoCatalogSort.POPULARITY,
  "rating-desc": ProtoCatalogSort.RATING_DESC,
  "rating-asc": ProtoCatalogSort.RATING_ASC,
  "date-desc": ProtoCatalogSort.RELEASE_DATE_DESC,
  "date-asc": ProtoCatalogSort.RELEASE_DATE_ASC,
};

export function catalogSortToProto(sort: CatalogSort): ProtoCatalogSort {
  return protoSorts[sort];
}

export function catalogSortFromProto(sort: ProtoCatalogSort | undefined): CatalogSort {
  return catalogSorts.find((value) => protoSorts[value] === sort) ?? "default";
}

export function parseCatalogSort(value: string): CatalogSort | undefined {
  if (value === "year-desc") return "date-desc";
  if (value === "year-asc") return "date-asc";
  return catalogSorts.find((sort) => sort === value);
}

function dateValue(value: string): number {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || value.startsWith("0000")) return NaN;
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) && new Date(timestamp).toISOString().slice(0, 10) === value
    ? timestamp
    : NaN;
}

function ratingValue(value: number): number {
  return Number.isFinite(value) && value > 0 ? value : NaN;
}

function compareValues(left: number, right: number, direction: number): number {
  const hasLeft = Number.isFinite(left);
  const hasRight = Number.isFinite(right);
  if (!hasLeft || !hasRight) return Number(hasRight) - Number(hasLeft);
  return (left - right) * direction;
}

export function sortCatalog<T extends { rating: number }>(
  items: readonly T[],
  sort: CatalogSort,
  getDate: (item: T) => string,
): readonly T[] {
  if (sort === "default") return items;
  const byRating = sort === "rating-desc" || sort === "rating-asc";
  const direction = sort === "rating-asc" || sort === "date-asc" ? 1 : -1;
  return items.toSorted((a, b) => {
    if (byRating) return compareValues(ratingValue(a.rating), ratingValue(b.rating), direction);
    const left = dateValue(getDate(a));
    const right = dateValue(getDate(b));
    const difference = compareValues(left, right, direction);
    if (difference !== 0 || !Number.isFinite(left) || !Number.isFinite(right)) return difference;
    return compareValues(ratingValue(a.rating), ratingValue(b.rating), -1);
  });
}
