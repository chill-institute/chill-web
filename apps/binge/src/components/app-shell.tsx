import { Link, Outlet, useRouterState } from "@tanstack/react-router";

import { ResponsiveBox } from "@/components/layout";
import { ShellSettingsMenu } from "@/components/shell-settings-menu";
import { StickyHeader } from "@chill-institute/ui/components/sticky-header";

function BingeBrand() {
  return (
    <Link to="/" className="flex min-w-0 items-center gap-2">
      <h3 className="text-fg-1 truncate text-lg leading-7">binge.institute</h3>
    </Link>
  );
}

export function AppShell() {
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const isHome = pathname === "/";
  const isSettingsRoute = pathname === "/settings";
  const showAuthShell =
    pathname.startsWith("/auth/") || pathname === "/sign-in" || pathname === "/sign-out";

  return (
    <div className="flex min-h-dvh flex-col">
      {showAuthShell ? (
        <Outlet />
      ) : isHome ? (
        <main className="flex flex-1 flex-col">
          <Outlet />
        </main>
      ) : (
        <>
          <StickyHeader
            brand={<BingeBrand />}
            right={isSettingsRoute ? null : <ShellSettingsMenu />}
          />
          <div className="my-6 flex-1">
            <ResponsiveBox>
              <Outlet />
            </ResponsiveBox>
          </div>
        </>
      )}
    </div>
  );
}
