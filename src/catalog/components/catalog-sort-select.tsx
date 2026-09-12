import { NativeSelect } from "@/ui/components/ui/native-select";
import {
  catalogSortLabels,
  catalogSorts,
  parseCatalogSort,
  type CatalogSort,
} from "@/catalog/lib/sort";

export function CatalogSortSelect({
  value,
  onChange,
}: {
  value: CatalogSort;
  onChange: (value: CatalogSort) => void;
}) {
  return (
    <NativeSelect
      aria-label="Sort by"
      name="catalog-sort"
      value={value}
      wrapperClassName="w-full sm:w-52"
      className="h-8 min-w-0 py-0 text-sm"
      onChange={(event) => {
        const sort = parseCatalogSort(event.currentTarget.value);
        if (sort !== undefined) onChange(sort);
      }}
    >
      {catalogSorts.map((sort) => (
        <option key={sort} value={sort}>
          {catalogSortLabels[sort]}
        </option>
      ))}
    </NativeSelect>
  );
}
