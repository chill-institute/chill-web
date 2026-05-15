import { useMemo } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowUpRight, Folder } from "lucide-react";
import { match } from "ts-pattern";

import { useAuth } from "@chill-institute/auth/auth";
import { DownloadFolderPicker } from "@chill-institute/auth/components/download-folder-picker";
import { UserErrorAlert } from "@chill-institute/auth/components/user-error-alert";
import { Avatar, AvatarFallback, AvatarImage } from "@chill-institute/ui/components/ui/avatar";
import { Checkbox } from "@chill-institute/ui/components/ui/checkbox";
import { CheckboxGroup } from "@chill-institute/ui/components/ui/checkbox-group";
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
import { combineQueries } from "@/queries/combine";
import { useSettingsQuery, useSaveSettings } from "@/queries/settings";
import { useDownloadFolderQuery } from "@chill-institute/auth/queries/download-folder";
import { useIndexersQuery } from "@/queries/indexers";
import { useProfileQuery } from "@chill-institute/auth/queries/profile";
import {
  isSearchDisplayMode,
  SEARCH_DISPLAY_MODE_LABELS,
  SEARCH_DISPLAY_MODES,
  useSearchDisplay,
} from "@/hooks/use-search-display";
import { isThemePreference, useTheme } from "@chill-institute/ui/hooks/use-theme";
import { publicLinks } from "@chill-institute/ui/lib/public-links";
import {
  defaultUserSettings,
  searchResultDisplayBehaviorLabels,
  searchResultDisplayBehaviors,
  searchResultTitleBehaviorLabels,
  searchResultTitleBehaviors,
  type UserSettings,
} from "@/lib/types";

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
      <SettingsSection title="Search settings">
        <Skeleton className="h-5 w-full" />
        <Skeleton className="h-5 w-full" />
        <Skeleton className="h-5 w-full" />
      </SettingsSection>
      <SettingsSection title="Search using the following trackers">
        <Skeleton className="h-4 w-1/2" />
        <Skeleton className="h-4 w-1/2" />
        <Skeleton className="h-4 w-1/2" />
        <Skeleton className="h-4 w-1/2" />
      </SettingsSection>
      <SettingsSection title="Search result layout">
        <Skeleton className="h-9 w-full rounded" />
      </SettingsSection>
      <SettingsSection title="Search result display behavior">
        <Skeleton className="h-9 w-full rounded" />
      </SettingsSection>
      <SettingsSection title="Search result name behavior">
        <Skeleton className="h-9 w-full rounded" />
      </SettingsSection>
    </div>
  );
}

