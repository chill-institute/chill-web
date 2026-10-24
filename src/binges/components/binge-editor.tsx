import { useState } from "react";
import { Code, ConnectError } from "@connectrpc/connect";
import { Plus, Trash2, X } from "lucide-react";

import { UserErrorAlert } from "@/auth/components/user-error-alert";
import { useDeleteBinge, useSaveBinge } from "@/binges/queries/binges";
import {
  bingeDraftToInput,
  bingeToDraft,
  validateBingeDraft,
  type Binge,
  type BingeDraft,
  type BingeDraftErrors,
} from "@/binges/lib/types";
import { IconButton } from "@/ui/components/icon-button";
import { ModalCloseButton } from "@/ui/components/modal-close-button";
import { ResponsiveModal } from "@/ui/components/responsive-modal";
import { Button } from "@/ui/components/ui/button";
import { Field, FieldLabel } from "@/ui/components/ui/field";
import { Input } from "@/ui/components/ui/input";
import { Textarea } from "@/ui/components/ui/textarea";

type Props = {
  binge?: Binge;
  onClose: () => void;
  onSaved: (binge: Binge) => void;
  onDeleted: () => void;
};

const NO_ERRORS: BingeDraftErrors = { itemErrors: {} };

let itemKeyCounter = 0;
function newItemKey() {
  itemKeyCounter += 1;
  return `item-${itemKeyCounter}`;
}

function requestMessage(error: unknown): string | null {
  if (error instanceof ConnectError && error.code === Code.InvalidArgument) {
    return error.rawMessage;
  }
  return null;
}

