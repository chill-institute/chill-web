import {
  ArrowDown,
  ArrowUp,
  CalendarDays,
  ChevronDown,
  ChevronRight,
  HardDrive,
  Users,
} from "lucide-react";
import { useMemo, useState, type ReactNode } from "react";

import { AddTransferButton } from "@/auth/components/add-transfer-button";
import { CopyButton } from "@/ui/components/copy-button";
import { useMediaQuery } from "@/ui/hooks/use-is-desktop";
import { cn } from "@/ui/lib/cn";
import { formatAge, formatBytes } from "@/ui/lib/format";
import { searchResultKey } from "@/lib/search";
import {
  groupIdentityLabel,
  groupSearchResults,
  type SearchResultGroup,
} from "@/lib/search-groups";
import type { ChillSettings, SearchResult } from "@/lib/types";
import { SearchResultTitleBehavior, SortBy, SortDirection } from "@/lib/types";

type Props = {
  results: SearchResult[];
  sortBy: ChillSettings["sortBy"];
  sortDirection: ChillSettings["sortDirection"];
  titleBehavior: ChillSettings["searchResultTitleBehavior"];
  groupReleases?: boolean;
  onSort: (sortBy: ChillSettings["sortBy"]) => void;
};

const columns = [
  {
    key: SortBy.TITLE,
    label: "Very well. Here are the results",
    align: "left" as const,
    sortable: false,
  },
  { key: SortBy.SOURCE, label: "source", align: "center" as const, sortable: false },
  { key: SortBy.SIZE, label: "size", align: "center" as const, sortable: true },
  { key: SortBy.SEEDERS, label: "seeders", align: "center" as const, sortable: true },
  { key: SortBy.UPLOADED_AT, label: "age", align: "center" as const, sortable: true },
];

const LARGE_RESULTS_QUERY = "(min-width: 1024px)";

const MOBILE_CARD_CLASS = "border-border-strong bg-surface mb-4 overflow-hidden rounded border";

function TitleCell({
  result,
  titleBehavior,
}: {
  result: SearchResult;
  titleBehavior: Props["titleBehavior"];
}) {
  const linkable = titleBehavior === SearchResultTitleBehavior.LINK;
  const wrap = (children: ReactNode) =>
    linkable ? (
      <a
        href={result.link}
        rel="noreferrer noopener"
        target="_blank"
        title="Open URL"
        className="hover:underline hover:underline-offset-2"
      >
        {children}
      </a>
    ) : (
      <>{children}</>
    );

  const titleSpan = (
    <span className="text-fg-1 block min-h-[2lh] text-sm leading-[1.4] lg:min-h-0 break-words [overflow-wrap:anywhere]">
      {wrap(result.title)}
    </span>
  );

  return <div>{titleSpan}</div>;
}

function GroupToggle({
  group,
  expanded,
  onToggle,
  hangChevron = false,
}: {
  group: SearchResultGroup;
  expanded: boolean;
  onToggle: () => void;
  // Desktop hangs the chevron in the margin so group and release titles share one edge.
  hangChevron?: boolean;
}) {
  const identity = groupIdentityLabel(group);
  const count = `${group.releases.length} releases`;
  const Chevron = expanded ? ChevronDown : ChevronRight;

  return (
    <button
      type="button"
      aria-expanded={expanded}
      aria-label={[group.title, identity, count].filter(Boolean).join(" ")}
      onClick={onToggle}
      className={cn(
        "group/toggle flex min-h-[1.875rem] cursor-pointer items-center gap-1.5 text-left text-sm leading-[1.4]",
        hangChevron && "-ml-5",
      )}
    >
      <Chevron
        className="text-fg-4 hover-hover:group-hover/toggle:text-fg-1 size-3.5 shrink-0 self-center transition-colors"
        aria-hidden="true"
      />
      <span className="text-fg-1 break-words [overflow-wrap:anywhere]">{group.title}</span>
      <span className="text-fg-4 shrink-0 whitespace-nowrap tabular-nums">
        {[identity, count].filter(Boolean).join(" · ")}
      </span>
    </button>
  );
}

