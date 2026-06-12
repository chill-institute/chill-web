import type { ReactNode } from "react";
import { useRouterState } from "@tanstack/react-router";

import { ResponsiveBox } from "@/components/layout";
import { ShellSearchForm } from "@/components/shell-search-form";
import { ShellSettingsMenu } from "@/components/shell-settings-menu";
import { InstituteBrand, InstituteTabs } from "@/components/top-nav";
import { InstituteFooter } from "@/ui/components/institute-footer";
import { StickyHeader } from "@/ui/components/sticky-header";
import { cn } from "@/ui/lib/cn";

const headerBrand = <InstituteBrand />;
const headerTabs = <InstituteTabs active="search" />;
const headerRight = <ShellSettingsMenu />;

export function SearchShell({
  children,
  contentWidth = "default",
  filters,
}: {
  children: ReactNode;
  contentWidth?: "default" | "wide";
  filters?: ReactNode;
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

  const withWidth = (node: ReactNode) =>
    contentWidth === "wide" ? (
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-5">{node}</div>
    ) : (
      <ResponsiveBox>{node}</ResponsiveBox>
    );

  return (
    <div className="flex min-h-dvh flex-col">
      <StickyHeader brand={headerBrand} tabs={headerTabs} right={headerRight} />
      <main className="flex-1">
        <div className="pt-6">
          {withWidth(
            <div
              className={cn(
                "flex flex-col gap-3",
                filters && "lg:flex-row lg:items-end lg:justify-between lg:gap-4",
              )}
            >
              <div className={cn("w-full", filters ? "lg:max-w-lg lg:flex-1" : "mx-auto max-w-lg")}>
                <ShellSearchForm initialQuery={searchParamQ} />
              </div>
              {filters ? <div className="w-full lg:w-auto">{filters}</div> : null}
            </div>,
          )}
        </div>
        <div className="my-6">{withWidth(children)}</div>
      </main>
      <InstituteFooter />
    </div>
  );
}
