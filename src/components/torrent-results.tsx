import { CalendarDays, Film, HardDrive, Monitor, Search, Users } from "lucide-react";

import { AddTransferButton } from "@/auth/components/add-transfer-button";
import { normalizeCodecFilterValue } from "@/api/release-info";
import { Button } from "@/ui/components/ui/button";
import { CopyButton } from "@/ui/components/copy-button";
import { cn } from "@/ui/lib/cn";
import { formatAge, formatBytes } from "@/ui/lib/format";
import type { SearchResult } from "@/lib/types";

const RESOLUTION_FILTER_OPTIONS = ["all", "2160p", "1080p", "720p"] as const;
const CODEC_FILTER_OPTIONS = ["all", "x265", "x264"] as const;

export type ResolutionFilterValue = (typeof RESOLUTION_FILTER_OPTIONS)[number];
export type CodecFilterValue = (typeof CODEC_FILTER_OPTIONS)[number];

const UPLOADED_AT_FORMATTER = new Intl.DateTimeFormat(undefined, {
  month: "short",
  day: "numeric",
  year: "numeric",
});

const SEEDER_FORMATTER = new Intl.NumberFormat();

function formatUploadedAt(value: string) {
  if (!value) return "Unknown date";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return UPLOADED_AT_FORMATTER.format(date);
}

function formatResultAge(value: string) {
  if (!value) return undefined;
  const age = formatAge(value);
  if (age === "unknown") return undefined;
  return age === "Today" ? age : `${age} ago`;
}

function formatSeederCount(seeders: bigint) {
  if (seeders <= 0n) return undefined;
  const count = Number(seeders);
  return `${SEEDER_FORMATTER.format(count)} seeder${count === 1 ? "" : "s"}`;
}

function canSendResult(result: SearchResult) {
  return result.link.trim().length > 0;
}

function parseResolution(result: SearchResult): Exclude<ResolutionFilterValue, "all"> | undefined {
  const value = result.releaseInfo?.resolution.toLowerCase();
  if (value === "2160p" || value === "1080p" || value === "720p") return value;
  return undefined;
}

function parseCodec(result: SearchResult): Exclude<CodecFilterValue, "all"> | undefined {
  return normalizeCodecFilterValue(result.releaseInfo?.codec);
}

