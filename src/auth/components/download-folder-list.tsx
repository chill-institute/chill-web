import { ChevronRight, Folder, FolderOpen, RotateCcw, TriangleAlert } from "lucide-react";
import type { ReactNode } from "react";

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
          tone === "error" && "border-error-border bg-surface text-error-text",
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

export { DownloadFolderList };
