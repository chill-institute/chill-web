import { useRef, useState } from "react";
import { Check, Download, X } from "lucide-react";
import { toast } from "sonner";

import { useApi } from "@/auth/api-context";
import { Button } from "@/ui/components/ui/button";
import { Spinner } from "@/ui/components/ui/spinner";
import { formatSearchResults } from "@/lib/search";
import {
  codecFilterLabels,
  codecFilters,
  resolutionFilterLabels,
  resolutionFilters,
  SortBy,
  SortDirection,
} from "@/lib/types";
import { useSettingsQuery } from "@/queries/settings";
import type { Movie } from "@/catalog/lib/types";

type Status = "idle" | "pending" | "success" | "error";

function movieQuery(movie: Movie): string {
  return [movie.title, movie.year].filter(Boolean).join(" ").trim();
}

export function MoviePosterActions({ movie }: { movie: Movie }) {
  const api = useApi();
  const settings = useSettingsQuery().data;
  const [status, setStatus] = useState<Status>("idle");
  const resetRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const remember = settings?.search?.rememberQuickFilters ?? false;
  const resolutionPref = remember ? (settings?.search?.resolutionFilters ?? []) : [];
  const codecPref = remember ? (settings?.search?.codecFilters ?? []) : [];

  function preferenceLabel(): string {
    const res =
      resolutionPref.length === 1
        ? resolutionFilters.find((f) => f === resolutionPref[0])
        : undefined;
    const codec = codecPref.length === 1 ? codecFilters.find((f) => f === codecPref[0]) : undefined;
    return [
      res !== undefined ? resolutionFilterLabels[res] : null,
      codec !== undefined ? codecFilterLabels[codec] : null,
    ]
      .filter(Boolean)
      .join(" ");
  }

  function flash(next: "success" | "error") {
    setStatus(next);
    if (resetRef.current) clearTimeout(resetRef.current);
    resetRef.current = setTimeout(() => setStatus("idle"), 2500);
  }

  async function downloadTopResult() {
    if (status === "pending") return;
    const query = movieQuery(movie);
    if (!query) return;
    if (resetRef.current) {
      clearTimeout(resetRef.current);
      resetRef.current = null;
    }
    setStatus("pending");
    try {
      const response = await api.search(query, undefined);
      const ranked = formatSearchResults(
        response.results,
        resolutionPref,
        codecPref,
        [],
        SortBy.SEEDERS,
        SortDirection.DESC,
      );
      const top = ranked[0];
      if (!top) {
        const label = preferenceLabel();
        toast(label ? `no ${label} result for ${movie.title}` : `no results for ${movie.title}`);
        flash("error");
        return;
      }
      await api.addTransfer(top.link);
      toast.success(`sent “${top.title}” to put.io`);
      flash("success");
    } catch {
      toast.error(`couldn't add ${movie.title} to put.io`);
      flash("error");
    }
  }

  const downloadIcon =
    status === "pending" ? (
      <Spinner />
    ) : status === "success" ? (
      <Check className="text-success" />
    ) : status === "error" ? (
      <X className="text-error" />
    ) : (
      <Download />
    );

  const label = preferenceLabel();

  return (
    <div className="flex w-full gap-1.5 sm:w-auto">
      <Button
        variant="default"
        size="sm"
        className="w-full justify-center gap-1.5 sm:size-7 sm:gap-0 sm:px-0 [&_svg:not([class*='size-'])]:size-3.5"
        disabled={status === "pending"}
        aria-label={`Download top result for ${movie.title}`}
        title={label ? `Download top ${label} result` : "Download top result"}
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          void downloadTopResult();
        }}
      >
        {downloadIcon}
        <span className="sm:hidden">send to put.io</span>
      </Button>
    </div>
  );
}
