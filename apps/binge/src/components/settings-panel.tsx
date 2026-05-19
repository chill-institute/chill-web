import { Link } from "@tanstack/react-router";
import { ArrowUpRight, Folder } from "lucide-react";
import { match } from "ts-pattern";

import { useAuth } from "@chill-institute/auth/auth";
import { DownloadFolderPicker } from "@chill-institute/auth/components/download-folder-picker";
import { UserErrorAlert } from "@chill-institute/auth/components/user-error-alert";
import { Avatar, AvatarFallback, AvatarImage } from "@chill-institute/ui/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@chill-institute/ui/components/ui/select";
import { SettingsSection } from "@chill-institute/ui/components/settings-section";
import { Skeleton } from "@chill-institute/ui/components/ui/skeleton";
import { useSettingsQuery, useSaveSettings } from "@/queries/settings";
import { useDownloadFolderQuery } from "@chill-institute/auth/queries/download-folder";
import { useProfileQuery } from "@chill-institute/auth/queries/profile";
import { isThemePreference, useTheme } from "@chill-institute/ui/hooks/use-theme";
import { publicLinks } from "@chill-institute/ui/lib/public-links";
import {
  applyBingeSettingsPatch,
  resetBingeSettings,
  toBingeSettings,
  type BingeSettings,
} from "@/lib/types";

const LINKS = [
  { title: "about", url: publicLinks.about },
  { title: "github", url: publicLinks.github },
  { title: "x", url: publicLinks.x },
  { title: "email", url: publicLinks.email },
  { title: "reddit", url: publicLinks.reddit },
];

function SettingsSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <SettingsSection title="Signed in as">
        <Skeleton className="h-[50px] w-full rounded" />
      </SettingsSection>
      <SettingsSection title="User-interface theme">
        <Skeleton className="h-9 w-full rounded" />
      </SettingsSection>
      <SettingsSection title="Download folder">
        <Skeleton className="h-9 w-full rounded" />
      </SettingsSection>
    </div>
  );
}

export function SettingsPanel() {
  const auth = useAuth();
  const { theme, setTheme, systemDark } = useTheme();

  const configQuery = useSettingsQuery();
  const profileQuery = useProfileQuery();
  const downloadFolderQuery = useDownloadFolderQuery();

  const saveMutation = useSaveSettings();

  const persistPatch = (patch: Partial<BingeSettings>) => {
    if (!configQuery.data) return;
    saveMutation.mutate(applyBingeSettingsPatch(configQuery.data, patch));
  };

  const resetSettings = () => {
    if (!configQuery.data) return;
    saveMutation.mutate(resetBingeSettings(configQuery.data));
  };

  if (!auth.isAuthenticated) {
    return null;
  }

  return match(configQuery)
    .with({ status: "pending" }, () => <SettingsSkeleton />)
    .with({ status: "error" }, (q) => <UserErrorAlert error={q.error} />)
    .with({ status: "success" }, (query) => {
      const config = query.data;
      const effective = toBingeSettings(config);

      const downloadFolderContent = match(downloadFolderQuery)
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
                    className="text-fg-3 hover-hover:hover:text-fg-1 shrink-0 cursor-pointer text-sm hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring-focus focus-visible:ring-offset-2 focus-visible:ring-offset-app"
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

      return (
        <div className="flex flex-col gap-6">
          <SettingsSection title="Signed in as">
            <div className="border-border-strong flex items-center justify-between gap-2 rounded border px-2.5 py-1.5 dark:bg-surface-2/30">
              <div className="flex min-w-0 items-center gap-2">
                <Avatar size="sm" className="size-7 shrink-0">
                  {profileQuery.data?.avatarUrl ? (
                    <AvatarImage
                      src={profileQuery.data.avatarUrl}
                      alt={profileQuery.data.username}
                    />
                  ) : null}
                  <AvatarFallback>
                    {profileQuery.data?.username?.slice(0, 1).toUpperCase() ?? "?"}
                  </AvatarFallback>
                </Avatar>
                <span className="text-fg-1 truncate text-sm">
                  {profileQuery.data?.username ?? "put.io user"}
                </span>
              </div>
              <div className="flex shrink-0 items-center gap-3">
                <button
                  type="button"
                  className="text-fg-3 hover-hover:hover:text-fg-1 focus-visible:ring-ring-focus focus-visible:ring-offset-app cursor-pointer rounded-sm text-sm hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
                  onClick={resetSettings}
                >
                  reset settings
                </button>
                <Link
                  to="/sign-out"
                  search={{ error: undefined }}
                  className="text-error-text hover-hover:hover:text-error-text/80 focus-visible:ring-ring-focus focus-visible:ring-offset-app rounded-sm text-sm hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
                >
                  sign out
                </Link>
              </div>
            </div>
          </SettingsSection>

          <SettingsSection title="User-interface theme">
            <Select<string>
              value={theme}
              onValueChange={(value) => {
                if (value != null && isThemePreference(value)) {
                  setTheme(value);
                }
              }}
            >
              <SelectTrigger className="w-full">
                <SelectValue>
                  {(value) => {
                    if (value === "system") return `System (${systemDark ? "dark" : "light"})`;
                    if (value === "light") return "Light";
                    if (value === "dark") return "Dark";
                    return null;
                  }}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectItem value="system">{`System (${systemDark ? "dark" : "light"})`}</SelectItem>
                  <SelectItem value="light">Light</SelectItem>
                  <SelectItem value="dark">Dark</SelectItem>
                </SelectGroup>
              </SelectContent>
            </Select>
          </SettingsSection>

          <SettingsSection title="Download folder">{downloadFolderContent}</SettingsSection>

          {saveMutation.error ? <UserErrorAlert error={saveMutation.error} /> : null}

          <div className="flex flex-col gap-1 font-mono text-2xs sm:flex-row sm:items-center sm:justify-between sm:gap-3">
            <nav
              aria-label="contact"
              className="text-fg-3 flex flex-wrap items-center gap-x-3 gap-y-1"
            >
              {LINKS.map(({ title, url }, index) => (
                <span key={url} className="inline-flex items-center gap-1">
                  {index > 0 ? (
                    <span aria-hidden="true" className="text-fg-4">
                      ·
                    </span>
                  ) : null}
                  <a
                    className="hover-hover:hover:text-fg-1 inline-flex items-center gap-0.5"
                    href={url}
                    rel="noreferrer noopener"
                    target="_blank"
                  >
                    <span>{title}</span>
                    <ArrowUpRight className="size-3" strokeWidth={1.25} />
                  </a>
                </span>
              ))}
            </nav>
            <span className="text-fg-4 shrink-0">
              release: {import.meta.env.VITE_PUBLIC_RELEASE ?? "dev"}
            </span>
          </div>
        </div>
      );
    })
    .exhaustive();
}
