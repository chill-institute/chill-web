import { ArrowUpRight } from "lucide-react";

import { cn } from "../lib/cn";
import { publicLinks } from "../lib/public-links";

type FooterLink = {
  label: string;
  href: string;
};

type InstituteExternalLinksProps = {
  ariaLabel?: string;
  links?: ReadonlyArray<FooterLink>;
  className?: string;
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

function InstituteExternalLinks({
  ariaLabel = "external links",
  links = DEFAULT_FOOTER_LINKS,
  className,
}: InstituteExternalLinksProps) {
  if (links.length === 0) return null;

  return (
    <nav
      aria-label={ariaLabel}
      className={cn(
        "flex flex-wrap items-center justify-center gap-x-2 gap-y-1.5 sm:justify-start",
        className,
      )}
    >
      {links.map((link, index) => (
        <span key={link.href} className="inline-flex items-center gap-2">
          <a
            href={link.href}
            rel="noreferrer noopener"
            target="_blank"
            className="hover-hover:hover:text-fg-1 inline-flex min-h-6 min-w-6 items-center gap-0.5 font-normal"
          >
            <span>{link.label}</span>
            <ArrowUpRight className="size-3" strokeWidth={1.25} aria-hidden="true" />
          </a>
          {index < links.length - 1 ? (
            <span aria-hidden="true" className="text-fg-4">
              ·
            </span>
          ) : null}
        </span>
      ))}
    </nav>
  );
}

function InstituteFooter({
  appName = "chill.institute",
  links = DEFAULT_FOOTER_LINKS,
  className,
}: InstituteFooterProps) {
  return (
    <footer
      data-slot="institute-footer"
      className={cn("border-border-strong text-fg-3 mt-auto w-full border-t text-xs", className)}
    >
      <div className="mx-auto flex w-full max-w-7xl flex-col items-center justify-between gap-2.5 px-4 py-3 text-center sm:flex-row sm:flex-wrap sm:text-left sm:items-center sm:gap-x-6 sm:gap-y-2 sm:px-5 sm:py-4">
        <p className="m-0 inline-flex flex-wrap items-center justify-center gap-2">
          <span className="text-fg-2">{appName}</span>
          <span aria-hidden="true" className="text-fg-4">
            ·
          </span>
          <span>not affiliated with put.io</span>
        </p>
        <InstituteExternalLinks links={links} />
      </div>
    </footer>
  );
}

export { InstituteExternalLinks, InstituteFooter };
