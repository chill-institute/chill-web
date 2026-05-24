import { Link } from "@tanstack/react-router";
import { Film, Search, Tv } from "lucide-react";

import { tabItemBaseClass, tabsContainerClass } from "@/ui/components/tabs";
import { instituteLogoUrl } from "@/ui/lib/brand-assets";
import { cn } from "@/ui/lib/cn";

export type InstituteSection = "search" | "movies" | "tv-shows";

const sections = [
  { id: "search", label: "search", to: "/", icon: Search },
  { id: "movies", label: "movies", to: "/movies", icon: Film },
  { id: "tv-shows", label: "tv shows", to: "/tv-shows", icon: Tv },
] as const;

export function InstituteBrand() {
  return (
    <Link
      to="/"
      className="flex min-h-6 min-w-0 items-center gap-2"
      aria-label="chill.institute home"
    >
      <img
        src={instituteLogoUrl}
        width={22}
        height={22}
        alt=""
        className="border-border-strong size-8 rounded border sm:size-[22px]"
      />
      <span className="text-fg-1 hidden truncate font-serif text-base leading-none sm:block">
        chill.institute
      </span>
    </Link>
  );
}

export function InstituteTabs({ active }: { active: InstituteSection }) {
  return (
    <nav aria-label="Primary" className={cn(tabsContainerClass, "min-w-0 justify-center")}>
      {sections.map(({ id, label, to, icon: Icon }) => {
        const selected = active === id;
        return (
          <Link
            key={id}
            to={to}
            search={id === "search" ? undefined : { source: undefined }}
            aria-current={selected ? "page" : undefined}
            className={cn(
              tabItemBaseClass,
              "h-9 px-2 text-sm sm:h-7 sm:px-2.5",
              selected && "bg-hover text-fg-1 hover-hover:hover:bg-hover",
            )}
          >
            <Icon aria-hidden="true" />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
