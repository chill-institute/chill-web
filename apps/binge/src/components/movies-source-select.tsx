import { ToggleGroup, ToggleGroupItem } from "@chill-institute/ui/components/ui/toggle-group";
import { tabsContainerClass } from "@chill-institute/ui/components/tabs";
import {
  moviesSourceLabels,
  moviesSources,
  MoviesSource,
  parseMoviesSource,
  type UserSettings,
} from "@/lib/types";

const moviesSourceTabLabels: Record<UserSettings["moviesSource"], string> = {
  [MoviesSource.UNSPECIFIED]: "imdb moviemeter",
  [MoviesSource.IMDB_MOVIEMETER]: "imdb moviemeter",
  [MoviesSource.IMDB_TOP_250]: "imdb top 250",
  [MoviesSource.YTS]: "yts",
  [MoviesSource.ROTTEN_TOMATOES]: "rotten tomatoes",
  [MoviesSource.TRAKT]: "trakt",
};

export function MoviesSourceSelect({
  value,
  onChange,
}: {
  value: UserSettings["moviesSource"];
  onChange: (value: UserSettings["moviesSource"]) => void;
}) {
  return (
    <ToggleGroup
      variant="tab"
      className={tabsContainerClass}
      onValueChange={(next) => {
        if (next.length === 0) {
          return;
        }
        const parsed = parseMoviesSource(next[0]);
        if (parsed === undefined) {
          return;
        }
        onChange(parsed);
      }}
      value={[String(value)]}
    >
      {moviesSources.map((source) => (
        <ToggleGroupItem
          key={source}
          value={String(source)}
          aria-label={moviesSourceLabels[source]}
          className="h-7 gap-1.5 whitespace-nowrap px-2.5"
        >
          {moviesSourceTabLabels[source]}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  );
}
