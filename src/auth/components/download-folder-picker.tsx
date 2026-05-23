import { useMemo, useRef, useState, type ReactElement, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Folder,
  FolderOpen,
  House,
  RotateCcw,
  TriangleAlert,
  X,
} from "lucide-react";

import { Button } from "@/ui/components/ui/button";
import {
  Popover,
  PopoverArrow,
  PopoverClose,
  PopoverContent,
  PopoverTrigger,
} from "@/ui/components/ui/popover";
import { ScrollArea } from "@/ui/components/ui/scroll-area";
import { Separator } from "@/ui/components/ui/separator";
import { Skeleton } from "@/ui/components/ui/skeleton";
import { cn } from "@/ui/lib/cn";

import { useApi } from "../api-context";

const ROOT_FOLDER_ID = 0n;

type FolderCrumb = {
  id: bigint;
  name: string;
};

type Props = {
  initialFolder?: FolderCrumb | null;
  renderTrigger?: (open: boolean) => ReactElement;
  triggerLabel?: string;
  onSave: (id: bigint) => void;
};

const ROOT_CRUMB: FolderCrumb = { id: ROOT_FOLDER_ID, name: "Your Files" };
const FOLDER_SKELETON_WIDTHS = [78, 54, 66, 42, 70, 50] as const;

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
  const [path, setPath] = useState<FolderCrumb[]>(() => initialPath(initialFolder));
  const currentFolder = path[path.length - 1] ?? ROOT_CRUMB;

  const folderQuery = useQuery({
    queryKey: ["folder", String(currentFolder.id)],
    queryFn: ({ signal }) => api.getFolder(currentFolder.id, signal),
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

        <Breadcrumb path={path} onJump={(index) => setPath(path.slice(0, index + 1))} />

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

      <FolderList
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

function initialPath(folder: FolderCrumb | null): FolderCrumb[] {
  if (!folder || isRootFolder(folder)) {
    return [ROOT_CRUMB];
  }
  return [ROOT_CRUMB, folder];
}

function isRootFolder(folder: FolderCrumb): boolean {
  if (folder.id !== ROOT_FOLDER_ID) return false;
  const name = folder.name.trim().toLowerCase();
  return name === "" || name === "my files" || name === "your files";
}

function Breadcrumb({ onJump, path }: { onJump: (index: number) => void; path: FolderCrumb[] }) {
  const displayed =
    path.length <= 2
      ? path.map((crumb, index) => ({ crumb, index, type: "crumb" as const }))
      : [
          { crumb: path[0], index: 0, type: "crumb" as const },
          { index: path.length - 2, type: "ellipsis" as const },
          { crumb: path[path.length - 1], index: path.length - 1, type: "crumb" as const },
        ];

  return (
    <nav
      aria-label="folder path"
      className="flex min-w-0 flex-1 items-center gap-1 overflow-hidden text-xs"
      style={{ flex: "1 1 auto", minWidth: 0, overflow: "hidden" }}
    >
      {displayed.map((item, displayedIndex) => {
        const isLast = displayedIndex === displayed.length - 1;
        const key = item.type === "ellipsis" ? "ellipsis" : String(item.crumb.id);

        return (
          <span
            key={`${key}-${displayedIndex}`}
            className={cn("flex min-w-0 items-center gap-1", isLast && "flex-1")}
            style={{
              display: "flex",
              flex: isLast ? "1 1 auto" : "0 0 auto",
              minWidth: 0,
              overflow: "hidden",
            }}
          >
            {item.type === "ellipsis" ? (
              <button
                aria-label="show parent folders"
                data-touch-target
                className="text-fg-3 hover-hover:hover:bg-hover hover-hover:hover:text-fg-1 rounded px-1 py-0.5 leading-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring-focus focus-visible:ring-offset-2 focus-visible:ring-offset-app"
                onClick={() => onJump(item.index)}
                title={path
                  .slice(1, -1)
                  .map((crumb) => crumb.name)
                  .join(" / ")}
                type="button"
              >
                <span aria-hidden="true" className="touch-target" />
                ...
              </button>
            ) : (
              <button
                data-touch-target={!isLast ? "" : undefined}
                className={cn(
                  "min-w-0 rounded px-1 py-0.5 leading-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring-focus focus-visible:ring-offset-2 focus-visible:ring-offset-app",
                  isLast && "w-full text-left",
                  isLast
                    ? "text-fg-1 font-medium"
                    : "text-fg-3 hover-hover:hover:bg-hover hover-hover:hover:text-fg-1",
                )}
                disabled={isLast}
                onClick={() => onJump(item.index)}
                style={{
                  display: "inline-flex",
                  maxWidth: "100%",
                  minWidth: 0,
                  overflow: "hidden",
                  whiteSpace: "nowrap",
                  width: isLast ? "100%" : undefined,
                }}
                title={item.crumb.name}
                type="button"
              >
                {!isLast ? <span aria-hidden="true" className="touch-target" /> : null}
                {isLast ? <MidTrunc text={item.crumb.name} /> : item.crumb.name}
              </button>
            )}
            {!isLast && <ChevronRight className="text-fg-4 size-2.5 shrink-0" strokeWidth={1.75} />}
          </span>
        );
      })}
    </nav>
  );
}

function FolderList({
  folders,
  onOpen,
  onRetry,
  state,
}: {
  folders: FolderCrumb[];
  onOpen: (folder: FolderCrumb) => void;
  onRetry: () => void;
  state: "error" | "pending" | "success";
}) {
  return (
    <div
      className="h-[240px] min-w-0 max-w-full overflow-hidden"
      style={{ height: 240, maxWidth: "100%", minWidth: 0, overflow: "hidden" }}
    >
      {state === "pending" && <FolderSkeleton />}

      {state === "error" && (
        <FolderMessage
          action={
            <Button onClick={onRetry} size="sm" variant="outline">
              <RotateCcw data-icon="inline-start" />
              retry
            </Button>
          }
          description="maybe it's deleted, or the API hiccupped. you can still pick something else."
          icon={<TriangleAlert />}
          tone="error"
          title="couldn't load folder"
        />
      )}

      {state === "success" && folders.length === 0 && (
        <FolderMessage
          description="that's fine — you can still download into it. confirm below."
          icon={<FolderOpen />}
          title="nothing inside this folder"
        />
      )}

      {state === "success" && folders.length > 0 && (
        <ScrollArea className="h-full min-w-0 max-w-full">
          <div className="flex min-w-0 max-w-full flex-col overflow-hidden p-1">
            {folders.map((folder) => (
              <button
                aria-label={`Open folder ${folder.name}`}
                data-touch-target
                className="hover-hover:hover:bg-hover active:bg-active grid w-full min-w-0 max-w-full grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-[7px] overflow-hidden rounded px-[7px] py-[5px] text-left text-sm leading-tight focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring-focus focus-visible:ring-offset-2 focus-visible:ring-offset-app"
                key={String(folder.id)}
                onClick={() => onOpen(folder)}
                style={{
                  display: "grid",
                  gap: 7,
                  gridTemplateColumns: "auto minmax(0, 1fr) auto",
                  maxWidth: "100%",
                  minWidth: 0,
                  overflow: "hidden",
                  width: "100%",
                }}
                title={folder.name}
                type="button"
              >
                <span aria-hidden="true" className="touch-target" />
                <Folder className="text-fg-2 size-3 shrink-0" strokeWidth={1.5} />
                <span
                  className="min-w-0 overflow-hidden text-fg-1"
                  style={{ minWidth: 0, overflow: "hidden" }}
                >
                  <MidTrunc text={folder.name} />
                </span>
                <ChevronRight className="text-fg-4 size-3 shrink-0 opacity-80" strokeWidth={1.5} />
              </button>
            ))}
          </div>
        </ScrollArea>
      )}
    </div>
  );
}

function FolderSkeleton() {
  return (
    <div aria-hidden="true" className="flex flex-col gap-1 p-2">
      {FOLDER_SKELETON_WIDTHS.map((width) => (
        <div
          className="grid grid-cols-[14px_minmax(0,1fr)] items-center gap-[7px] px-[7px] py-[5px]"
          key={width}
        >
          <Skeleton className="h-3 w-3.5 rounded-sm" />
          <Skeleton className="h-3" style={{ width: `${width}%` }} />
        </div>
      ))}
    </div>
  );
}

function FolderMessage({
  action,
  description,
  icon,
  title,
  tone,
}: {
  action?: ReactNode;
  description: string;
  icon: ReactNode;
  title: string;
  tone?: "error";
}) {
  return (
    <div
      className="flex h-full flex-col items-center justify-start text-center"
      style={{ gap: 6, height: "100%", padding: "36px 24px 20px" }}
    >
      <div
        className={cn(
          "border-border-soft bg-surface-2 text-fg-3 flex items-center justify-center rounded border",
          tone === "error" && "border-error-border bg-error-bg text-error-text",
        )}
        style={{ height: 32, marginBottom: 4, width: 32 }}
      >
        <span className="[&_svg]:size-4 [&_svg]:shrink-0 [&_svg]:stroke-[1.5]">{icon}</span>
      </div>
      <div className="text-fg-1 font-medium" style={{ fontSize: 14, lineHeight: 1.2 }}>
        {title}
      </div>
      <p className="text-fg-3 m-0 text-xs" style={{ marginBottom: action ? 8 : 0, maxWidth: 224 }}>
        {description}
      </p>
      {action}
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

function MidTrunc({
  text,
  tailChars = 8,
  threshold = 18,
}: {
  text: string;
  tailChars?: number;
  threshold?: number;
}) {
  if (!text || text.length <= threshold) {
    return (
      <span
        className="inline-flex max-w-full align-bottom whitespace-nowrap"
        style={{ maxWidth: "100%", overflow: "hidden", whiteSpace: "nowrap" }}
      >
        {text}
      </span>
    );
  }

  let splitAt = -1;
  for (const separator of ["-", "."]) {
    const index = text.lastIndexOf(separator);
    if (index > 0 && text.length - index <= 14 && text.length - index >= 3) {
      splitAt = index;
      break;
    }
  }

  if (splitAt < 0) {
    splitAt = text.length - tailChars;
  }

  return (
    <span
      className="inline-flex w-full min-w-0 max-w-full align-bottom"
      style={{ display: "inline-flex", maxWidth: "100%", minWidth: 0, width: "100%" }}
    >
      <span
        className="min-w-0 flex-[0_1_auto] truncate"
        style={{
          flex: "0 1 auto",
          minWidth: 0,
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}
      >
        {text.slice(0, splitAt)}
      </span>
      <span className="shrink-0 whitespace-nowrap" style={{ flexShrink: 0, whiteSpace: "nowrap" }}>
        {text.slice(splitAt)}
      </span>
    </span>
  );
}
