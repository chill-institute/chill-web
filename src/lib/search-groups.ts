import { normalizeCodecFilterValue } from "@/api/release-info";

import type { SearchResult } from "./types";

export type SearchResultGroup = {
  key: string;
  title: string;
  year: number;
  season: number;
  episode: number;
  episodeEnd: number;
  // Kept in input order, so the first release is the best one under the active sort.
  releases: SearchResult[];
};

function normalizeTitle(title: string): string {
  return title
    .normalize("NFKD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
}

// A parsed title alone is too weak to merge on; a missing year or episode
// would fold a film into a same-named episode. Unidentified results stay single.
function groupKey(result: SearchResult): string | undefined {
  const info = result.releaseInfo;
  if (!info) return undefined;
  const title = normalizeTitle(info.title);
  const { year = 0, season = 0, episode = 0, episodeEnd = 0 } = info;
  if (!title || (year === 0 && season === 0 && episode === 0)) return undefined;
  return [title, year, season, episode, episodeEnd].join("|");
}

export function groupSearchResults(results: readonly SearchResult[]): SearchResultGroup[] {
  const groups: SearchResultGroup[] = [];
  const byKey = new Map<string, SearchResultGroup>();

  results.forEach((result, index) => {
    const key = groupKey(result);
    const existing = key ? byKey.get(key) : undefined;
    if (existing) {
      existing.releases.push(result);
      return;
    }
    const info = result.releaseInfo;
    const group: SearchResultGroup = {
      key: key ?? `single:${index}`,
      title: info?.title.trim() || result.title,
      year: info?.year ?? 0,
      season: info?.season ?? 0,
      episode: info?.episode ?? 0,
      episodeEnd: info?.episodeEnd ?? 0,
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

export function groupFormatSummary(group: SearchResultGroup): string {
  const resolutions = new Set<string>();
  const codecs = new Set<string>();
  for (const release of group.releases) {
    const info = release.releaseInfo;
    if (info?.resolution) resolutions.add(info.resolution.toLowerCase());
    if (info?.codec) codecs.add(normalizeCodecFilterValue(info.codec) ?? info.codec.toLowerCase());
  }
  return [...resolutions, ...codecs].join(" · ");
}