type Row =
  | { kind: "result"; result: SearchResult; nested: boolean }
  | { kind: "group"; group: SearchResultGroup };

function buildRows(
  results: SearchResult[],
  groups: SearchResultGroup[] | null,
  expanded: ReadonlySet<string>,
): Row[] {
  if (!groups) return results.map((result) => ({ kind: "result", result, nested: false }));
  return groups.flatMap((group): Row[] => {
    const [best] = group.releases;
    if (group.releases.length === 1) return [{ kind: "result", result: best, nested: false }];
    if (!expanded.has(group.key)) return [{ kind: "group", group }];
    return [
      { kind: "group", group },
      ...group.releases.map((result): Row => ({ kind: "result", result, nested: true })),
    ];
  });
}

function DesktopResultCells({ result }: { result: SearchResult }) {
  return (
    <>
      <td className="px-2 py-2.5 text-center align-middle text-sm whitespace-nowrap tabular-nums">
        {result.source}
      </td>
      <td className="px-2 py-2.5 text-center align-middle text-sm whitespace-nowrap tabular-nums">
        {formatBytes(result.size)}
      </td>
      <td className="px-2 py-2.5 text-center align-middle text-sm whitespace-nowrap tabular-nums">
        {result.seeders}
      </td>
      <td className="px-2 py-2.5 text-center align-middle text-sm whitespace-nowrap tabular-nums">
        {formatAge(result.uploadedAt)}
      </td>
      <td className="px-2 py-2.5 text-center align-middle whitespace-nowrap">
        <CopyButton variant="icon" value={result.link} />
      </td>
      <td className="w-[130px] py-2.5 pr-0 pl-1 align-middle whitespace-nowrap">
        <AddTransferButton className="w-full" url={result.link}>
          send to put.io
        </AddTransferButton>
      </td>
    </>
  );
}

function MobileResultBody({
  result,
  titleBehavior,
}: {
  result: SearchResult;
  titleBehavior: Props["titleBehavior"];
}) {
  return (
    <div className="px-6 py-5">
      <TitleCell result={result} titleBehavior={titleBehavior} />

      <div className="border-border-strong text-fg-2 my-3 flex min-h-15 flex-wrap items-center gap-x-3 gap-y-1.5 border-y py-2.5 text-xs">
        <span className="text-fg-1">{result.source}</span>
        <span className="inline-flex items-center gap-1 tabular-nums">
          <HardDrive className="size-3" />
          {formatBytes(result.size)}
        </span>
        <span className="inline-flex items-center gap-1 tabular-nums">
          <Users className="size-3" />
          {result.seeders} seeders
        </span>
        <span className="inline-flex items-center gap-1 tabular-nums">
          <CalendarDays className="size-3" />
          {formatAge(result.uploadedAt)}
        </span>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <CopyButton value={result.link} />
        <AddTransferButton url={result.link}>send to put.io</AddTransferButton>
      </div>
    </div>
  );
}

