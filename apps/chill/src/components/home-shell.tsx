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

export function HomeShell() {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="mx-auto max-w-md px-4 pt-8 pb-6">
        <h1 className="m-0 text-center">welcome to chill.institute</h1>
      </header>
      <div className="border-border-strong bg-surface border-y px-4 py-6">
        <div className="mx-auto w-full max-w-md">
          <ShellSearchForm label="What can we hook you up with?" />
          <ShellSettingsMenu />
        </div>
      </div>
      <div className="flex-1" />
      <ResponsiveBox>
        <InstituteFooter appName="chill.institute" links={FOOTER_LINKS} />
      </ResponsiveBox>
    </div>
  );
}
