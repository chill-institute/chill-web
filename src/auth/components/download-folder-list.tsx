import { ChevronRight, Folder, FolderOpen, RotateCcw, TriangleAlert } from "lucide-react";
import type { CSSProperties, ReactNode } from "react";

import { Button } from "@/ui/components/ui/button";
import { ScrollArea } from "@/ui/components/ui/scroll-area";
import { Skeleton } from "@/ui/components/ui/skeleton";
import { cn } from "@/ui/lib/cn";

import type { FolderCrumb } from "./download-folder-picker-model";
import { MiddleTruncatedText } from "./middle-truncated-text";

const FOLDER_SKELETON_WIDTHS = [78, 54, 66, 42, 70, 50] as const;

function DownloadFolderList({
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
    <div className="h-60 min-w-0 max-w-full overflow-hidden">
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
          icon={<TriangleAlert strokeWidth={1.5} />}
          tone="error"
          title="couldn't load folder"
        />
      )}

      {state === "success" && folders.length === 0 && (
        <FolderMessage
          description="that's fine — you can still download into it. confirm below."
          icon={<FolderOpen strokeWidth={1.5} />}
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
                className="hover-hover:hover:bg-hover active:bg-active grid w-full min-w-0 max-w-full grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-1.75 overflow-hidden rounded px-1.75 py-1.25 text-left text-sm leading-tight focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring-focus focus-visible:ring-offset-2 focus-visible:ring-offset-app"
                key={String(folder.id)}
                onClick={() => onOpen(folder)}
                title={folder.name}
                type="button"
              >
                <span aria-hidden="true" className="touch-target" />
                <Folder className="text-fg-2 size-3 shrink-0" strokeWidth={1.5} />
                <MiddleTruncatedText className="inline-flex min-w-0 text-fg-1" text={folder.name} />
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
          className="grid grid-cols-[14px_minmax(0,1fr)] items-center gap-1.75 px-1.75 py-1.25"
          key={width}
        >
          <Skeleton shape="sm" className="h-3 w-3.5" />
          <Skeleton
            className="h-3 w-(--folder-skeleton-width)"
            style={{ "--folder-skeleton-width": `${width}%` } as CSSProperties}
          />
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
    <div className="flex h-full flex-col items-center justify-start gap-1.5 px-6 pt-9 pb-5 text-center">
      <div
        className={cn(
          "border-border-soft bg-surface-2 text-fg-3 mb-1 flex size-8 items-center justify-center rounded border",
          tone === "error" && "border-error-border bg-surface text-error-text",
        )}
      >
        <span className="[&_svg]:size-4 [&_svg]:shrink-0">{icon}</span>
      </div>
      <div className="text-fg-1 text-sm leading-title font-medium">{title}</div>
      <p className={cn("text-fg-3 m-0 max-w-56 text-xs", action && "mb-2")}>{description}</p>
      {action}
    </div>
  );
}

export { DownloadFolderList };
