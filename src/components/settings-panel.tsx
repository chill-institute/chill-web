import type { ReactNode } from "react";
import { useMemo } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowUpRight, Folder } from "lucide-react";
import { match } from "ts-pattern";

import { useAuth } from "@/auth/auth";
import { DownloadFolderPicker } from "@/auth/components/download-folder-picker";
import { UserErrorAlert } from "@/auth/components/user-error-alert";
import { Avatar, AvatarFallback, AvatarImage } from "@/ui/components/ui/avatar";
import { CheckboxField } from "@/ui/components/checkbox-field";
import { CheckboxGroup } from "@/ui/components/ui/checkbox-group";
import { NativeSelect } from "@/ui/components/ui/native-select";
import { SettingsSection } from "@/ui/components/settings-section";
import { Skeleton } from "@/ui/components/ui/skeleton";
import { combineQueries } from "@/queries/combine";
import { useSettingsQuery, useSaveSettings } from "@/queries/settings";
import { useDownloadFolderQuery } from "@/auth/queries/download-folder";
import { useIndexersQuery } from "@/queries/indexers";
import { useProfileQuery } from "@/auth/queries/profile";
import { isThemePreference, useTheme } from "@/ui/hooks/use-theme";
import { publicLinks } from "@/ui/lib/public-links";
import {
  applyChillSettingsPatch,
  resetChillSettings,
  searchResultDisplayBehaviorLabels,
  searchResultDisplayBehaviors,
  searchResultTitleBehaviorLabels,
  searchResultTitleBehaviors,
  toChillSettings,
  type ChillSettings,
} from "@/lib/types";

const LINKS = [
  { title: "about", url: publicLinks.about },
  { title: "github", url: publicLinks.github },
  { title: "x", url: publicLinks.x },
  { title: "email", url: publicLinks.email },
  { title: "reddit", url: publicLinks.reddit },
];

type PersistPatch = (patch: Partial<ChillSettings>) => void;
type ProfileQuery = ReturnType<typeof useProfileQuery>;
type DownloadFolderQuery = ReturnType<typeof useDownloadFolderQuery>;
type IndexerOption = { id: string; label: string };

function SettingsSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <SettingsTwoColumnGrid>
        <SettingsSection title="Signed in as">
          <Skeleton className="h-[50px] w-full rounded" />
        </SettingsSection>
        <SettingsSection title="Download folder">
          <Skeleton className="h-9 w-full rounded" />
        </SettingsSection>
      </SettingsTwoColumnGrid>
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
      <SettingsTwoColumnGrid>
        <SettingsSection title="Search result display behavior">
          <Skeleton className="h-9 w-full rounded" />
        </SettingsSection>
        <SettingsSection title="Search result name behavior">
          <Skeleton className="h-9 w-full rounded" />
        </SettingsSection>
      </SettingsTwoColumnGrid>
      <SettingsSection title="User-interface theme">
        <Skeleton className="h-9 w-full rounded" />
      </SettingsSection>
    </div>
  );
}

function SettingsTwoColumnGrid({ children }: { children: ReactNode }) {
  return <div className="grid grid-cols-1 gap-6 md:grid-cols-2">{children}</div>;
}

