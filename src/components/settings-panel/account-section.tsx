import { Link } from "@tanstack/react-router";

import { Avatar, AvatarFallback, AvatarImage } from "@/ui/components/ui/avatar";
import { SettingsSection } from "@/ui/components/settings-section";

import type { ProfileQuery } from "./types";

function AccountSection({
  profileQuery,
  onReset,
}: {
  profileQuery: ProfileQuery;
  onReset: () => void;
}) {
  return (
    <SettingsSection title="Signed in as">
      <div className="border-border-strong bg-surface flex items-center justify-between gap-2 rounded border px-2.5 py-1.5 dark:bg-surface-2/30">
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
            className="text-fg-3 hover-hover:hover:text-fg-1 focus-visible:ring-ring-focus focus-visible:ring-offset-app inline-flex min-h-6 cursor-pointer items-center rounded-sm text-sm hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
            onClick={onReset}
          >
            reset settings
          </button>
          <Link
            to="/sign-out"
            search={{ error: undefined }}
            className="text-error-text hover-hover:hover:text-error-text/80 focus-visible:ring-ring-focus focus-visible:ring-offset-app inline-flex min-h-6 items-center rounded-sm text-sm hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
          >
            sign out
          </Link>
        </div>
      </div>
    </SettingsSection>
  );
}

export { AccountSection };
