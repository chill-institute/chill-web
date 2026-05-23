import { Folder } from "lucide-react";
import { match } from "ts-pattern";

import { DownloadFolderPicker } from "@/auth/components/download-folder-picker";
import { UserErrorAlert } from "@/auth/components/user-error-alert";
import { SettingsSection } from "@/ui/components/settings-section";
import { Skeleton } from "@/ui/components/ui/skeleton";
import type { ChillSettings } from "@/lib/types";

import type { DownloadFolderQuery, PersistPatch } from "./types";

function DownloadFolderSection({
  effective,
  downloadFolderQuery,
  persistPatch,
}: {
  effective: ChillSettings;
  downloadFolderQuery: DownloadFolderQuery;
  persistPatch: PersistPatch;
}) {
  const content = match(downloadFolderQuery)
    .with({ status: "pending" }, () => <Skeleton className="h-9 w-full rounded" />)
    .with({ status: "error" }, (dq) => <UserErrorAlert error={dq.error} />)
    .with({ status: "success" }, (dq) => {
      const hasMatchingFolder =
        effective.download.folderId === undefined ||
        dq.data.folder?.id === effective.download.folderId;

      if (!hasMatchingFolder) {
        return <Skeleton className="h-9 w-full rounded" />;
      }

      return (
        <div
          className="border-border-strong bg-surface flex h-9 w-full items-center justify-between gap-2 rounded border px-2.5 py-1.5 dark:bg-surface-2/30"
          title={dq.data.folder?.name ?? "no folder selected"}
        >
          <span className="flex min-w-0 flex-1 items-center gap-2">
            <Folder className="text-fg-2 size-4 shrink-0" />
            <span className="text-fg-1 truncate text-sm">
              {dq.data.folder?.name ?? "no folder selected"}
            </span>
          </span>
          <DownloadFolderPicker
            initialFolder={dq.data.folder}
            onSave={(id) => persistPatch({ download: { folderId: id } })}
            renderTrigger={(open) => (
              <button
                aria-expanded={open}
                aria-haspopup="dialog"
                className="text-fg-3 hover-hover:hover:text-fg-1 inline-flex min-h-6 shrink-0 cursor-pointer items-center text-sm hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring-focus focus-visible:ring-offset-2 focus-visible:ring-offset-app"
                type="button"
              >
                {dq.data.folder ? "change" : "choose"}
              </button>
            )}
          />
        </div>
      );
    })
    .exhaustive();

  return <SettingsSection title="Download folder">{content}</SettingsSection>;
}

export { DownloadFolderSection };
