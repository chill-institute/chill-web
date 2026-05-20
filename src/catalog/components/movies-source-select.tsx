import { CatalogSourceSelect } from "@/catalog/components/catalog-source-select";
import {
  moviesSourceLabels,
  moviesSources,
  parseMoviesSource,
  type CatalogAppSettings,
} from "@/catalog/lib/types";

export function MoviesSourceSelect({
  value,
  onChange,
}: {
  value: CatalogAppSettings["moviesSource"];
  onChange: (value: CatalogAppSettings["moviesSource"]) => void;
}) {
  return (
    <CatalogSourceSelect
      label="Movie source"
      name="movie-source"
      value={value}
      sources={moviesSources}
      getLabel={(source) => moviesSourceLabels[source]}
      parse={parseMoviesSource}
      widthClassName="w-full sm:w-52"
      onChange={onChange}
    />
  );
}