export function SearchResults({
  results,
  sortBy,
  sortDirection,
  titleBehavior,
  groupReleases = false,
  onSort,
}: Props) {
  const isLargeLayout = useMediaQuery(LARGE_RESULTS_QUERY);
  const groups = useMemo(
    () => (groupReleases ? groupSearchResults(results) : null),
    [groupReleases, results],
  );
  const [expanded, setExpanded] = useState<ReadonlySet<string>>(() => new Set());

  function toggleGroup(key: string) {
    setExpanded((current) => {
      const next = new Set(current);
      if (!next.delete(key)) next.add(key);
      return next;
    });
  }

  if (isLargeLayout) {
    const rows = buildRows(results, groups, expanded);
    return (
      <div className="mx-auto w-full max-w-7xl">
        <table className="w-full min-w-full border-collapse">
          <thead className="border-border-strong border-b">
            <tr>
              {columns.map((column) => {
                const active = column.sortable && sortBy === column.key;
                const isTitle = column.key === SortBy.TITLE;
                const ariaSort = !column.sortable
                  ? undefined
                  : active
                    ? sortDirection === SortDirection.ASC
                      ? "ascending"
                      : "descending"
                    : "none";
                const label = (
                  <span
                    className={cn("inline-flex items-center gap-0.5", !isTitle && "justify-center")}
                  >
                    <span>{column.label}</span>
                    {active ? (
                      <span className="inline-flex size-3" aria-hidden="true">
                        {sortDirection === SortDirection.ASC ? <ArrowUp /> : <ArrowDown />}
                      </span>
                    ) : null}
                  </span>
                );
                return (
                  <th
                    key={column.key}
                    scope="col"
                    aria-sort={ariaSort}
                    className={
                      isTitle
                        ? "pr-2 pb-1.5 text-left font-serif text-base leading-5 font-normal tracking-[-0.01em] whitespace-nowrap"
                        : "px-2 pb-1 text-center text-sm font-normal whitespace-nowrap"
                    }
                  >
                    {column.sortable ? (
                      <button
                        type="button"
                        className={cn(
                          "min-h-6 w-full cursor-pointer",
                          isTitle ? "text-left" : "text-center",
                        )}
                        onClick={() => onSort(column.key)}
                      >
                        {label}
                      </button>
                    ) : (
                      <span
                        className={cn(
                          "block min-h-6 w-full",
                          isTitle ? "text-left" : "text-center",
                        )}
                      >
                        {label}
                      </span>
                    )}
                  </th>
                );
              })}

              <th
                scope="col"
                className="px-2 pb-1 text-center text-sm font-normal whitespace-nowrap"
              >
                url
              </th>
              <th
                scope="col"
                aria-label="send to put.io"
                className="pb-1 text-center text-sm font-normal whitespace-nowrap"
              >
                <span className="sr-only">send to put.io</span>
                <span aria-hidden="true">🤠</span>
              </th>
            </tr>
          </thead>

          <tbody>
            {rows.map((row) =>
              row.kind === "group" ? (
                <tr
                  key={`group:${row.group.key}`}
                  className="border-border-faint border-b last:border-b-0"
                >
                  <td colSpan={columns.length + 2} className="py-2.5 pr-2 pl-0 align-middle">
                    <GroupToggle
                      hangChevron
                      group={row.group}
                      expanded={expanded.has(row.group.key)}
                      onToggle={() => toggleGroup(row.group.key)}
                    />
                  </td>
                </tr>
              ) : (
                <tr
                  key={searchResultKey(row.result)}
                  className="border-border-faint border-b last:border-b-0"
                >
                  <td className={cn("py-2.5 pr-2 align-middle", row.nested ? "pl-5" : "pl-0")}>
                    <TitleCell result={row.result} titleBehavior={titleBehavior} />
                  </td>
                  <DesktopResultCells result={row.result} />
                </tr>
              ),
            )}
          </tbody>
        </table>
      </div>
    );
  }

  if (!groups) {
    return (
      <ul className="m-0 list-none p-0 lg:hidden" aria-label="Search results">
        {results.map((result) => (
          <li key={searchResultKey(result)} className={MOBILE_CARD_CLASS}>
            <MobileResultBody result={result} titleBehavior={titleBehavior} />
          </li>
        ))}
      </ul>
    );
  }

  return (
    <ul className="m-0 list-none p-0 lg:hidden" aria-label="Search results">
      {groups.map((group) => {
        const [best] = group.releases;
        if (group.releases.length === 1) {
          return (
            <li key={searchResultKey(best)} className={MOBILE_CARD_CLASS}>
              <MobileResultBody result={best} titleBehavior={titleBehavior} />
            </li>
          );
        }
        const isExpanded = expanded.has(group.key);
        return (
          <li key={`group:${group.key}`} className={MOBILE_CARD_CLASS}>
            <div className={cn("px-6 py-4", isExpanded && "border-border-faint border-b")}>
              <GroupToggle
                group={group}
                expanded={isExpanded}
                onToggle={() => toggleGroup(group.key)}
              />
            </div>
            {isExpanded
              ? group.releases.map((result) => (
                  <div
                    key={searchResultKey(result)}
                    className="border-border-faint border-b last:border-b-0"
                  >
                    <MobileResultBody result={result} titleBehavior={titleBehavior} />
                  </div>
                ))
              : null}
          </li>
        );
      })}
    </ul>
  );
}
