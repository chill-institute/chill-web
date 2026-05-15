import { ToggleGroup, ToggleGroupItem } from "@chill-institute/ui/components/ui/toggle-group";
import { tabItemBaseClass, tabsContainerClass } from "@chill-institute/ui/components/tabs";
import { cn } from "@chill-institute/ui/lib/cn";
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
          className={cn(
            tabItemBaseClass,
            "whitespace-nowrap data-[pressed]:bg-hover data-[pressed]:text-fg-1",
          )}
        >
          {moviesSourceTabLabels[source]}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  );
}
