import { ShellSearchForm } from "@/components/shell-search-form";
import { ShellSettingsMenu } from "@/components/shell-settings-menu";
import { InstituteBrand, InstituteTabs } from "@/components/top-nav";
import { InstituteFooter } from "@/ui/components/institute-footer";
import { StickyHeader } from "@/ui/components/sticky-header";

const headerBrand = <InstituteBrand />;
const headerTabs = <InstituteTabs active="search" />;
const headerRight = <ShellSettingsMenu />;

export function HomeShell() {
  return (
    <div className="flex min-h-dvh flex-col">
      <StickyHeader brand={headerBrand} tabs={headerTabs} right={headerRight} />
      <header className="mx-auto max-w-md px-4 pt-9 pb-7 sm:pt-10 sm:pb-8">
        <h1 className="m-0 text-center text-2xl leading-[1.08] sm:text-4xl">
          Welcome to The Institute
        </h1>
      </header>
      <div className="px-4 py-6">
        <div className="mx-auto w-full max-w-md">
          <ShellSearchForm focusOnMount label="What can we hook you up with?" />
        </div>
      </div>
      <div className="flex-1" />
      <InstituteFooter />
    </div>
  );
}
