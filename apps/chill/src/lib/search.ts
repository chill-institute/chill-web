import { effectiveInfo } from "./release-info";
import type { SearchResult } from "./types";
import { CodecFilter, OtherFilter, ResolutionFilter, SortBy, SortDirection } from "./types";

const IMDB_URL_PATTERN = /imdb\.com\/title\/(tt\d+)/i;

export function normalizeQuery(query: string): string {
  const trimmed = query.trim();
  const match = trimmed.match(IMDB_URL_PATTERN);
  if (match) {
    return match[1];
  }
  return trimmed;
}

function applyResolution(result: SearchResult, filter: ResolutionFilter) {
  const resolution = effectiveInfo(result).resolution.toLowerCase();
  if (!resolution) return false;
  switch (filter) {
    case ResolutionFilter.RESOLUTION_FILTER_720P:
      return resolution === "720p";
    case ResolutionFilter.RESOLUTION_FILTER_1080P:
      return resolution === "1080p";
    case ResolutionFilter.RESOLUTION_FILTER_2160P:
      return resolution === "2160p" || resolution === "4k";
    default:
      return false;
  }
}

function applyCodec(result: SearchResult, filter: CodecFilter) {
  const codec = effectiveInfo(result).codec.toLowerCase();
  if (!codec) return false;
  switch (filter) {
    case CodecFilter.X264:
      return codec === "x264";
    case CodecFilter.X265:
      return codec === "x265";
    default:
      return false;
  }
}

function applyOther(result: SearchResult, filter: OtherFilter) {
  switch (filter) {
    case OtherFilter.HDR:
      return Boolean(effectiveInfo(result).hdr);
    default:
      return false;
  }
}

function compareValues(a: SearchResult, b: SearchResult, sortBy: SortBy) {
  switch (sortBy) {
    case SortBy.TITLE:
      return a.title.localeCompare(b.title);
    case SortBy.SOURCE:
      return a.source.localeCompare(b.source);
    case SortBy.UPLOADED_AT:
      return new Date(a.uploadedAt).getTime() - new Date(b.uploadedAt).getTime();
    case SortBy.SIZE:
      if (a.size === b.size) {
        return 0;
      }
      return a.size > b.size ? 1 : -1;
    case SortBy.SEEDERS:
      if (a.seeders === b.seeders) {
        return 0;
      }
      return a.seeders > b.seeders ? 1 : -1;
    default:
      return 0;
  }
}

export function formatSearchResults(
  results: SearchResult[],
  resolutionFilters: ResolutionFilter[],
  codecFilters: CodecFilter[],
  otherFilters: OtherFilter[],
  sortBy: SortBy,
  sortDirection: SortDirection,
) {
  const filtered = results
    .filter((result) => {
      if (
        resolutionFilters.length > 0 &&
        !resolutionFilters.some((filter) => applyResolution(result, filter))
      ) {
        return false;
      }
      if (codecFilters.length > 0 && !codecFilters.some((filter) => applyCodec(result, filter))) {
        return false;
      }
      if (otherFilters.length > 0 && !otherFilters.some((filter) => applyOther(result, filter))) {
        return false;
      }
      return true;
    })
    .sort((a, b) => {
      const result = compareValues(a, b, sortBy);
      return sortDirection === SortDirection.ASC ? result : -result;
    });

  return filtered;
}
