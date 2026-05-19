import type { ReactNode } from "react";
import { useRouterState } from "@tanstack/react-router";

import { ResponsiveBox } from "@/components/layout";
import { ShellSearchForm } from "@/components/shell-search-form";
import { ShellSettingsMenu } from "@/components/shell-settings-menu";
import { InstituteBrand, InstituteTabs } from "@/components/top-nav";
import { InstituteFooter } from "@/ui/components/institute-footer";
import { StickyHeader } from "@/ui/components/sticky-header";

export function SearchShell({
  children,
  contentWidth = "default",
}: {
  children: ReactNode;
  contentWidth?: "default" | "wide";
}) {
  const searchParamQ = useRouterState({
    select: (state) => {
      const search = state.location.search;
      if (search && typeof search === "object" && "q" in search && typeof search.q === "string") {
        return search.q;
      }
      return "";
    },
  });

  return (
    <div className="flex min-h-dvh flex-col">
      <StickyHeader
        brand={<InstituteBrand />}
        tabs={<InstituteTabs active="search" />}
        right={<ShellSettingsMenu />}
      />
      <div className="border-border-strong bg-surface border-b py-4">
        <ResponsiveBox>
          <div className="mx-auto w-full max-w-lg">
            <ShellSearchForm initialQuery={searchParamQ} />
          </div>
        </ResponsiveBox>
      </div>
      <div className="my-6 flex-1">
        {contentWidth === "wide" ? (
          <div className="mx-auto w-full max-w-7xl px-4 sm:px-5">{children}</div>
        ) : (
          <ResponsiveBox>{children}</ResponsiveBox>
        )}
      </div>
      <InstituteFooter />
    </div>
  );
}
