import { ArrowUpRight } from "lucide-react";

import { cn } from "../lib/cn";
import { publicLinks } from "../lib/public-links";

type FooterLink = {
  label: string;
  href: string;
};

type InstituteFooterProps = {
  appName?: string;
  links?: ReadonlyArray<FooterLink>;
  className?: string;
};

const DEFAULT_FOOTER_LINKS: ReadonlyArray<FooterLink> = [
  { label: "about", href: publicLinks.about },
  { label: "github", href: publicLinks.github },
  { label: "x", href: publicLinks.x },
  { label: "email", href: publicLinks.email },
  { label: "reddit", href: publicLinks.reddit },
];

function InstituteFooter({
  appName = "chill.institute",
  links = DEFAULT_FOOTER_LINKS,
  className,
}: InstituteFooterProps) {
  return (
    <footer
      data-slot="institute-footer"
      className={cn("border-border-strong text-fg-3 mt-auto w-full border-t text-2xs", className)}
    >
      <div className="mx-auto flex w-full max-w-7xl flex-col items-center justify-between gap-2.5 px-4 py-4 text-center sm:flex-row sm:flex-wrap sm:text-left sm:items-center sm:gap-x-6 sm:gap-y-2 sm:px-5 sm:py-6">
        <p className="m-0">
          <span className="text-fg-2">{appName}</span>
          <span aria-hidden="true"> · </span>
          not affiliated with put.io
        </p>
        {links.length > 0 ? (
          <nav
            aria-label="external links"
            className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1.5 sm:justify-start"
          >
            {links.map((link, index) => (
              <span key={link.href} className="inline-flex items-center gap-1">
                {index > 0 ? (
                  <span aria-hidden="true" className="text-fg-4">
                    ·
                  </span>
                ) : null}
                <a
                  href={link.href}
                  rel="noreferrer noopener"
                  target="_blank"
                  className="hover-hover:hover:text-fg-1 inline-flex min-h-6 min-w-6 items-center gap-0.5"
                >
                  <span>{link.label}</span>
                  <ArrowUpRight className="size-3" strokeWidth={1.25} aria-hidden="true" />
                </a>
              </span>
            ))}
          </nav>
        ) : null}
      </div>
    </footer>
  );
}

export { InstituteFooter };
