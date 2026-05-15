import { createFileRoute } from "@tanstack/react-router";

type Search = {
  season?: number;
};

function parseSeason(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value) && value > 0) return value;
  if (typeof value === "string") {
    const parsed = Number.parseInt(value, 10);
    if (Number.isFinite(parsed) && parsed > 0) return parsed;
  }
  return undefined;
}

export const Route = createFileRoute("/tv-shows/$id")({
  validateSearch: (search: Record<string, unknown>): Search => ({
    season: parseSeason(search.season),
  }),
  component: () => null,
});
