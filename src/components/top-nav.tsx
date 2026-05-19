import { Link } from "@tanstack/react-router";
import { Film, Search, Tv } from "lucide-react";

import { Tabs, TabsList, TabsTrigger } from "@/ui/components/ui/tabs";

export type InstituteSection = "search" | "movies" | "tv-shows";

export function InstituteBrand() {
  return (
    <Link to="/" className="flex min-w-0 items-center gap-2" aria-label="chill.institute home">
      <img
        src="/logo.png"
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
    <Tabs value={active} className="min-w-0">
      <TabsList className="justify-center">
        <TabsTrigger
          value="search"
          className="h-9 px-2 text-sm sm:h-7 sm:px-2.5"
          nativeButton={false}
          render={<Link to="/" />}
        >
          <Search aria-hidden="true" />
          search
        </TabsTrigger>
        <TabsTrigger
          value="movies"
          className="h-9 px-2 text-sm sm:h-7 sm:px-2.5"
          nativeButton={false}
          render={<Link to="/movies" search={{ source: undefined }} />}
        >
          <Film aria-hidden="true" />
          movies
        </TabsTrigger>
        <TabsTrigger
          value="tv-shows"
          className="h-9 px-2 text-sm sm:h-7 sm:px-2.5"
          nativeButton={false}
          render={<Link to="/tv-shows" search={{ source: undefined }} />}
        >
          <Tv aria-hidden="true" />
          tv shows
        </TabsTrigger>
      </TabsList>
    </Tabs>
  );
}
