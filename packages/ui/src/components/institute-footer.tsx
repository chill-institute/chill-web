import { ArrowUpRight } from "lucide-react";

import { cn } from "../lib/cn";

type FooterLink = {
  label: string;
  href: string;
};

type InstituteFooterProps = {
  appName: string;
  links: ReadonlyArray<FooterLink>;
  className?: string;
};

function InstituteFooter({ appName, links, className }: InstituteFooterProps) {
  return (
    <footer
      data-slot="institute-footer"
      className={cn(
        "border-border-strong text-fg-3 mt-auto flex flex-wrap items-center justify-between gap-x-6 gap-y-2 border-t py-6 font-mono text-[11px]",
        className,
      )}
    >
      <p className="m-0">
        <span className="text-fg-2">{appName}</span>
        <span aria-hidden="true"> · </span>
        not affiliated with put.io
      </p>
      {links.length > 0 ? (
        <nav aria-label="external links" className="flex flex-wrap items-center gap-x-3 gap-y-1">
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
                className="hover-hover:hover:text-fg-1 inline-flex items-center gap-0.5"
              >
                <span>{link.label}</span>
                <ArrowUpRight className="size-3" strokeWidth={1.25} aria-hidden="true" />
              </a>
            </span>
          ))}
        </nav>
      ) : null}
    </footer>
  );
}

export { InstituteFooter };
