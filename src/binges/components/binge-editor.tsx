import { useState } from "react";
import { Code, ConnectError } from "@connectrpc/connect";
import { BingeItemsUnresolvedSchema } from "@chill-institute/contracts/chill/v4/api_pb";
import { Trash2 } from "lucide-react";

import { UserErrorAlert } from "@/auth/components/user-error-alert";
import {
  useDeleteBinge,
  useLoadLatestBinge,
  useSaveBinge,
  useSetCuratorName,
} from "@/binges/queries/binges";
import {
  bingeDraftToInput,
  bingeToDraft,
  moveDraftItem,
  normalizeCuratorName,
  normalizeIMDbId,
  validateBingeDraft,
  type Binge,
  type BingeDraft,
  type BingeDraftErrors,
  type BingeTitlePick,
} from "@/binges/lib/types";
import { BingeEditorList } from "@/binges/components/binge-editor-list";
import { BingeTitleAdder } from "@/binges/components/binge-title-adder";
import { ModalCloseButton } from "@/ui/components/modal-close-button";
import { ResponsiveModal } from "@/ui/components/responsive-modal";
import { Button } from "@/ui/components/ui/button";
import { Field, FieldLabel } from "@/ui/components/ui/field";
import { Input } from "@/ui/components/ui/input";
import { Textarea } from "@/ui/components/ui/textarea";

type Props = {
  binge?: Binge;
  curatorName: string | undefined;
  onClose: () => void;
  onSaved: (binge: Binge) => void;
  onDeleted: (id: string) => void;
};

const NO_ERRORS: BingeDraftErrors = { itemErrors: {} };

let itemKeyCounter = 0;
function newItemKey() {
  itemKeyCounter += 1;
  return `item-${itemKeyCounter}`;
}

function isNameTaken(error: unknown): boolean {
  return error instanceof ConnectError && error.code === Code.AlreadyExists;
}

function isConflict(error: unknown): boolean {
  return error instanceof ConnectError && error.code === Code.FailedPrecondition;
}

const NO_UNRESOLVED: ReadonlySet<string> = new Set();

function unresolvedImdbIds(error: unknown): ReadonlySet<string> {
  if (!(error instanceof ConnectError) || error.code !== Code.InvalidArgument) {
    return NO_UNRESOLVED;
  }
  const ids = error.findDetails(BingeItemsUnresolvedSchema).flatMap((detail) => detail.imdbIds);
  return ids.length > 0 ? new Set(ids) : NO_UNRESOLVED;
}

function unresolvedMessage(count: number): string {
  return count === 1
    ? "1 title could not be found. remove or replace the marked title."
    : `${count} titles could not be found. remove or replace the marked titles.`;
}

function requestMessage(error: unknown): string | null {
  if (error instanceof ConnectError && error.code === Code.InvalidArgument) {
    return error.rawMessage;
  }
  return null;
}

