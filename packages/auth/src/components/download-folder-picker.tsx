import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ChevronLeft, Folder, X } from "lucide-react";

import { EmptyState } from "@chill-institute/ui/components/empty-state";
import { Button } from "@chill-institute/ui/components/ui/button";
import {
  Popover,
  PopoverArrow,
  PopoverClose,
  PopoverContent,
  PopoverTrigger,
} from "@chill-institute/ui/components/ui/popover";
import { ScrollArea } from "@chill-institute/ui/components/ui/scroll-area";
import { Separator } from "@chill-institute/ui/components/ui/separator";
import { Skeleton } from "@chill-institute/ui/components/ui/skeleton";

import { useApi } from "../api-context";

const ROOT_FOLDER_ID = 0n;

type Props = {
  triggerLabel?: string;
  onSave: (id: bigint) => void;
};

export function DownloadFolderPicker({ triggerLabel = "change", onSave }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <button
            className="text-fg-3 hover-hover:hover:text-fg-1 cursor-pointer text-sm hover:underline"
            type="button"
          >
            {triggerLabel}
          </button>
        }
      />

      <PopoverContent>
        <PickerBody
          key={String(open)}
          open={open}
          onSave={(id) => {
            onSave(id);
            setOpen(false);
          }}
        />

        <PopoverClose
          aria-label="Close"
          className="text-fg-3 hover-hover:hover:text-fg-1 absolute top-2 right-2 cursor-pointer text-sm"
        >
          <X />
        </PopoverClose>

        <PopoverArrow />
      </PopoverContent>
    </Popover>
  );
}

function PickerBody({ open, onSave }: { open: boolean; onSave: (id: bigint) => void }) {
  const api = useApi();
  const [currentFolderId, setCurrentFolderId] = useState<bigint>(ROOT_FOLDER_ID);
  const [folderStack, setFolderStack] = useState<bigint[]>([]);

  const folderQuery = useQuery({
    queryKey: ["folder", String(currentFolderId)],
    queryFn: ({ signal }) => api.getFolder(currentFolderId, signal),
    enabled: open,
  });

  const folders = useMemo(
    () =>
      (folderQuery.data?.files ?? []).filter(
        (file) => file.fileType === "FOLDER" && file.isShared === false,
      ),
    [folderQuery.data?.files],
  );

  const navigateInto = (id: bigint) => {
    setFolderStack((stack) => [...stack, currentFolderId]);
    setCurrentFolderId(id);
  };

  const navigateBack = () => {
    const stack = [...folderStack];
    const parentId = stack.pop();
    if (parentId !== undefined) {
      setFolderStack(stack);
      setCurrentFolderId(parentId);
    }
  };

  if (folderQuery.status === "error") {
    return (
      <EmptyState description="Maybe it's deleted?" icon="😕" title="Could not fetch the folder." />
    );
  }

  if (folderQuery.status === "success") {
    return (
      <div>
        <div className="flex items-center gap-1 font-medium">
          {folderStack.length > 0 ? (
            <Button
              variant="ghost"
              size="icon"
              onClick={navigateBack}
              aria-label="Go back to parent folder"
              className="size-6"
            >
              <ChevronLeft />
            </Button>
          ) : null}
          <span className="line-clamp-1" title={folderQuery.data.parent?.name}>
            {folderQuery.data.parent?.name}
          </span>
        </div>

        <Separator className="my-1.5" />

        <ScrollArea className="h-40 pr-4">
          {folders.length ? (
            folders.map((file) => (
              <Button
                variant="ghost"
                key={file.id}
                onClick={() => navigateInto(file.id)}
                title={file.name}
                aria-label={`Open folder ${file.name}`}
                className="w-full justify-start gap-x-1.5 px-2"
              >
                <Folder />
                <span className="flex-1 line-clamp-1 text-left" title={file.name}>
                  {file.name}
                </span>
              </Button>
            ))
          ) : (
            <p>No folders in this directory.</p>
          )}
        </ScrollArea>

        <div className="mt-4 flex items-center justify-end">
          <Button onClick={() => onSave(currentFolderId)}>download here</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-y-4 mt-4">
      <div className="flex flex-col gap-y-2">
        <Skeleton className="h-3 w-3/4" />
        <Skeleton className="h-3 w-2/4" />
        <Skeleton className="h-3 w-3/4" />
        <Skeleton className="h-3 w-2/4" />
      </div>
      <div className="flex flex-col gap-y-2">
        <Skeleton className="h-3 w-3/4" />
        <Skeleton className="h-3 w-2/4" />
        <Skeleton className="h-3 w-3/4" />
        <Skeleton className="h-3 w-2/4" />
      </div>
    </div>
  );
}
