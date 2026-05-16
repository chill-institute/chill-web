import { ToggleGroup, ToggleGroupItem } from "@chill-institute/ui/components/ui/toggle-group";
import { tabsContainerClass } from "@chill-institute/ui/components/tabs";
import { cn } from "@chill-institute/ui/cn";
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
      variant="tab"
      className={cn(
        tabsContainerClass,
        "order-3 w-full justify-start overflow-x-auto sm:order-none sm:w-auto",
      )}
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
          className="h-8 shrink-0 gap-1.5 whitespace-nowrap px-2.5 text-base sm:h-7 sm:text-sm"
        >
          {tvShowsSourceTabLabels[source]}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  );
}
