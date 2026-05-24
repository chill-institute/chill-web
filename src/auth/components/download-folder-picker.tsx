import { useMemo, useRef, useState, type ReactElement } from "react";
import { useQuery } from "@tanstack/react-query";
import { Check, ChevronLeft, House, X } from "lucide-react";

import { Button } from "@/ui/components/ui/button";
import {
  Popover,
  PopoverArrow,
  PopoverClose,
  PopoverContent,
  PopoverTrigger,
} from "@/ui/components/ui/popover";
import { Separator } from "@/ui/components/ui/separator";

import { useApi } from "../api-context";
import { folderQueryOptions } from "../queries/options";
import { DownloadFolderBreadcrumb } from "./download-folder-breadcrumb";
import { DownloadFolderList } from "./download-folder-list";
import {
  ROOT_CRUMB,
  ROOT_FOLDER_ID,
  initialFolderPath,
  type FolderCrumb,
} from "./download-folder-picker-model";

type Props = {
  initialFolder?: FolderCrumb | null;
  renderTrigger?: (open: boolean) => ReactElement;
  triggerLabel?: string;
  onSave: (id: bigint) => void;
};

export function DownloadFolderPicker({
  initialFolder,
  renderTrigger,
  triggerLabel = "change",
  onSave,
}: Props) {
  const [open, setOpen] = useState(false);
  const pickerRootRef = useRef<HTMLSpanElement | null>(null);
  const portalContainer =
    pickerRootRef.current?.closest<HTMLElement>('[data-slot="drawer-content"]') ?? undefined;
  const nestedInDrawer = portalContainer !== undefined;
  const trigger = renderTrigger ? (
    renderTrigger(open)
  ) : (
    <Button aria-expanded={open} aria-haspopup="dialog" size="sm" type="button">
      {triggerLabel}
    </Button>
  );

  return (
    <span ref={pickerRootRef} className="contents">
      <Popover modal={nestedInDrawer} open={open} onOpenChange={setOpen}>
        <PopoverTrigger render={trigger} />

        <PopoverContent
          align="center"
          aria-label="choose download folder"
          className="w-[296px] min-w-[296px] max-w-[296px] overflow-hidden p-0 shadow-[0_12px_32px_rgba(0,0,0,0.18),var(--shadow-press)]"
          portalContainer={portalContainer}
          role="dialog"
          sideOffset={8}
          style={{
            fontSize: 14,
            lineHeight: 1.2,
            maxWidth: 296,
            minWidth: 296,
            overflow: "hidden",
            width: 296,
          }}
        >
          <PickerBody
            key={open ? "open" : "closed"}
            initialFolder={initialFolder ?? null}
            open={open}
            onSave={(id) => {
              onSave(id);
              setOpen(false);
            }}
            onClose={() => setOpen(false)}
          />

          <PopoverArrow />
        </PopoverContent>
      </Popover>
    </span>
  );
}

function PickerBody({
  initialFolder,
  open,
  onClose,
  onSave,
}: {
  initialFolder: FolderCrumb | null;
  open: boolean;
  onClose: () => void;
  onSave: (id: bigint) => void;
}) {
  const api = useApi();
  const [path, setPath] = useState<FolderCrumb[]>(() => initialFolderPath(initialFolder));
  const currentFolder = path[path.length - 1] ?? ROOT_CRUMB;

  const folderQuery = useQuery({
    ...folderQueryOptions(api, currentFolder.id),
    enabled: open,
  });

  const folders = useMemo(
    () =>
      (folderQuery.data?.files ?? []).filter(
        (file) => file.fileType === "FOLDER" && file.isShared === false,
      ),
    [folderQuery.data?.files],
  );

  const navigateInto = (folder: FolderCrumb) => {
    setPath((currentPath) => [...currentPath, folder]);
  };

  const navigateBack = () => {
    setPath((currentPath) => currentPath.slice(0, -1));
  };
  const canNavigateBack = path.length > 1;

  return (
    <div style={{ maxWidth: 296, minWidth: 0, overflow: "hidden", width: 296 }}>
      <div className="flex min-w-0 items-center gap-1 py-2 pr-2 pl-1.5">
        {canNavigateBack ? (
          <button
            aria-label="Go back to parent folder"
            data-touch-target
            className="text-fg-2 hover-hover:hover:bg-hover hover-hover:hover:text-fg-1 inline-flex size-[22px] shrink-0 items-center justify-center rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring-focus focus-visible:ring-offset-2 focus-visible:ring-offset-app"
            onClick={navigateBack}
            type="button"
          >
            <span aria-hidden="true" className="touch-target" />
            <ChevronLeft className="size-3" strokeWidth={1.75} />
          </button>
        ) : (
          <span className="text-fg-3 inline-flex size-[22px] shrink-0 items-center justify-center">
            <House
              aria-label="At Your Files root"
              className="size-3"
              role="img"
              strokeWidth={1.75}
            />
          </span>
        )}

        <DownloadFolderBreadcrumb
          path={path}
          onJump={(index) => setPath(path.slice(0, index + 1))}
        />

        <PopoverClose
          aria-label="Close"
          data-touch-target
          className="text-fg-3 hover-hover:hover:bg-hover hover-hover:hover:text-fg-1 inline-flex size-5 shrink-0 cursor-pointer items-center justify-center rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring-focus focus-visible:ring-offset-2 focus-visible:ring-offset-app"
          onClick={onClose}
        >
          <span aria-hidden="true" className="touch-target" />
          <X className="size-3" strokeWidth={1.75} />
        </PopoverClose>
      </div>

      <Separator />

      <DownloadFolderList
        folders={folders}
        onOpen={navigateInto}
        onRetry={() => void folderQuery.refetch()}
        state={folderQuery.status}
      />

      <Separator />

      <div className="bg-surface-2 flex justify-end px-2.5 py-2">
        <Button
          aria-label={`Use ${currentFolder.name} as download folder`}
          disabled={folderQuery.status !== "success"}
          onClick={() => onSave(currentFolder.id)}
          size="sm"
        >
          <Check data-icon="inline-start" />
          <ConfirmLabel current={currentFolder} />
        </Button>
      </div>
    </div>
  );
}

function ConfirmLabel({ current }: { current: FolderCrumb }) {
  if (current.id === ROOT_FOLDER_ID) return "use your files";
  if (current.name.length > 18) return "use this folder";
  return (
    <>
      use <span className="inline-block max-w-[14ch] truncate">&quot;{current.name}&quot;</span>
    </>
  );
}
