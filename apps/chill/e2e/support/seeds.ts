import { create, toJson, type MessageInitShape } from "@bufbuild/protobuf";
import {
  type UserIndexer,
  type SearchResult,
  type UserFile,
  GetDownloadFolderResponseSchema,
  GetFolderResponseSchema,
  ReleaseInfoSchema,
  SearchResponseSchema,
  SearchResultSchema,
  SearchResultDisplayBehavior,
  SearchResultTitleBehavior,
  SortBy,
  SortDirection,
  CardDisplayType,
  MoviesSource,
  UserFileSchema,
  UserGetIndexersResponseSchema,
  UserIndexerSchema,
  UserSettingsSchema,
} from "@chill-institute/contracts/chill/v4/api_pb";

type ConfigInit = MessageInitShape<typeof UserSettingsSchema>;
type IndexerInit = MessageInitShape<typeof UserIndexerSchema>;
type ResultInit = MessageInitShape<typeof SearchResultSchema>;
type UserFileInit = MessageInitShape<typeof UserFileSchema>;

export function userSettings(init?: ConfigInit) {
  return toJson(
    UserSettingsSchema,
    create(UserSettingsSchema, {
      searchResultDisplayBehavior: SearchResultDisplayBehavior.FASTEST,
      searchResultTitleBehavior: SearchResultTitleBehavior.TEXT,
      sortBy: SortBy.SEEDERS,
      sortDirection: SortDirection.DESC,
      cardDisplayType: CardDisplayType.COMPACT,
      moviesSource: MoviesSource.IMDB_MOVIEMETER,
      filterNastyResults: true,
      ...init,
    }),
  );
}

export function indexer(init?: IndexerInit) {
  return create(UserIndexerSchema, {
    id: "yts",
    name: "YTS",
    enabled: true,
    ...init,
  });
}

export function indexersResponse(indexers: UserIndexer[]) {
  return toJson(UserGetIndexersResponseSchema, create(UserGetIndexersResponseSchema, { indexers }));
}

function deriveReleaseInfo(rawTitle: string) {
  const t = rawTitle.toLowerCase();
  const resolution =
    t.match(/\b(2160p|1080p|720p|480p)\b/)?.[1] ?? (t.includes("4k") ? "2160p" : "");
  const codec = /\b(x265|h\.?265|hevc)\b/.test(t)
    ? "x265"
    : /\b(x264|h\.?264|avc)\b/.test(t)
      ? "x264"
      : "";
  const hdr = t.match(/\b(hdr10\+?|hdr|dv|dolby vision)\b/)?.[1] ?? "";
  const cleaned = rawTitle.replace(/\.(mkv|mp4|avi|mov|webm)$/i, "");
  const groupMatch = cleaned.match(/-(\w[\w.]{2,})$/);
  const groupBoundary = groupMatch?.index ?? cleaned.length;
  const yearMatches = [...cleaned.matchAll(/\b(19\d{2}|20\d{2})\b/g)].filter(
    (m) => typeof m.index === "number" && m.index < groupBoundary,
  );
  const lastYear = yearMatches.at(-1);
  const yearStr = lastYear?.[1];
  const year = yearStr ? Number.parseInt(yearStr, 10) : undefined;
  let title = "";
  if (lastYear && typeof lastYear.index === "number" && lastYear.index > 0) {
    title = cleaned.slice(0, lastYear.index).replace(/[._]+/g, " ").replace(/\s+/g, " ").trim();
  }
  return create(ReleaseInfoSchema, { title, year, resolution, codec, hdr });
}

export function searchResult(init?: ResultInit) {
  const title = init?.title ?? "Ubuntu 24.04 LTS x264";
  return create(SearchResultSchema, {
    id: "result-1",
    title,
    indexer: "yts",
    link: "magnet:?xt=urn:btih:abc123",
    seeders: 42n,
    peers: 10n,
    size: 1073741824n,
    source: "YTS",
    uploadedAt: "2025-01-15T12:00:00Z",
    releaseInfo: deriveReleaseInfo(title),
    ...init,
  });
}

export function searchResponse(query: string, results: SearchResult[]) {
  return toJson(SearchResponseSchema, create(SearchResponseSchema, { query, results }));
}

export function userFile(init?: UserFileInit) {
  return create(UserFileSchema, {
    id: 0n,
    name: "your files",
    fileType: "FOLDER",
    isShared: false,
    createdAt: "2025-01-15T12:00:00Z",
    ...init,
  });
}

export function downloadFolderResponse(folder?: UserFile) {
  return toJson(
    GetDownloadFolderResponseSchema,
    create(GetDownloadFolderResponseSchema, { folder }),
  );
}

export function folderResponse(parent: UserFile, files: UserFile[]) {
  return toJson(
    GetFolderResponseSchema,
    create(GetFolderResponseSchema, {
      parent,
      files,
    }),
  );
}
