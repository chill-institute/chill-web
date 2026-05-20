import { CatalogSourceSelect } from "@/catalog/components/catalog-source-select";
import {
  getTVShowsSourceLabel,
  parseTVShowsSource,
  tvShowsSources,
  type CatalogAppSettings,
} from "@/catalog/lib/types";

export function TVShowsSourceSelect({
  value,
  onChange,
}: {
  value: CatalogAppSettings["tvShowsSource"];
  onChange: (value: CatalogAppSettings["tvShowsSource"]) => void;
}) {
  return (
    <CatalogSourceSelect
      label="TV source"
      name="tv-source"
      value={value}
      sources={tvShowsSources}
      getLabel={getTVShowsSourceLabel}
      parse={parseTVShowsSource}
      widthClassName="w-full sm:w-44"
      onChange={onChange}
    />
  );
}
