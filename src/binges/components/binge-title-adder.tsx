import { useId, useRef, useState } from "react";
import { Code, ConnectError } from "@connectrpc/connect";

import {
  bingeMediaTypeLabel,
  bingeTitleLabel,
  normalizeIMDbId,
  pastedTitlePick,
  type BingeTitleMatch,
  type BingeTitlePick,
} from "@/binges/lib/types";
import { BINGE_TITLE_SEARCH_MIN_LENGTH, normalizeBingeTitleQuery } from "@/binges/queries/options";
import { useBingeTitleSearch } from "@/binges/queries/binges";
import { useMountEffect } from "@/ui/hooks/use-effects";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/ui/components/ui/input-group";
import { Spinner } from "@/ui/components/ui/spinner";

const SEARCH_DEBOUNCE_MS = 300;

type Props = {
  disabled: boolean;
  onAdd: (pick: BingeTitlePick) => void;
};

function searchErrorMessage(error: unknown): string {
  if (error instanceof ConnectError) {
    if (error.code === Code.PermissionDenied) return "only curators can search titles";
    if (error.code === Code.Unavailable) return "title search is temporarily unavailable";
  }
  return "title search failed";
}

/** Adds a title to the binge from a search; a pasted ID or IMDb link also works. */
export function BingeTitleAdder({ disabled, onAdd }: Props) {
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
  const open = pastedId !== "" || (searching && text.length > 0);

  const add = (pick: BingeTitlePick) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    setText("");
    setQuery("");
    onAdd(pick);
  };

  return (
    <div className="relative flex min-w-0 flex-1">
      <InputGroup>
        <InputGroupAddon>
          <label
            htmlFor={`${listId}-input`}
            className="bg-fg-1 text-fg-inverse rounded-sm px-2 py-0.5 text-sm"
          >
            add
          </label>
        </InputGroupAddon>
        <InputGroupInput
          id={`${listId}-input`}
          aria-label="add a title"
          placeholder="find a movie or show, or paste an IMDb link"
          value={text}
          aria-controls={listId}
          aria-autocomplete="list"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          autoComplete="off"
          spellCheck={false}
          onChange={(event) => updateText(event.target.value)}
          onKeyDown={(event) => {
            if (event.key !== "Enter") return;
            event.preventDefault();
            if (pastedId) {
              add(pastedTitlePick(pastedId));
              return;
            }
            const first = matches[0];
            if (first) add(first);
          }}
        />
      </InputGroup>
      {open ? (
        <div
          id={listId}
          role="listbox"
          aria-busy={pending ? true : undefined}
          className="border-border-strong bg-surface absolute top-full right-0 left-0 z-10 mt-1 max-h-72 overflow-y-auto rounded border shadow-lg"
        >
          {pastedId ? (
            <MatchButton onClick={() => add(pastedTitlePick(pastedId))}>
              <span className="text-fg-1 text-sm">
                add <span className="font-mono">{pastedId}</span>
              </span>
            </MatchButton>
          ) : search.error ? (
            <p className="text-error-text m-0 px-2.5 py-2 text-xs">
              {searchErrorMessage(search.error)}
            </p>
          ) : matches.length > 0 ? (
            matches.map((match) => (
              <MatchRow key={`${match.mediaType}-${match.imdbId}`} match={match} onPick={add} />
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
  onPick: (pick: BingeTitlePick) => void;
}) {
  const label = bingeTitleLabel(match.title, match.year);
  const kind = bingeMediaTypeLabel(match.mediaType);
  return (
    <MatchButton onClick={() => onPick(match)}>
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
