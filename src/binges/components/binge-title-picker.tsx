import { useId, useRef, useState } from "react";
import { Code, ConnectError } from "@connectrpc/connect";
import { X } from "lucide-react";

import {
  bingeMediaTypeLabel,
  bingeTitleLabel,
  normalizeIMDbId,
  type BingeTitleMatch,
} from "@/binges/lib/types";
import { BINGE_TITLE_SEARCH_MIN_LENGTH, normalizeBingeTitleQuery } from "@/binges/queries/options";
import { useBingeTitleSearch } from "@/binges/queries/binges";
import { IconButton } from "@/ui/components/icon-button";
import { useMountEffect } from "@/ui/hooks/use-effects";
import { Input } from "@/ui/components/ui/input";
import { Spinner } from "@/ui/components/ui/spinner";

const SEARCH_DEBOUNCE_MS = 300;

type Props = {
  index: number;
  imdbId: string;
  label: string;
  disabled: boolean;
  invalid: boolean;
  onPick: (imdbId: string, label: string) => void;
  onClear: () => void;
};

function searchErrorMessage(error: unknown): string {
  if (error instanceof ConnectError) {
    if (error.code === Code.PermissionDenied) return "only curators can search titles";
    if (error.code === Code.Unavailable) return "title search is temporarily unavailable";
  }
  return "title search failed";
}

/** A search box that resolves to one IMDb title; a pasted ID or IMDb link also works. */
export function BingeTitlePicker({
  index,
  imdbId,
  label,
  disabled,
  invalid,
  onPick,
  onClear,
}: Props) {
  const [text, setText] = useState("");
  // The query trails the text by a short pause so each keystroke is not a request.
  const [query, setQuery] = useState("");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const listId = useId();
  useMountEffect(() => () => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
  });
  const pastedId = normalizeIMDbId(text);
  const search = useBingeTitleSearch(pastedId ? "" : query);

  const updateText = (value: string) => {
    setText(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setQuery(value), SEARCH_DEBOUNCE_MS);
  };
  const matches = search.data?.matches ?? [];
  const searching = normalizeBingeTitleQuery(query).length >= BINGE_TITLE_SEARCH_MIN_LENGTH;
  const pending = searching && (search.isPending || search.isFetching);

  if (imdbId.length > 0) {
    return (
      <div
        data-slot="binge-title-picked"
        className="border-border-faint bg-surface flex min-w-0 flex-1 items-center gap-2 rounded border px-2.5 py-1.5"
      >
        <span className="text-fg-1 min-w-0 flex-1 truncate text-sm" title={label || imdbId}>
          {label || imdbId}
        </span>
        <span className="text-fg-3 shrink-0 font-mono text-xs">{imdbId}</span>
        <IconButton
          type="button"
          aria-label={`change title ${index + 1}`}
          disabled={disabled}
          onClick={() => {
            updateText("");
            onClear();
          }}
        >
          <X />
        </IconButton>
      </div>
    );
  }

  const pick = (id: string, pickedLabel: string) => {
    updateText("");
    onPick(id, pickedLabel);
  };

  return (
    <div className="flex min-w-0 flex-1 flex-col gap-1.5">
      <Input
        aria-label={`title ${index + 1}`}
        placeholder="search a movie or show, or paste an IMDb link"
        value={text}
        aria-invalid={invalid ? true : undefined}
        aria-controls={listId}
        aria-autocomplete="list"
        role="combobox"
        aria-expanded={pastedId !== "" || matches.length > 0}
        disabled={disabled}
        autoComplete="off"
        spellCheck={false}
        onChange={(event) => updateText(event.target.value)}
        onKeyDown={(event) => {
          if (event.key !== "Enter") return;
          event.preventDefault();
          if (pastedId) {
            pick(pastedId, pastedId);
            return;
          }
          const first = matches[0];
          if (first) pick(first.imdbId, bingeTitleLabel(first.title, first.year));
        }}
      />
      {pastedId ? (
        <ul id={listId} role="listbox" className="m-0 list-none p-0">
          <li>
            <MatchButton onClick={() => pick(pastedId, pastedId)}>
              <span className="text-fg-1 text-sm">
                use <span className="font-mono">{pastedId}</span>
              </span>
            </MatchButton>
          </li>
        </ul>
      ) : searching ? (
        <div
          id={listId}
          role="listbox"
          aria-busy={pending ? true : undefined}
          className="border-border-faint bg-surface max-h-64 overflow-y-auto rounded border"
        >
          {search.error ? (
            <p className="text-error-text m-0 px-2.5 py-2 text-xs">
              {searchErrorMessage(search.error)}
            </p>
          ) : matches.length > 0 ? (
            matches.map((match) => (
              <MatchRow key={`${match.mediaType}-${match.imdbId}`} match={match} onPick={pick} />
            ))
          ) : pending ? (
            <p className="text-fg-3 m-0 flex items-center gap-2 px-2.5 py-2 text-xs">
              <Spinner className="size-3" /> searching…
            </p>
          ) : (
            <p className="text-fg-3 m-0 px-2.5 py-2 text-xs">no titles found</p>
          )}
        </div>
      ) : null}
    </div>
  );
}

function MatchButton({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return (
    <button
      type="button"
      role="option"
      aria-selected={false}
      className="hover-hover:hover:bg-surface-2 focus-visible:bg-surface-2 flex w-full cursor-pointer items-center gap-2.5 px-2.5 py-1.5 text-left outline-none"
      onClick={onClick}
    >
      {children}
    </button>
  );
}

function MatchRow({
  match,
  onPick,
}: {
  match: BingeTitleMatch;
  onPick: (imdbId: string, label: string) => void;
}) {
  const label = bingeTitleLabel(match.title, match.year);
  const kind = bingeMediaTypeLabel(match.mediaType);
  return (
    <MatchButton onClick={() => onPick(match.imdbId, label)}>
      {match.posterUrl ? (
        <img
          src={match.posterUrl}
          alt=""
          loading="lazy"
          className="bg-surface-2 h-12 w-8 shrink-0 rounded-sm object-cover"
        />
      ) : (
        <span className="bg-surface-2 h-12 w-8 shrink-0 rounded-sm" aria-hidden="true" />
      )}
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="text-fg-1 truncate text-sm">{label}</span>
        <span className="text-fg-3 text-xs">
          {kind}
          {kind ? " · " : ""}
          <span className="font-mono">{match.imdbId}</span>
        </span>
      </span>
    </MatchButton>
  );
}
