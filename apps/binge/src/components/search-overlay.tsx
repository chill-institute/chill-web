import { useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import { CornerDownLeft, Search, Users } from "lucide-react";

import { AddTransferButton } from "@chill-institute/auth/components/add-transfer-button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@chill-institute/ui/components/ui/dialog";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@chill-institute/ui/components/ui/input-group";
import { Skeleton } from "@chill-institute/ui/components/ui/skeleton";
import { cn } from "@chill-institute/ui/cn";
import { formatAge, formatBytes } from "@chill-institute/ui/lib/format";
import type { SearchResult } from "@chill-institute/contracts/chill/v4/api_pb";

import { useFreeSearchQuery } from "@/queries/free-search";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

const MAX_RESULTS = 10;
const SKELETON_SLOTS = ["a", "b", "c", "d"];
const LISTBOX_ID = "search-overlay-results";

function rowKey(result: SearchResult): string {
  return result.id || `${result.title}-${result.link}`;
}

function optionId(key: string): string {
  return `${LISTBOX_ID}-option-${key}`;
}

export function SearchOverlay({ open, onOpenChange }: Props) {
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query);
  const [highlight, setHighlight] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const trimmed = deferredQuery.trim();
  const searchQuery = useFreeSearchQuery({ query: trimmed, enabled: open });
  const visible = useMemo<readonly SearchResult[]>(
    () => searchQuery.data?.results?.slice(0, MAX_RESULTS) ?? [],
    [searchQuery.data?.results],
  );
  const activeHighlight = visible.length === 0 ? 0 : Math.min(highlight, visible.length - 1);

  useEffect(() => {
    if (!open) {
      setQuery("");
      setHighlight(0);
      return;
    }
    const id = window.setTimeout(() => inputRef.current?.focus(), 30);
    return () => window.clearTimeout(id);
  }, [open]);

  function handleKey(event: React.KeyboardEvent<HTMLDivElement>) {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      if (visible.length > 0) setHighlight((h) => Math.min(h + 1, visible.length - 1));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      if (visible.length > 0) setHighlight((h) => Math.max(h - 1, 0));
    } else if (event.key === "Enter") {
      if (visible.length === 0) return;
      event.preventDefault();
      const target = visible[activeHighlight];
      if (!target) return;
      const option = document.getElementById(optionId(rowKey(target)));
      option?.querySelector<HTMLButtonElement>("button")?.click();
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="border-border-strong bg-surface shadow-modal top-[12vh] left-1/2 w-[min(92vw,640px)] -translate-x-1/2 overflow-hidden rounded-xl border"
        onKeyDown={handleKey}
      >
        <DialogTitle className="sr-only">search the institute</DialogTitle>
        <DialogDescription className="sr-only">
          Type any title, hit enter to send the top torrent to put.io.
        </DialogDescription>
        <div className="border-border-faint border-b">
          <InputGroup className="rounded-none border-0 focus-within:ring-0 has-[[data-slot=input-group-control]:focus-visible]:ring-0">
            <InputGroupAddon>
              <Search className="text-fg-3 size-4" />
            </InputGroupAddon>
            <InputGroupInput
              ref={inputRef}
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setHighlight(0);
              }}
              placeholder="search any title…"
              autoComplete="off"
              aria-label="search"
              aria-describedby="search-overlay-shortcuts"
            />
            <InputGroupAddon align="inline-end">
              <button
                type="button"
                onClick={() => onOpenChange(false)}
                className="kbd cursor-pointer"
                aria-label="close"
              >
                esc
              </button>
            </InputGroupAddon>
          </InputGroup>
        </div>
        <div className="max-h-[60vh] overflow-y-auto py-1">
          <ResultsBody
            trimmed={trimmed}
            visible={visible}
            highlight={activeHighlight}
            isPending={searchQuery.isPending && trimmed.length > 0}
            isError={searchQuery.isError}
            onHighlight={setHighlight}
          />
        </div>
        <div
          id="search-overlay-shortcuts"
          className="text-fg-3 border-border-faint flex items-center justify-between gap-3 border-t px-3 py-2 text-2xs"
        >
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1">
              <span className="kbd">↑</span>
              <span className="kbd">↓</span>
              navigate
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="kbd">↵</span>
              send to put.io
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="kbd">esc</span>
              close
            </span>
          </div>
          <span className="font-mono">chill.search</span>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ResultsBody({
  trimmed,
  visible,
  highlight,
  isPending,
  isError,
  onHighlight,
}: {
  trimmed: string;
  visible: readonly SearchResult[];
  highlight: number;
  isPending: boolean;
  isError: boolean;
  onHighlight: (index: number) => void;
}) {
  if (trimmed.length === 0) {
    return (
      <div className="text-fg-3 px-4 py-8 text-center text-sm">
        type a movie, show, or any title to search
      </div>
    );
  }
  if (isError) {
    return (
      <div className="text-fg-3 px-4 py-8 text-center text-sm">
        couldn&apos;t reach the search backend. try again in a moment.
      </div>
    );
  }
  if (isPending) {
    return (
      <div className="flex flex-col gap-1 px-3 py-2">
        {SKELETON_SLOTS.map((slot) => (
          <div key={slot} className="flex items-center gap-3 py-1.5">
            <div className="flex min-w-0 flex-1 flex-col gap-1.5">
              <Skeleton className="h-3 w-3/4" />
              <Skeleton className="h-2.5 w-1/2" />
            </div>
            <Skeleton className="h-7 w-24 rounded" />
          </div>
        ))}
      </div>
    );
  }
  if (visible.length === 0) {
    return (
      <div className="text-fg-3 px-4 py-8 text-center text-sm">
        no torrents found. try a different query?
      </div>
    );
  }
  return (
    <ul id={LISTBOX_ID} role="list" aria-label="Search results" className="m-0 list-none p-0">
      {visible.map((result, index) => {
        const key = rowKey(result);
        return (
          <li
            key={key}
            id={optionId(key)}
            data-highlighted={index === highlight ? "" : undefined}
            onMouseEnter={() => onHighlight(index)}
            className={cn(
              "flex items-center gap-3 px-3 py-2",
              index === highlight ? "bg-hover" : "bg-transparent",
            )}
          >
            <div className="min-w-0 flex-1">
              <div className="text-fg-1 truncate text-sm">{result.title}</div>
              <div className="text-fg-3 mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 font-mono text-2xs">
                <span>{result.indexer || result.source || "unknown"}</span>
                {result.size > 0n ? (
                  <>
                    <span aria-hidden="true">·</span>
                    <span className="tabular-nums">{formatBytes(result.size)}</span>
                  </>
                ) : null}
                <span aria-hidden="true">·</span>
                <span className="inline-flex items-center gap-1 tabular-nums">
                  <Users className="size-3" />
                  {String(result.seeders)}
                </span>
                {result.uploadedAt ? (
                  <>
                    <span aria-hidden="true">·</span>
                    <span>{formatAge(result.uploadedAt)}</span>
                  </>
                ) : null}
              </div>
            </div>
            <AddTransferButton
              url={result.link}
              className="shrink-0"
              ariaLabel={`send ${result.title} to put.io`}
            >
              send to put.io
            </AddTransferButton>
            {index === highlight ? <CornerDownLeft className="text-fg-3 size-3.5" /> : null}
          </li>
        );
      })}
    </ul>
  );
}
