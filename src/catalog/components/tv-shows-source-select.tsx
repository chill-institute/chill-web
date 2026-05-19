import { NativeSelect } from "@/ui/components/ui/native-select";
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
    <NativeSelect
      aria-label="TV source"
      name="tv-source"
      value={String(value)}
      wrapperClassName="w-full sm:w-44"
      className="h-8 text-sm"
      onChange={(event) => {
        const parsed = parseTVShowsSource(event.currentTarget.value);
        if (parsed === undefined) {
          return;
        }
        onChange(parsed);
      }}
    >
      {tvShowsSources.map((source) => (
        <option key={source} value={String(source)}>
          {getTVShowsSourceLabel(source)}
        </option>
      ))}
    </NativeSelect>
  );
}
