import { useRef, useState } from "react";
import { GripVertical, Pencil, Trash2 } from "lucide-react";

import { bingeMediaTypeLabel, type BingeItemDraft } from "@/binges/lib/types";
import { cn } from "@/ui/lib/cn";
import { IconButton } from "@/ui/components/icon-button";
import { Button } from "@/ui/components/ui/button";
import { Textarea } from "@/ui/components/ui/textarea";

type Props = {
  items: BingeItemDraft[];
  itemErrors: Record<string, string>;
  disabled: boolean;
  onComment: (key: string, comment: string) => void;
  onRemove: (key: string) => void;
  onMove: (key: string, to: number) => void;
};

const ROW_SELECTOR = '[data-slot="binge-editor-item"]';

/** The binge's titles in order; drag a handle, or focus it and use the arrow keys, to reorder. */
export function BingeEditorList({
  items,
  itemErrors,
  disabled,
  onComment,
  onRemove,
  onMove,
}: Props) {
  const listRef = useRef<HTMLOListElement>(null);
  const [draggingKey, setDraggingKey] = useState<string | null>(null);
  const [openNotes, setOpenNotes] = useState<ReadonlySet<string>>(() => new Set());

  const dropIndex = (clientY: number, from: number) => {
    const rows = Array.from(listRef.current?.querySelectorAll(ROW_SELECTOR) ?? []);
    const before = rows.findIndex((row) => {
      const box = row.getBoundingClientRect();
      return clientY < box.top + box.height / 2;
    });
    if (before === -1) return rows.length - 1;
    return before > from ? before - 1 : before;
  };

  const moveAndKeepFocus = (key: string, to: number) => {
    onMove(key, to);
    requestAnimationFrame(() =>
      listRef.current?.querySelector<HTMLElement>(`[data-handle="${key}"]`)?.focus(),
    );
  };

  if (items.length === 0) {
    return (
      <div className="border-border-strong text-fg-3 flex min-h-40 items-center justify-center rounded border border-dashed p-6 text-center text-sm">
        search above to add the first title
      </div>
    );
  }

  return (
    <ol
      ref={listRef}
      aria-label="titles in this binge"
      className="border-border-strong m-0 flex list-none flex-col overflow-hidden rounded border p-0"
    >
      {items.map((item, index) => {
        const name = item.title || item.imdbId;
        const kind = bingeMediaTypeLabel(item.mediaType);
        const noteOpen = item.comment.length > 0 || openNotes.has(item.key);
        const error = itemErrors[item.key];
        return (
          <li
            key={item.key}
            data-slot="binge-editor-item"
            className={cn(
              "border-border-faint flex border-b last:border-b-0",
              draggingKey === item.key && "bg-surface-2",
            )}
          >
            <button
              type="button"
              data-handle={item.key}
              aria-label={`move ${name}, position ${index + 1} of ${items.length}`}
              disabled={disabled}
              className="bg-surface-2 border-border-faint text-fg-3 hover-hover:hover:text-fg-1 focus-visible:ring-ring-focus flex w-10 shrink-0 cursor-grab touch-none items-center justify-center border-r focus-visible:ring-2 focus-visible:outline-none focus-visible:ring-inset active:cursor-grabbing"
              onPointerDown={(event) => {
                event.currentTarget.setPointerCapture(event.pointerId);
                setDraggingKey(item.key);
              }}
              onPointerMove={(event) => {
                if (draggingKey !== item.key) return;
                const to = dropIndex(event.clientY, index);
                if (to !== index) onMove(item.key, to);
              }}
              onPointerUp={() => setDraggingKey(null)}
              onPointerCancel={() => setDraggingKey(null)}
              onKeyDown={(event) => {
                if (event.key === "ArrowUp" && index > 0) {
                  event.preventDefault();
                  moveAndKeepFocus(item.key, index - 1);
                }
                if (event.key === "ArrowDown" && index < items.length - 1) {
                  event.preventDefault();
                  moveAndKeepFocus(item.key, index + 1);
                }
              }}
            >
              <GripVertical className="size-4" aria-hidden="true" />
            </button>
            <div className="flex min-w-0 flex-1 flex-col gap-2 p-3">
              <div className="flex items-center gap-3">
                <span className="bg-surface-2 border-border-strong relative aspect-[2/3] w-11 shrink-0 overflow-hidden rounded-sm border sm:w-12">
                  {item.posterUrl ? (
                    <img
                      src={item.posterUrl}
                      alt=""
                      decoding="async"
                      loading="lazy"
                      className="absolute inset-0 size-full object-cover"
                    />
                  ) : null}
                </span>
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="text-fg-1 truncate font-serif text-lg leading-tight tracking-heading sm:text-xl">
                    {name}
                    {item.year > 0 ? (
                      <span className="text-fg-3 font-sans text-sm sm:text-base"> {item.year}</span>
                    ) : null}
                  </span>
                  <span className="text-fg-3 text-xs">
                    {kind || <span className="font-mono">{item.imdbId}</span>}
                  </span>
                </span>
                {noteOpen ? null : (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    disabled={disabled}
                    onClick={() => setOpenNotes((prev) => new Set(prev).add(item.key))}
                  >
                    <Pencil />
                    <span className="sr-only sm:not-sr-only">add note</span>
                  </Button>
                )}
                <IconButton
                  type="button"
                  aria-label={`remove ${name}`}
                  disabled={disabled}
                  onClick={() => onRemove(item.key)}
                >
                  <Trash2 />
                </IconButton>
              </div>
              {noteOpen ? (
                <Textarea
                  aria-label={`note for ${name}`}
                  placeholder="why this one, what to watch for"
                  value={item.comment}
                  disabled={disabled}
                  rows={2}
                  autoFocus={item.comment.length === 0}
                  onChange={(event) => onComment(item.key, event.target.value)}
                />
              ) : null}
              {error ? <p className="text-error-text m-0 text-xs">{error}</p> : null}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
