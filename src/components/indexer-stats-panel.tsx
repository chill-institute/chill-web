import { Checkbox } from "@/ui/components/ui/checkbox";
import { cn } from "@/ui/lib/cn";
import type { IndexerStat } from "@/lib/types";

type IndexerRow = {
  id: string;
  name: string;
};

type Props = {
  indexers: IndexerRow[];
  stats: IndexerStat[];
  disabledIndexerIds: string[];
  onToggle: (id: string) => void;
};

export function IndexerStatsPanel({ indexers, stats, disabledIndexerIds, onToggle }: Props) {
  if (indexers.length === 0) return null;

  const statByID = new Map(stats.map((stat) => [stat.id || stat.name, stat]));
  const disabled = new Set(disabledIndexerIds);

  const responded = stats.length;
  const totalResults = stats.reduce((sum, s) => sum + s.resultCount, 0);
  const totalMs = stats.reduce((sum, s) => sum + s.elapsedMs, 0);
  const failedCount = stats.filter((s) => s.error.length > 0).length;
  const slowest = stats.reduce<IndexerStat | null>(
    (max, s) => (max === null || s.elapsedMs > max.elapsedMs ? s : max),
    null,
  );

  return (
    <section
      aria-label="Indexer response stats"
      className="mx-auto mt-4 w-full max-w-7xl text-fg-3"
    >
      <p className="mb-2 text-xs">
        {responded} indexers · {totalResults.toLocaleString()} results · total:{" "}
        <span className="text-fg-2">{totalMs.toLocaleString()}ms</span>
        {failedCount > 0 ? <> · {failedCount} failed</> : null}
        {slowest ? (
          <>
            {" "}
            · slowest:{" "}
            <span className="text-fg-2">
              {slowest.name || slowest.id} {slowest.elapsedMs}ms
            </span>
          </>
        ) : null}
      </p>
      <ul className="m-0 grid list-none grid-cols-1 gap-x-4 gap-y-1.5 p-0 text-xs sm:grid-cols-2 lg:grid-cols-3">
        {indexers.map((indexer) => {
          const isOff = disabled.has(indexer.id);
          const stat = statByID.get(indexer.id);
          const failed = !isOff && stat !== undefined && stat.error.length > 0;
          const inputID = `indexer-stat-${indexer.id}`;
          return (
            <li
              key={indexer.id}
              className={cn(
                "flex items-center gap-2 tabular-nums",
                (isOff || failed) && "text-fg-4",
              )}
              title={failed ? stat?.error : undefined}
            >
              <span className="flex min-w-0 items-center gap-1.5">
                <Checkbox
                  id={inputID}
                  size="sm"
                  checked={!isOff}
                  onCheckedChange={() => onToggle(indexer.id)}
                />
                <label
                  htmlFor={inputID}
                  className={cn("cursor-pointer truncate", !isOff && "text-fg-2")}
                >
                  {indexer.name || indexer.id}
                </label>
                {failed ? <span className="text-fg-4">· failed</span> : null}
              </span>
              {isOff ? (
                <span className="shrink-0">off</span>
              ) : stat ? (
                <span className="shrink-0">
                  <span className="text-fg-2">{stat.elapsedMs}ms</span>
                  <span className="ml-1 text-fg-4">/ {stat.resultCount} hits</span>
                </span>
              ) : (
                <span className="shrink-0">—</span>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