export function TorrentResultList({
  results,
  columns = true,
}: {
  results: SearchResult[];
  columns?: boolean;
}) {
  const sendableCount = results.reduce(
    (count, result) => count + (canSendResult(result) ? 1 : 0),
    0,
  );
  const hasOnlyUnavailableResults = results.length > 0 && sendableCount === 0;

  return (
    <>
      {hasOnlyUnavailableResults ? (
        <p className="m-0 text-sm text-fg-3">
          results came back, but none include a usable transfer link yet.
        </p>
      ) : null}

      <ul
        aria-label="Torrent results list"
        className="border-border-strong bg-surface-2 m-0 shrink-0 list-none overflow-hidden rounded border p-0"
      >
        {results.map((result) => {
          const isSendable = canSendResult(result);
          const resolution = parseResolution(result);
          const codec = parseCodec(result);
          const ageLabel = formatResultAge(result.uploadedAt);
          const uploadedAtLabel = result.uploadedAt
            ? formatUploadedAt(result.uploadedAt)
            : undefined;
          const sizeLabel = result.size > 0n ? formatBytes(result.size) : undefined;
          const seederLabel = formatSeederCount(result.seeders);
          const seederCount =
            result.seeders > 0n ? SEEDER_FORMATTER.format(Number(result.seeders)) : undefined;
          const sourceLabel = result.indexer || result.source || "unknown";
          const action = isSendable ? (
            <AddTransferButton className="flex-1 sm:flex-none" url={result.link}>
              send to put.io
            </AddTransferButton>
          ) : (
            <Button
              variant="off"
              disabled
              className="flex-1 sm:flex-none"
              aria-label={`Cannot send ${result.title} to put.io`}
              title="This result is missing a usable transfer link"
            >
              unavailable
            </Button>
          );

          return (
            <li
              key={result.id || `${result.title}-${result.link}`}
              className={cn(
                "border-border-faint flex flex-col gap-3 border-t px-3 py-3 first:border-t-0 sm:flex-row sm:items-center sm:justify-between",
                columns &&
                  "lg:grid lg:grid-cols-[minmax(0,1fr)_5.5rem_3.5rem_3rem_4.5rem_3.75rem_4.5rem_9.5rem] lg:items-center lg:gap-x-3 lg:gap-y-0",
                !isSendable && "opacity-70",
              )}
            >
              <div className={cn("min-w-0 flex-1", columns && "lg:flex-none")}>
                <div
                  title={result.title}
                  className={cn("break-words text-[15px] text-fg-1", columns && "lg:truncate")}
                >
                  {result.title}
                </div>
                <div
                  className={cn(
                    "mt-1 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[13px] text-fg-4",
                    columns && "lg:hidden",
                  )}
                >
                  <span className="text-fg-3">{sourceLabel}</span>
                  {resolution ? (
                    <span className="inline-flex items-center gap-1 tabular-nums">
                      <Monitor className="size-3" />
                      {resolution}
                    </span>
                  ) : null}
                  {codec ? (
                    <span className="inline-flex items-center gap-1">
                      <Film className="size-3" />
                      {codec}
                    </span>
                  ) : null}
                  {sizeLabel ? (
                    <span className="inline-flex items-center gap-1 tabular-nums">
                      <HardDrive className="size-3" />
                      {sizeLabel}
                    </span>
                  ) : null}
                  {seederLabel ? (
                    <span className="inline-flex items-center gap-1 tabular-nums">
                      <Users className="size-3" />
                      {seederLabel}
                    </span>
                  ) : null}
                  {ageLabel ? (
                    <span
                      className="inline-flex items-center gap-1 tabular-nums"
                      title={uploadedAtLabel}
                    >
                      <CalendarDays className="size-3" />
                      {ageLabel}
                    </span>
                  ) : null}
                </div>
              </div>

              {columns ? (
                <>
                  <span
                    className="hidden min-w-0 truncate text-[13px] text-fg-3 lg:block"
                    title={sourceLabel}
                  >
                    {sourceLabel}
                  </span>
                  <span className="hidden items-center gap-1 text-[13px] text-fg-4 tabular-nums lg:flex">
                    {resolution ? (
                      <>
                        <Monitor className="size-3 shrink-0" />
                        {resolution}
                      </>
                    ) : null}
                  </span>
                  <span className="hidden items-center gap-1 text-[13px] text-fg-4 lg:flex">
                    {codec ? (
                      <>
                        <Film className="size-3 shrink-0" />
                        {codec}
                      </>
                    ) : null}
                  </span>
                  <span className="hidden items-center gap-1 text-[13px] text-fg-4 tabular-nums lg:flex">
                    {sizeLabel ? (
                      <>
                        <HardDrive className="size-3 shrink-0" />
                        {sizeLabel}
                      </>
                    ) : null}
                  </span>
                  <span className="hidden items-center gap-1 text-[13px] text-fg-4 tabular-nums lg:flex">
                    {seederCount ? (
                      <>
                        <Users className="size-3 shrink-0" />
                        {seederCount}
                      </>
                    ) : null}
                  </span>
                  <span
                    className="hidden items-center gap-1 whitespace-nowrap text-[13px] text-fg-4 tabular-nums lg:flex"
                    title={uploadedAtLabel}
                  >
                    {ageLabel ? (
                      <>
                        <CalendarDays className="size-3 shrink-0" />
                        {ageLabel}
                      </>
                    ) : null}
                  </span>
                </>
              ) : null}

              <div className="flex shrink-0 items-center justify-end gap-2 lg:justify-self-end">
                {isSendable ? (
                  <CopyButton variant="icon" value={result.link} className="shrink-0" />
                ) : null}
                {action}
              </div>
            </li>
          );
        })}
      </ul>
    </>
  );
}

export function TorrentResultsEmpty({ title, body }: { title: string; body: string }) {
  return (
    <div className="border-border-soft bg-surface-2 text-fg-2 rounded border px-4 py-6 text-sm">
      <div className="flex items-center gap-2 font-medium text-fg-1">
        <Search className="size-4" />
        <span>{title}</span>
      </div>
      <p className="m-0 mt-2">{body}</p>
    </div>
  );
}
