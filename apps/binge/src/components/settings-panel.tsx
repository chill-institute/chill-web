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
import { type UserSettings } from "@/lib/types";

const LINKS = [
  { title: "X (Twitter)", url: publicLinks.x },
  { title: "Email", url: publicLinks.email },
  { title: "Reddit", url: publicLinks.reddit },
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

  const persistPatch = (patch: Partial<UserSettings>) => {
    if (!configQuery.data) return;
    saveMutation.mutate({ ...configQuery.data, ...patch });
  };

  if (!auth.isAuthenticated) {
    return null;
  }

  return match(configQuery)
    .with({ status: "pending" }, () => <SettingsSkeleton />)
    .with({ status: "error" }, (q) => <UserErrorAlert error={q.error} />)
    .with({ status: "success" }, (query) => {
      const config = query.data;
      const effective = config;

      const downloadFolderContent = match(downloadFolderQuery)
        .with({ status: "pending" }, () => <Skeleton className="h-9 w-full rounded" />)
        .with({ status: "error" }, (dq) => <UserErrorAlert error={dq.error} />)
        .with({ status: "success" }, (dq) => {
          const hasMatchingFolder =
            effective.downloadFolderId === undefined ||
            dq.data.folder?.id === effective.downloadFolderId;

          if (!hasMatchingFolder) {
            return <Skeleton className="h-9 w-full rounded" />;
          }

          return (
            <div className="border-border-strong flex h-9 items-center justify-between gap-2 rounded border px-2.5 py-1.5 dark:bg-surface-2/30">
              <div className="flex min-w-0 flex-1 items-center gap-2">
                <Folder className="text-fg-2 size-4 shrink-0" />
                <span className="text-fg-1 truncate text-sm">
                  {dq.data.folder?.name ?? "no folder selected"}
                </span>
              </div>
              <DownloadFolderPicker
                triggerLabel={dq.data.folder ? "change" : "choose"}
                onSave={(id) => persistPatch({ downloadFolderId: id })}
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
              <Link
                to="/sign-out"
                search={{ error: undefined }}
                className="text-error-text hover-hover:hover:text-error-text/80 shrink-0 text-[13px] hover:underline"
              >
                sign out
              </Link>
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

          <div className="text-fg-3 flex flex-wrap items-center justify-between gap-x-3 gap-y-1 font-mono text-[11px]">
            <span>release: {import.meta.env.VITE_PUBLIC_RELEASE ?? "dev"}</span>
            <nav aria-label="contact" className="flex flex-wrap items-center gap-x-3 gap-y-1">
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
          </div>
        </div>
      );
    })
    .exhaustive();
}
