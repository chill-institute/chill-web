import { ArrowDown, ArrowUp } from "lucide-react";
import type { ReleaseInfo } from "@chill-institute/contracts/chill/v4/api_pb";

import { AddTransferButton } from "@chill-institute/auth/components/add-transfer-button";
import { CopyButton } from "@chill-institute/ui/components/copy-button";
import { cn } from "@chill-institute/ui/lib/cn";
import { useSearchDisplay, type SearchDisplayMode } from "@/hooks/use-search-display";
import { formatAge, formatBytes } from "@chill-institute/ui/lib/format";
import { effectiveInfo } from "@/lib/release-info";
import type { SearchResult, UserSettings } from "@/lib/types";
import { SearchResultTitleBehavior, SortBy, SortDirection } from "@/lib/types";

type Props = {
  results: SearchResult[];
  sortBy: UserSettings["sortBy"];
  sortDirection: UserSettings["sortDirection"];
  titleBehavior: UserSettings["searchResultTitleBehavior"];
  onSort: (sortBy: UserSettings["sortBy"]) => void;
};

const columns = [
  { key: SortBy.TITLE, label: "Very well. Here are the results", align: "left" as const },
  { key: SortBy.SOURCE, label: "source", align: "center" as const },
  { key: SortBy.SIZE, label: "size", align: "center" as const },
  { key: SortBy.SEEDERS, label: "seeders", align: "center" as const },
  { key: SortBy.UPLOADED_AT, label: "age", align: "center" as const },
];

function MetaLine({ info }: { info: ReleaseInfo }) {
  const parts: string[] = [];
  if (info.resolution) parts.push(info.resolution.toLowerCase());
  if (info.codec) parts.push(info.codec);
  if (info.hdr) parts.push(info.hdr);
  if (info.audio) parts.push(info.audio);
  if (info.group) parts.push(info.group);
  if (parts.length === 0) return null;
  return (
    <div className="text-fg-4 mt-1 block font-mono text-[11px] leading-[1.4]">
      {parts.map((text, i) => (
        <span key={text}>
          {i > 0 ? <span className="mx-1 opacity-60">·</span> : null}
          <span>{text}</span>
        </span>
      ))}
    </div>
  );
}

function TitleCell({
  result,
  titleBehavior,
  mode,
}: {
  result: SearchResult;
  titleBehavior: Props["titleBehavior"];
  mode: SearchDisplayMode;
}) {
  const linkable = titleBehavior === SearchResultTitleBehavior.LINK;
  const wrap = (children: React.ReactNode) =>
    linkable ? (
      <a href={result.link} title="Open URL" className="hover:underline hover:underline-offset-2">
        {children}
      </a>
    ) : (
      <>{children}</>
    );

  const titleSpan = (
    <span className="text-fg-1 block text-sm leading-[1.4] break-words [overflow-wrap:anywhere]">
      {wrap(result.title)}
    </span>
  );

  if (mode === "raw") return titleSpan;

  return (
    <div>
      {titleSpan}
      <MetaLine info={effectiveInfo(result)} />
    </div>
  );
}

export function SearchResults({ results, sortBy, sortDirection, titleBehavior, onSort }: Props) {
  const { mode } = useSearchDisplay();

  return (
    <>
      <div className="mx-auto hidden w-full max-w-5xl lg:block">
        <table className="w-full min-w-full border-collapse">
          <thead className="border-border-strong border-b">
            <tr>
              {columns.map((column) => {
                const active = sortBy === column.key;
                const isTitle = column.key === SortBy.TITLE;
                return (
                  <th
                    key={column.key}
                    scope="col"
                    className={
                      isTitle
                        ? "pr-2 pb-1.5 text-left font-serif text-base leading-5 font-normal tracking-[-0.01em] whitespace-nowrap"
                        : "px-2 pb-1 text-center text-sm font-normal whitespace-nowrap"
                    }
                  >
                    <button
                      type="button"
                      className={cn("w-full cursor-pointer", isTitle ? "text-left" : "text-center")}
                      onClick={() => onSort(column.key)}
                    >
                      <span
                        className={cn(
                          "inline-flex items-center gap-0.5",
                          !isTitle && "justify-center",
                        )}
                      >
                        <span>{column.label}</span>
                        {active ? (
                          <span className="inline-flex size-3">
                            {sortDirection === SortDirection.ASC ? <ArrowUp /> : <ArrowDown />}
                          </span>
                        ) : null}
                      </span>
                    </button>
                  </th>
                );
              })}

              <th
                scope="col"
                className="px-2 pb-1 text-center text-sm font-normal whitespace-nowrap"
              >
                url
              </th>
              <th scope="col" className="pb-1 text-center text-sm font-normal whitespace-nowrap">
                <span aria-label="send to put.io">🤠</span>
              </th>
            </tr>
          </thead>

          <tbody>
            {results.map((result) => {
              return (
                <tr key={result.id} className="border-border-faint border-b last:border-b-0">
                  <td className="py-3.5 pr-2 pl-0 align-middle">
                    <TitleCell result={result} titleBehavior={titleBehavior} mode={mode} />
                  </td>
                  <td className="px-2 py-3.5 text-center align-middle text-sm whitespace-nowrap tabular-nums">
                    {result.source}
                  </td>
                  <td className="px-2 py-3.5 text-center align-middle text-sm whitespace-nowrap tabular-nums">
                    {formatBytes(result.size)}
                  </td>
                  <td className="px-2 py-3.5 text-center align-middle text-sm whitespace-nowrap tabular-nums">
                    {result.seeders}
                  </td>
                  <td className="px-2 py-3.5 text-center align-middle text-sm whitespace-nowrap tabular-nums">
                    {formatAge(result.uploadedAt)}
                  </td>
                  <td className="px-2 py-3.5 text-center align-middle whitespace-nowrap">
                    <CopyButton variant="icon" value={result.link} />
                  </td>
                  <td className="w-[130px] py-3.5 pr-0 pl-1 align-middle whitespace-nowrap">
                    <AddTransferButton className="w-full" url={result.link}>
                      send to put.io
                    </AddTransferButton>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="lg:hidden">
        {results.map((result) => {
          return (
            <div
              key={result.id}
              className="border-border-strong bg-surface my-4 overflow-hidden rounded border"
            >
              <div className="px-6 py-5">
                <TitleCell result={result} titleBehavior={titleBehavior} mode={mode} />

                <div className="border-border-strong text-fg-2 my-3 flex flex-wrap items-center gap-x-2 gap-y-1 border-y py-2.5 font-mono text-xs">
                  <span className="text-fg-1">{result.source}</span>
                  <span className="text-fg-4">·</span>
                  <span className="tabular-nums">{formatBytes(result.size)}</span>
                  <span className="text-fg-4">·</span>
                  <span className="tabular-nums">{result.seeders} seeders</span>
                  <span className="text-fg-4">·</span>
                  <span className="tabular-nums">{formatAge(result.uploadedAt)}</span>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2">
                  <CopyButton value={result.link} />
                  <AddTransferButton url={result.link}>send to put.io</AddTransferButton>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