export function SettingsPanel() {
  const auth = useAuth();
  const { theme, setTheme, systemDark } = useTheme();
  const { mode: searchDisplayMode, setMode: setSearchDisplayMode } = useSearchDisplay();

  const configQuery = useSettingsQuery();
  const indexersQuery = useIndexersQuery();
  const profileQuery = useProfileQuery();
  const downloadFolderQuery = useDownloadFolderQuery();

  const saveMutation = useSaveSettings();

  const indexerOptions = useMemo(
    () => (indexersQuery.data ?? []).map((indexer) => ({ id: indexer.id, label: indexer.name })),
    [indexersQuery.data],
  );

  const persistPatch = (patch: Partial<UserSettings>) => {
    if (!configQuery.data) return;
    saveMutation.mutate({ ...configQuery.data, ...patch });
  };

  const resetSettings = () => {
    if (!configQuery.data) return;
    saveMutation.mutate({ ...configQuery.data, ...defaultUserSettings });
  };

  if (!auth.isAuthenticated) {
    return null;
  }

  const combined = combineQueries(configQuery, indexersQuery);

  return match(combined)
    .with({ status: "pending" }, () => <SettingsSkeleton />)
    .with({ status: "error" }, (q) => <UserErrorAlert error={q.error} />)
    .with({ status: "success" }, ({ data: [config] }) => {
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
            <div className="border-border-strong flex h-8 items-center justify-between gap-2 rounded border px-2.5 py-1 dark:bg-surface-2/30">
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
              <div className="flex shrink-0 items-center gap-3">
                <button
                  type="button"
                  className="text-fg-3 hover-hover:hover:text-fg-1 cursor-pointer text-[13px] hover:underline"
                  onClick={resetSettings}
                >
                  reset settings
                </button>
                <Link
                  to="/sign-out"
                  search={{ error: undefined }}
                  className="text-error-text hover-hover:hover:text-error-text/80 text-[13px] hover:underline"
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

          <SettingsSection title="Search settings">
            <div className="flex flex-col gap-y-2">
              <Checkbox
                id="filter-nasty"
                label="Try to filter out nasty stuff"
                checked={effective.filterNastyResults}
                onCheckedChange={(checked) =>
                  persistPatch({ filterNastyResults: checked === true })
                }
              />
              <Checkbox
                id="filter-no-seeders"
                label="Hide results with no seeders"
                checked={effective.filterResultsWithNoSeeders}
                onCheckedChange={(checked) =>
                  persistPatch({ filterResultsWithNoSeeders: checked === true })
                }
              />
              <Checkbox
                id="remember-filters"
                label="Remember quick filters"
                checked={effective.rememberQuickFilters}
                onCheckedChange={(checked) => {
                  if (!checked) {
                    persistPatch({
                      rememberQuickFilters: false,
                      codecFilters: [],
                      resolutionFilters: [],
                      otherFilters: [],
                    });
                    return;
                  }
                  persistPatch({ rememberQuickFilters: true });
                }}
              />
            </div>
          </SettingsSection>

          <SettingsSection title="Search using the following trackers">
            <CheckboxGroup
              options={indexerOptions}
              uncheckedItems={effective.disabledIndexerIds}
              onChange={(disabledIndexerIds) => persistPatch({ disabledIndexerIds })}
            />
          </SettingsSection>

          <SettingsSection title="Search result layout">
            <Select<string>
              value={searchDisplayMode}
              onValueChange={(value) => {
                if (value != null && isSearchDisplayMode(value)) {
                  setSearchDisplayMode(value);
                }
              }}
            >
              <SelectTrigger className="w-full">
                <SelectValue>
                  {(value) =>
                    isSearchDisplayMode(value) ? SEARCH_DISPLAY_MODE_LABELS[value] : null
                  }
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {SEARCH_DISPLAY_MODES.map((value) => (
                    <SelectItem key={value} value={value}>
                      {SEARCH_DISPLAY_MODE_LABELS[value]}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </SettingsSection>

          <SettingsSection title="Search result display behavior">
            <Select<string>
              value={String(effective.searchResultDisplayBehavior)}
              onValueChange={(value) => {
                if (value == null) return;
                const next = searchResultDisplayBehaviors.find((b) => String(b) === value);
                if (next !== undefined) persistPatch({ searchResultDisplayBehavior: next });
              }}
            >
              <SelectTrigger className="w-full">
                <SelectValue>
                  {(value) => {
                    const match = searchResultDisplayBehaviors.find((b) => String(b) === value);
                    return match !== undefined ? searchResultDisplayBehaviorLabels[match] : null;
                  }}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {searchResultDisplayBehaviors.map((behavior) => (
                    <SelectItem key={behavior} value={String(behavior)}>
                      {searchResultDisplayBehaviorLabels[behavior]}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </SettingsSection>

          <SettingsSection title="Search result name behavior">
            <Select<string>
              value={String(effective.searchResultTitleBehavior)}
              onValueChange={(value) => {
                if (value == null) return;
                const next = searchResultTitleBehaviors.find((b) => String(b) === value);
                if (next !== undefined) persistPatch({ searchResultTitleBehavior: next });
              }}
            >
              <SelectTrigger className="w-full">
                <SelectValue>
                  {(value) => {
                    const match = searchResultTitleBehaviors.find((b) => String(b) === value);
                    return match !== undefined ? searchResultTitleBehaviorLabels[match] : null;
                  }}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {searchResultTitleBehaviors.map((behavior) => (
                    <SelectItem key={behavior} value={String(behavior)}>
                      {searchResultTitleBehaviorLabels[behavior]}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </SettingsSection>

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
