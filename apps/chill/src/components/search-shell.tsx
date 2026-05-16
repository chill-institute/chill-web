import type { ReactNode } from "react";
import { Link, useRouterState } from "@tanstack/react-router";

import { ResponsiveBox } from "@/components/layout";
import { ShellSearchForm } from "@/components/shell-search-form";
import { ShellSettingsMenu } from "@/components/shell-settings-menu";
import { InstituteFooter } from "@chill-institute/ui/components/institute-footer";
import { publicLinks } from "@chill-institute/ui/lib/public-links";

const FOOTER_LINKS = [
  { label: "about", href: publicLinks.about },
  { label: "guides", href: publicLinks.guides },
  { label: "github", href: publicLinks.github },
];

export function SearchShell({ children }: { children: ReactNode }) {
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
      <div className="border-border-strong bg-surface border-b py-4">
        <ResponsiveBox>
          <div className="flex flex-row items-start justify-center gap-4 lg:gap-6">
            <Link
              to="/"
              className="text-fg-1 hidden shrink-0 font-serif text-[1.375rem] leading-9 tracking-[-0.01em] lg:block"
            >
              chill.institute
            </Link>
            <div className="w-full flex-1 lg:max-w-lg">
              <ShellSearchForm initialQuery={searchParamQ} />
              <ShellSettingsMenu />
            </div>
          </div>
        </ResponsiveBox>
      </div>
      <div className="my-6 flex-1">
        <ResponsiveBox>{children}</ResponsiveBox>
      </div>
      <ResponsiveBox>
        <InstituteFooter appName="chill.institute" links={FOOTER_LINKS} />
      </ResponsiveBox>
    </div>
  );
}