export function BingeEditor({
  binge,
  curatorName: initialName,
  onClose,
  onSaved,
  onDeleted,
}: Props) {
  const curatorName = initialName ?? "";
  const [base, setBase] = useState<Binge | undefined>(binge);
  const [draftVersion, setDraftVersion] = useState(0);
  const [draft, setDraft] = useState<BingeDraft>(() => bingeToDraft(binge, newItemKey));
  const [errors, setErrors] = useState<BingeDraftErrors>(NO_ERRORS);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [editingName, setEditingName] = useState(curatorName.trim().length === 0);
  const [nameDraft, setNameDraft] = useState(curatorName);
  const [nameError, setNameError] = useState<string | undefined>(undefined);
  const save = useSaveBinge();
  const remove = useDeleteBinge();
  const setName = useSetCuratorName();
  const loadLatest = useLoadLatestBinge();
  const busy = save.isPending || remove.isPending || setName.isPending || loadLatest.isPending;
  const editing = base !== undefined;
  const needsName = curatorName.trim().length === 0 || editingName;

  const [addError, setAddError] = useState<string | undefined>(undefined);

  const updateComment = (key: string, comment: string) =>
    setDraft((prev) => ({
      ...prev,
      items: prev.items.map((item) => (item.key === key ? { ...item, comment } : item)),
    }));
  const removeItem = (key: string) =>
    setDraft((prev) => ({ ...prev, items: prev.items.filter((item) => item.key !== key) }));
  const addItem = (pick: BingeTitlePick) => {
    if (draft.items.some((item) => item.imdbId === pick.imdbId)) {
      setAddError(`${pick.title || pick.imdbId} is already in this binge`);
      return;
    }
    setAddError(undefined);
    setDraft((prev) => ({
      ...prev,
      items: [...prev.items, { ...pick, key: newItemKey(), comment: "" }],
    }));
  };

  const submit = () => {
    const validation = validateBingeDraft(draft);
    setErrors(validation ?? NO_ERRORS);
    const name = needsName ? normalizeCuratorName(nameDraft) : undefined;
    setNameError(name?.error);
    if (validation || name?.error) return;
    loadLatest.reset();
    const publish = () =>
      save.mutate(
        { id: base?.id, input: bingeDraftToInput(draft), expectedUpdatedAt: base?.updatedAt },
        {
          onSuccess: (saved) => {
            if (!saved) return;
            setBase(saved);
            onSaved(saved);
          },
        },
      );
    if (name && name.name !== curatorName) {
      setName.mutate(name.name, { onSuccess: publish });
      return;
    }
    publish();
  };

  const replaceWithLatest = (id: string) =>
    loadLatest.mutate(id, {
      onSuccess: (latest) => {
        if (!latest) return;
        setBase(latest);
        setDraft(bingeToDraft(latest, newItemKey));
        setDraftVersion((version) => version + 1);
        setErrors(NO_ERRORS);
        setAddError(undefined);
        setConfirmDelete(false);
        save.reset();
      },
    });

  const nameTaken = isNameTaken(setName.error);
  const shownNameError = nameError ?? (nameTaken ? "that name is already taken" : undefined);
  const conflict = isConflict(save.error);
  const unresolved = unresolvedImdbIds(save.error);
  const unresolvedItemErrors: Record<string, string> = {};
  for (const item of draft.items) {
    if (unresolved.has(normalizeIMDbId(item.imdbId))) {
      unresolvedItemErrors[item.key] = "not found: this title could not be resolved";
    }
  }
  const markedCount = Object.keys(unresolvedItemErrors).length;
  const saveRequestMessage = unresolved.size > 0 ? null : requestMessage(save.error);
  const saveMessage =
    markedCount > 0
      ? unresolvedMessage(markedCount)
      : (saveRequestMessage ?? requestMessage(setName.error));
  const itemErrors: Record<string, string> = { ...unresolvedItemErrors, ...errors.itemErrors };

  return (
    <ResponsiveModal
      open
      onOpenChange={(open) => !open && !busy && onClose()}
      title={editing ? "Edit binge" : "New binge"}
      description="Title, blurb, and the movies and shows that make up this binge"
      desktopContentClassName="fixed top-6 left-1/2 max-h-[calc(100dvh-48px)] w-[min(100vw-2rem,1080px)] -translate-x-1/2"
      desktopContentVariant="panel"
      drawerContentClassName="max-h-[92dvh] overflow-hidden"
      drawerContentVariant="raised"
    >
      <form
        className="flex min-h-0 flex-col"
        onSubmit={(event) => {
          event.preventDefault();
          submit();
        }}
      >
        <div className="border-border-faint flex items-center justify-between border-b px-4 py-3 sm:px-6">
          <h2 className="m-0 text-xl sm:text-2xl">{editing ? "edit binge" : "new binge"}</h2>
          <ModalCloseButton onClick={onClose} aria-label="Close binge editor" disabled={busy} />
        </div>

        <div className="flex min-h-0 flex-col gap-5 overflow-y-auto px-4 py-4 sm:px-6 sm:py-5">
          <div className="grid gap-4 sm:grid-cols-2 sm:gap-8">
            <div className="flex flex-col gap-4">
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
                {errors.title ? (
                  <p className="text-error-text m-0 text-xs">{errors.title}</p>
                ) : null}
              </Field>
              {needsName ? (
                <Field data-invalid={shownNameError ? "true" : undefined}>
                  <FieldLabel htmlFor="binge-curator-name">your curator name</FieldLabel>
                  <Input
                    id="binge-curator-name"
                    value={nameDraft}
                    aria-invalid={shownNameError ? true : undefined}
                    disabled={busy}
                    autoComplete="off"
                    placeholder="shown on your binges instead of your put.io name"
                    onChange={(event) => {
                      setNameDraft(event.target.value);
                      if (nameTaken) setName.reset();
                    }}
                  />
                  {shownNameError ? (
                    <p className="text-error-text m-0 text-xs">{shownNameError}</p>
                  ) : null}
                </Field>
              ) : (
                <p className="text-fg-3 m-0 text-sm">
                  publishing as <span className="text-fg-1">{curatorName}</span>
                  {" · "}
                  <button
                    type="button"
                    className="hover-hover:hover:text-fg-1 cursor-pointer underline-offset-4 hover:underline"
                    onClick={() => setEditingName(true)}
                  >
                    change
                  </button>
                </p>
              )}
            </div>
            <Field data-invalid={errors.blurb ? "true" : undefined}>
              <FieldLabel htmlFor="binge-blurb">blurb</FieldLabel>
              <Textarea
                id="binge-blurb"
                value={draft.blurb}
                aria-invalid={errors.blurb ? true : undefined}
                disabled={busy}
                rows={5}
                placeholder="why these, why now"
                onChange={(event) => setDraft((prev) => ({ ...prev, blurb: event.target.value }))}
              />
              {errors.blurb ? <p className="text-error-text m-0 text-xs">{errors.blurb}</p> : null}
            </Field>
          </div>

          <div className="flex flex-col gap-3 sm:grid sm:grid-cols-2 sm:items-start sm:gap-8">
            <div className="flex min-w-0 flex-col gap-1">
              <BingeTitleAdder disabled={busy} onAdd={addItem} />
              {addError ? <p className="text-error-text m-0 text-xs">{addError}</p> : null}
            </div>
            <div className="flex items-center justify-end gap-2">
              {base ? (
                confirmDelete ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={busy}
                    onClick={() => remove.mutate(base.id, { onSuccess: () => onDeleted(base.id) })}
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
              <Button type="button" variant="ghost" size="sm" disabled={busy} onClick={onClose}>
                cancel
              </Button>
              <Button type="submit" variant="primary" size="sm" disabled={busy}>
                {save.isPending ? "saving…" : editing ? "save binge" : "publish binge"}
              </Button>
            </div>
          </div>

          {conflict && base ? (
            <div
              role="alert"
              className="border-border-strong bg-surface-2 flex flex-col gap-3 rounded border p-3 sm:flex-row sm:items-center sm:justify-between"
            >
              <p className="text-fg-1 m-0 text-sm">
                this binge changed since you opened it. your edits are still here; loading the
                latest version replaces them.
              </p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={busy}
                onClick={() => replaceWithLatest(base.id)}
              >
                {loadLatest.isPending ? "loading…" : "load latest version"}
              </Button>
            </div>
          ) : saveMessage ? (
            <p role="alert" className="text-error-text m-0 text-sm">
              {saveMessage}
            </p>
          ) : save.error && unresolved.size === 0 ? (
            <UserErrorAlert error={save.error} />
          ) : setName.error && !nameTaken ? (
            <UserErrorAlert error={setName.error} />
          ) : null}
          {remove.error ? <UserErrorAlert error={remove.error} /> : null}
          {loadLatest.error ? <UserErrorAlert error={loadLatest.error} /> : null}
          {errors.items ? <p className="text-error-text m-0 text-xs">{errors.items}</p> : null}

          <BingeEditorList
            key={draftVersion}
            items={draft.items}
            itemErrors={itemErrors}
            disabled={busy}
            onComment={(key, comment) => updateComment(key, comment)}
            onRemove={removeItem}
            onMove={(key, to) => setDraft((prev) => moveDraftItem(prev, key, to))}
          />
        </div>
      </form>
    </ResponsiveModal>
  );
}
