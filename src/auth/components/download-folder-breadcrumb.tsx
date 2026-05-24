import { ChevronRight } from "lucide-react";

import { cn } from "@/ui/lib/cn";

import type { FolderCrumb } from "./download-folder-picker-model";
import { MiddleTruncatedText } from "./middle-truncated-text";

function DownloadFolderBreadcrumb({
  onJump,
  path,
}: {
  onJump: (index: number) => void;
  path: FolderCrumb[];
}) {
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
                aria-label={item.crumb.name}
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
                <MiddleTruncatedText
                  className="inline-flex min-w-0 max-w-full"
                  text={item.crumb.name}
                  visibleTail={12}
                />
              </button>
            )}
            {!isLast && <ChevronRight className="text-fg-4 size-2.5 shrink-0" strokeWidth={1.75} />}
          </span>
        );
      })}
    </nav>
  );
}

export { DownloadFolderBreadcrumb };
