import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { topMoviesSourceLabels, topMoviesSources, type UserSettings } from "@/lib/types";

export function TopMoviesSourceSelect({
  value,
  onChange,
}: {
  value: UserSettings["topMoviesSource"];
  onChange: (value: UserSettings["topMoviesSource"]) => void;
}) {
  return (
    <Select
      onValueChange={(v) => {
        onChange(Number(v) as UserSettings["topMoviesSource"]);
      }}
      value={String(value)}
      items={Object.fromEntries(topMoviesSources.map((s) => [String(s), topMoviesSourceLabels[s]]))}
    >
      <SelectTrigger className="min-w-[160px]">
        <SelectValue />
      </SelectTrigger>

      <SelectContent>
        {topMoviesSources.map((source) => (
          <SelectItem key={source} value={String(source)}>
            {topMoviesSourceLabels[source]}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
