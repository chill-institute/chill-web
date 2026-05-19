import { NativeSelect } from "@/ui/components/ui/native-select";
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
    <NativeSelect
      aria-label="Movie source"
      name="movie-source"
      value={String(value)}
      wrapperClassName="w-full sm:w-52"
      className="h-8 text-sm"
      onChange={(event) => {
        const parsed = parseMoviesSource(event.currentTarget.value);
        if (parsed === undefined) {
          return;
        }
        onChange(parsed);
      }}
    >
      {moviesSources.map((source) => (
        <option key={source} value={String(source)}>
          {moviesSourceLabels[source]}
        </option>
      ))}
    </NativeSelect>
  );
}