export function BingeEditor({ binge, onClose, onSaved, onDeleted }: Props) {
  const [draft, setDraft] = useState<BingeDraft>(() => bingeToDraft(binge, newItemKey));
  const [errors, setErrors] = useState<BingeDraftErrors>(NO_ERRORS);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const save = useSaveBinge();
  const remove = useDeleteBinge();
  const busy = save.isPending || remove.isPending;
  const editing = binge !== undefined;

  const updateItem = (key: string, patch: Partial<{ imdbId: string; comment: string }>) =>
    setDraft((prev) => ({
      ...prev,
      items: prev.items.map((item) => (item.key === key ? { ...item, ...patch } : item)),
    }));
  const removeItem = (key: string) =>
    setDraft((prev) => ({ ...prev, items: prev.items.filter((item) => item.key !== key) }));
  const addItem = () =>
    setDraft((prev) => ({
      ...prev,
      items: [...prev.items, { key: newItemKey(), imdbId: "", comment: "" }],
    }));

  const submit = () => {
    const validation = validateBingeDraft(draft);
    setErrors(validation ?? NO_ERRORS);
    if (validation) return;
    save.mutate(
      { id: binge?.id, input: bingeDraftToInput(draft) },
      { onSuccess: (saved) => saved && onSaved(saved) },
    );
  };

  const saveMessage = requestMessage(save.error);

  return (
    <ResponsiveModal
      open
      onOpenChange={(open) => !open && !busy && onClose()}
      title={editing ? "Edit binge" : "New binge"}
      description="Title, blurb, and the IMDb titles that make up this binge"
      desktopContentClassName="fixed top-6 left-1/2 max-h-[calc(100dvh-48px)] w-[min(100vw-1rem,640px)] -translate-x-1/2 gap-0 rounded-xl border border-border-strong bg-surface p-0 text-fg-1 shadow-modal"
      drawerContentClassName="max-h-[92dvh] overflow-hidden rounded-t-3xl border-x-0 border-t-0 border-b-0 bg-surface p-0 shadow-drawer"
    >
      {/* eslint-disable-next-line react-doctor/no-prevent-default -- the form never submits natively */}
      <form
        className="flex min-h-0 flex-col"
        onSubmit={(event) => {
          event.preventDefault();
          submit();
        }}
      >
        <div className="border-border-faint flex items-center justify-between border-b px-4 py-3 sm:px-5">
          <h2 className="m-0 text-xl sm:text-2xl">{editing ? "edit binge" : "new binge"}</h2>
          <ModalCloseButton onClick={onClose} aria-label="Close binge editor" disabled={busy} />
        </div>

        <div className="flex min-h-0 flex-col gap-4 overflow-y-auto px-4 py-4 sm:px-5">
          <Field data-invalid={errors.title ? "true" : undefined}>
            <FieldLabel htmlFor="binge-title">title</FieldLabel>
            <Input
              id="binge-title"
              value={draft.title}
              aria-invalid={errors.title ? true : undefined}
              disabled={busy}
              autoComplete="off"
              onChange={(event) => setDraft((prev) => ({ ...prev, title: event.target.value }))}
            />
            {errors.title ? <p className="text-error-text m-0 text-xs">{errors.title}</p> : null}
          </Field>

          <Field data-invalid={errors.blurb ? "true" : undefined}>
            <FieldLabel htmlFor="binge-blurb">blurb</FieldLabel>
            <Textarea
              id="binge-blurb"
              value={draft.blurb}
              aria-invalid={errors.blurb ? true : undefined}
              disabled={busy}
              rows={3}
              placeholder="why these, why now"
              onChange={(event) => setDraft((prev) => ({ ...prev, blurb: event.target.value }))}
            />
            {errors.blurb ? <p className="text-error-text m-0 text-xs">{errors.blurb}</p> : null}
          </Field>

          <fieldset className="m-0 flex min-w-0 flex-col gap-2 border-0 p-0">
            <legend className="text-fg-1 mb-2 text-sm leading-snug">titles</legend>
            {draft.items.map((item, index) => {
              const itemError = errors.itemErrors[item.key];
              return (
                <div
                  key={item.key}
                  data-slot="binge-editor-item"
                  className="border-border-faint bg-surface-2 flex flex-col gap-2 rounded border p-2.5"
                >
                  <div className="flex items-start gap-2">
                    <Input
                      aria-label={`IMDb id ${index + 1}`}
                      placeholder="tt0903747 or an IMDb link"
                      value={item.imdbId}
                      aria-invalid={itemError ? true : undefined}
                      disabled={busy}
                      autoComplete="off"
                      spellCheck={false}
                      className="sm:max-w-56"
                      onChange={(event) => updateItem(item.key, { imdbId: event.target.value })}
                    />
                    <Input
                      aria-label={`comment ${index + 1}`}
                      placeholder="optional comment"
                      value={item.comment}
                      disabled={busy}
                      autoComplete="off"
                      onChange={(event) => updateItem(item.key, { comment: event.target.value })}
                    />
                    <IconButton
                      type="button"
                      aria-label={`remove title ${index + 1}`}
                      disabled={busy || draft.items.length === 1}
                      onClick={() => removeItem(item.key)}
                    >
                      <X />
                    </IconButton>
                  </div>
                  {itemError ? <p className="text-error-text m-0 text-xs">{itemError}</p> : null}
                </div>
              );
            })}
            {errors.items ? <p className="text-error-text m-0 text-xs">{errors.items}</p> : null}
            <Button
              type="button"
              size="sm"
              className="self-start"
              disabled={busy}
              onClick={addItem}
            >
              <Plus />
              add title
            </Button>
          </fieldset>

          {saveMessage ? (
            <p role="alert" className="text-error-text m-0 text-sm">
              {saveMessage}
            </p>
          ) : save.error ? (
            <UserErrorAlert error={save.error} />
          ) : null}
          {remove.error ? <UserErrorAlert error={remove.error} /> : null}
        </div>

        <div className="border-border-faint flex items-center justify-between gap-2 border-t px-4 py-3 sm:px-5">
          <div>
            {editing ? (
              confirmDelete ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="text-error-text"
                  disabled={busy}
                  onClick={() => remove.mutate(binge.id, { onSuccess: onDeleted })}
                >
                  <Trash2 />
                  really delete
                </Button>
              ) : (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={busy}
                  onClick={() => setConfirmDelete(true)}
                >
                  <Trash2 />
                  delete
                </Button>
              )
            ) : null}
          </div>
          <div className="flex items-center gap-2">
            <Button type="button" variant="ghost" size="sm" disabled={busy} onClick={onClose}>
              cancel
            </Button>
            <Button type="submit" variant="primary" size="sm" disabled={busy}>
              {save.isPending ? "saving…" : editing ? "save binge" : "publish binge"}
            </Button>
          </div>
        </div>
      </form>
    </ResponsiveModal>
  );
}
