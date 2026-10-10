import type { SearchResult } from "./types";

type Identity = {
  title: string;
  year: number;
  season: number;
  episode: number;
  episodeEnd: number;
};

export type SearchResultGroup = Identity & {
  key: string;
  // Kept in input order, so the first release is the best one under the active sort.
  releases: SearchResult[];
};

// Uploader tags such as "www.example.org - " lead some release names.
const SITE_PREFIX = /^\s*(?:\[[^\]]*\]\s*)?(?:www\.)?[a-z0-9-]+(?:\.[a-z0-9-]+)+\s*[-–:]\s+/i;
const ARTICLES = new Set(["the", "a", "an"]);

function identity(result: SearchResult): Identity | undefined {
  const info = result.releaseInfo;
  if (!info) return undefined;
  const { year = 0, season = 0 } = info;
  // A dated release with no season is a film; an episode number there comes
  // from size or 3D tokens ("700mb", "3D") the parser misreads.
  const film = year > 0 && season === 0;
  return {
    title: info.title.replace(SITE_PREFIX, "").trim(),
    year,
    season,
    episode: film ? 0 : (info.episode ?? 0),
    episodeEnd: film ? 0 : (info.episodeEnd ?? 0),
  };
}

function normalizeTitle(title: string): string {
  return title
    .normalize("NFKD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .split(/[^\p{L}\p{N}]+/u)
    .filter((word) => word && !ARTICLES.has(word))
    .join(" ");
}

// A parsed title alone is too weak to merge on; a missing year or episode
// would fold a film into a same-named episode. Unidentified results stay single.
function groupKey(id: Identity | undefined): string | undefined {
  if (!id) return undefined;
  const title = normalizeTitle(id.title);
  if (!title || (id.year === 0 && id.season === 0 && id.episode === 0)) return undefined;
  return [title, id.year, id.season, id.episode, id.episodeEnd].join("|");
}

export function groupSearchResults(results: readonly SearchResult[]): SearchResultGroup[] {
  const groups: SearchResultGroup[] = [];
  const byKey = new Map<string, SearchResultGroup>();

  results.forEach((result, index) => {
    const id = identity(result);
    const key = groupKey(id);
    const existing = key ? byKey.get(key) : undefined;
    if (existing) {
      existing.releases.push(result);
      return;
    }
    const group: SearchResultGroup = {
      title: result.title,
      year: 0,
      season: 0,
      episode: 0,
      episodeEnd: 0,
      ...id,
      key: key ?? `single:${index}`,
      releases: [result],
    };
    if (key) byKey.set(key, group);
    groups.push(group);
  });

  return groups;
}

function pad(value: number): string {
  return String(value).padStart(2, "0");
}

export function groupIdentityLabel(group: SearchResultGroup): string {
  const parts: string[] = [];
  if (group.season > 0 || group.episode > 0) {
    let label = group.season > 0 ? `S${pad(group.season)}` : "";
    if (group.episode > 0) label += `E${pad(group.episode)}`;
    if (group.episodeEnd > group.episode) label += `-E${pad(group.episodeEnd)}`;
    parts.push(label);
  }
  if (group.year > 0) parts.push(String(group.year));
  return parts.join(" · ");
}