function AccountSection({
  profileQuery,
  onReset,
}: {
  profileQuery: ProfileQuery;
  onReset: () => void;
}) {
  return (
    <SettingsSection title="Signed in as">
      <div className="border-border-strong flex items-center justify-between gap-2 rounded border px-2.5 py-1.5 dark:bg-surface-2/30">
        <div className="flex min-w-0 items-center gap-2">
          <Avatar size="sm" className="size-7 shrink-0">
            {profileQuery.data?.avatarUrl ? (
              <AvatarImage src={profileQuery.data.avatarUrl} alt={profileQuery.data.username} />
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
            onClick={onReset}
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
  );
}

function ThemeSection({
  theme,
  setTheme,
  systemDark,
}: {
  theme: string;
  setTheme: (theme: "light" | "dark" | "system") => void;
  systemDark: boolean;
}) {
  return (
    <SettingsSection title="User-interface theme">
      <NativeSelect
        aria-label="User-interface theme"
        name="theme"
        value={theme}
        onChange={(event) => {
          const { value } = event.currentTarget;
          if (isThemePreference(value)) {
            setTheme(value);
          }
        }}
      >
        <option value="system">{`System (${systemDark ? "dark" : "light"})`}</option>
        <option value="light">Light</option>
        <option value="dark">Dark</option>
      </NativeSelect>
    </SettingsSection>
  );
}

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

  return <SettingsSection title="Download folder">{content}</SettingsSection>;
}

function SearchSettingsSection({
  effective,
  persistPatch,
}: {
  effective: ChillSettings;
  persistPatch: PersistPatch;
}) {
  return (
    <SettingsSection title="Search settings">
      <div className="grid grid-cols-1 gap-x-4 gap-y-2 sm:grid-cols-3">
        <CheckboxField
          id="filter-nasty"
          checked={effective.filterNastyResults}
          onCheckedChange={(checked) => persistPatch({ filterNastyResults: checked === true })}
        >
          Try to filter out nasty stuff
        </CheckboxField>
        <CheckboxField
          id="filter-no-seeders"
          checked={effective.filterResultsWithNoSeeders}
          onCheckedChange={(checked) =>
            persistPatch({ filterResultsWithNoSeeders: checked === true })
          }
        >
          Hide results with no seeders
        </CheckboxField>
        <CheckboxField
          id="remember-filters"
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
        >
          Remember quick filters
        </CheckboxField>
      </div>
    </SettingsSection>
  );
}

function IndexersSection({
  effective,
  indexerOptions,
  persistPatch,
}: {
  effective: ChillSettings;
  indexerOptions: IndexerOption[];
  persistPatch: PersistPatch;
}) {
  return (
    <SettingsSection title="Search using the following trackers">
      <CheckboxGroup
        options={indexerOptions}
        uncheckedItems={effective.disabledIndexerIds}
        onChange={(disabledIndexerIds) => persistPatch({ disabledIndexerIds })}
      />
    </SettingsSection>
  );
}

function SearchResultDisplayBehaviorSection({
  effective,
  persistPatch,
}: {
  effective: ChillSettings;
  persistPatch: PersistPatch;
}) {
  return (
    <SettingsSection title="Search result display behavior">
      <NativeSelect
        aria-label="Search result display behavior"
        name="search-result-display-behavior"
        value={String(effective.searchResultDisplayBehavior)}
        onChange={(event) => {
          const { value } = event.currentTarget;
          const next = searchResultDisplayBehaviors.find((b) => String(b) === value);
          if (next !== undefined) persistPatch({ searchResultDisplayBehavior: next });
        }}
      >
        {searchResultDisplayBehaviors.map((behavior) => (
          <option key={behavior} value={String(behavior)}>
            {searchResultDisplayBehaviorLabels[behavior]}
          </option>
        ))}
      </NativeSelect>
    </SettingsSection>
  );
}

function SearchResultTitleBehaviorSection({
  effective,
  persistPatch,
}: {
  effective: ChillSettings;
  persistPatch: PersistPatch;
}) {
  return (
    <SettingsSection title="Search result name behavior">
      <NativeSelect
        aria-label="Search result name behavior"
        name="search-result-name-behavior"
        value={String(effective.searchResultTitleBehavior)}
        onChange={(event) => {
          const { value } = event.currentTarget;
          const next = searchResultTitleBehaviors.find((b) => String(b) === value);
          if (next !== undefined) persistPatch({ searchResultTitleBehavior: next });
        }}
      >
        {searchResultTitleBehaviors.map((behavior) => (
          <option key={behavior} value={String(behavior)}>
            {searchResultTitleBehaviorLabels[behavior]}
          </option>
        ))}
      </NativeSelect>
    </SettingsSection>
  );
}

function SettingsFooter() {
  return (
    <div className="flex flex-col items-center gap-3 text-center font-mono text-2xs sm:flex-row sm:justify-between sm:gap-3 sm:text-left">
      <nav
        aria-label="contact"
        className="text-fg-3 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 sm:justify-start"
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
      <span className="text-fg-4 shrink-0 text-center sm:text-left">
        release: {import.meta.env.VITE_PUBLIC_RELEASE ?? "dev"}
      </span>
    </div>
  );
}

export function SettingsPanel() {
  const auth = useAuth();
  const { theme, setTheme, systemDark } = useTheme();

  const configQuery = useSettingsQuery();
  const indexersQuery = useIndexersQuery();
  const profileQuery = useProfileQuery();
  const downloadFolderQuery = useDownloadFolderQuery();

  const saveMutation = useSaveSettings();

  const indexerOptions = useMemo(
    () => (indexersQuery.data ?? []).map((indexer) => ({ id: indexer.id, label: indexer.name })),
    [indexersQuery.data],
  );

  const persistPatch = (patch: Partial<ChillSettings>) => {
    if (!configQuery.data) return;
    saveMutation.mutate(applyChillSettingsPatch(configQuery.data, patch));
  };

  const resetSettings = () => {
    if (!configQuery.data) return;
    saveMutation.mutate(resetChillSettings(configQuery.data));
  };

  if (!auth.isAuthenticated) {
    return null;
  }

  const combined = combineQueries(configQuery, indexersQuery);

  return match(combined)
    .with({ status: "pending" }, () => <SettingsSkeleton />)
    .with({ status: "error" }, (q) => <UserErrorAlert error={q.error} />)
    .with({ status: "success" }, ({ data: [config] }) => {
      const effective = toChillSettings(config);

      return (
        <div className="flex flex-col gap-6">
          <SettingsTwoColumnGrid>
            <AccountSection profileQuery={profileQuery} onReset={resetSettings} />
            <DownloadFolderSection
              effective={effective}
              downloadFolderQuery={downloadFolderQuery}
              persistPatch={persistPatch}
            />
          </SettingsTwoColumnGrid>
          <SearchSettingsSection effective={effective} persistPatch={persistPatch} />
          <IndexersSection
            effective={effective}
            indexerOptions={indexerOptions}
            persistPatch={persistPatch}
          />
          <SettingsTwoColumnGrid>
            <SearchResultDisplayBehaviorSection effective={effective} persistPatch={persistPatch} />
            <SearchResultTitleBehaviorSection effective={effective} persistPatch={persistPatch} />
          </SettingsTwoColumnGrid>
          {saveMutation.error ? <UserErrorAlert error={saveMutation.error} /> : null}
          <ThemeSection theme={theme} setTheme={setTheme} systemDark={systemDark} />
          <SettingsFooter />
        </div>
      );
    })
    .exhaustive();
}
