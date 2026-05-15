import { ToggleGroup, ToggleGroupItem } from "@chill-institute/ui/components/ui/toggle-group";
import { tabItemBaseClass, tabsContainerClass } from "@chill-institute/ui/components/tabs";
import { cn } from "@chill-institute/ui/lib/cn";
import {
  getTVShowsSourceLabel,
  parseTVShowsSource,
  TVShowsSource,
  tvShowsSources,
  type UserSettings,
} from "@/lib/types";

const tvShowsSourceTabLabels: Record<UserSettings["tvShowsSource"], string> = {
  [TVShowsSource.TV_SHOWS_SOURCE_UNSPECIFIED]: "netflix",
  [TVShowsSource.TV_SHOWS_SOURCE_NETFLIX]: "netflix",
  [TVShowsSource.TV_SHOWS_SOURCE_HBO_MAX]: "hbo max",
  [TVShowsSource.TV_SHOWS_SOURCE_APPLE_TV_PLUS]: "apple tv+",
  [TVShowsSource.TV_SHOWS_SOURCE_PRIME_VIDEO]: "prime",
  [TVShowsSource.TV_SHOWS_SOURCE_DISNEY_PLUS]: "disney+",
};

export function TVShowsSourceSelect({
  value,
  onChange,
}: {
  value: UserSettings["tvShowsSource"];
  onChange: (value: UserSettings["tvShowsSource"]) => void;
}) {
  return (
    <ToggleGroup
      className={tabsContainerClass}
      onValueChange={(next) => {
        if (next.length === 0) {
          return;
        }
        const parsed = parseTVShowsSource(next[0]);
        if (parsed === undefined) {
          return;
        }
        onChange(parsed);
      }}
      value={[String(value)]}
    >
      {tvShowsSources.map((source) => (
        <ToggleGroupItem
          key={source}
          value={String(source)}
          aria-label={getTVShowsSourceLabel(source)}
          className={cn(
            tabItemBaseClass,
            "whitespace-nowrap data-[pressed]:bg-hover data-[pressed]:text-fg-1",
          )}
        >
          {tvShowsSourceTabLabels[source]}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  );
}
