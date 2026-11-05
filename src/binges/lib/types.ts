import { create } from "@bufbuild/protobuf";
import { timestampDate } from "@bufbuild/protobuf/wkt";
import {
  BingeMediaType,
  MovieSchema,
  MoviesSource,
  type Binge,
  type BingeItem,
  type BingeSummary,
  type BingeTitleMatch,
  type Movie,
} from "@chill-institute/contracts/chill/v4/api_pb";

export { BingeMediaType };
export type { Binge, BingeItem, BingeSummary, BingeTitleMatch };

export const BINGE_TITLE_MAX_LENGTH = 120;
const BINGE_BLURB_MAX_LENGTH = 1000;
export const BINGE_COMMENT_MAX_LENGTH = 500;
const BINGE_MAX_ITEMS = 50;

const IMDB_ID_PATTERN = /^tt\d{7,8}$/;
const CURATOR_NAME_MIN_LENGTH = 2;
const CURATOR_NAME_MAX_LENGTH = 40;

function codePointCount(value: string): number {
  let count = 0;
  for (const _ of value) count++;
  return count;
}
const IMDB_URL_PATTERN = /imdb\.com\/title\/(tt\d{7,8})/i;

export type BingeTitlePick = Pick<
  BingeTitleMatch,
  "imdbId" | "mediaType" | "title" | "year" | "posterUrl"
>;

export type BingeItemDraft = BingeTitlePick & {
  key: string;
  comment: string;
};

export type BingeDraft = {
  title: string;
  blurb: string;
  items: BingeItemDraft[];
};

export type BingeDraftErrors = {
  title?: string;
  blurb?: string;
  items?: string;
  itemErrors: Record<string, string>;
};

export function normalizeIMDbId(value: string): string {
  const trimmed = value.trim();
  const fromUrl = IMDB_URL_PATTERN.exec(trimmed)?.[1];
  const candidate = (fromUrl ?? trimmed).toLowerCase();
  return IMDB_ID_PATTERN.test(candidate) ? candidate : "";
}

export function validateBingeDraft(draft: BingeDraft): BingeDraftErrors | null {
  const errors: BingeDraftErrors = { itemErrors: {} };
  const title = draft.title.trim();
  if (title.length === 0) {
    errors.title = "give the binge a title";
  } else if (codePointCount(title) > BINGE_TITLE_MAX_LENGTH) {
    errors.title = `keep the title under ${BINGE_TITLE_MAX_LENGTH} characters`;
  }
  if (codePointCount(draft.blurb.trim()) > BINGE_BLURB_MAX_LENGTH) {
    errors.blurb = `keep the blurb under ${BINGE_BLURB_MAX_LENGTH} characters`;
  }

  const filled = draft.items.filter(
    (item) => item.imdbId.trim().length > 0 || item.comment.trim().length > 0,
  );
  if (filled.length === 0) {
    errors.items = "add at least one title";
  } else if (filled.length > BINGE_MAX_ITEMS) {
    errors.items = `keep it under ${BINGE_MAX_ITEMS} titles`;
  }

  const seen = new Set<string>();
  for (const item of filled) {
    const imdbId = normalizeIMDbId(item.imdbId);
    if (imdbId === "") {
      errors.itemErrors[item.key] = "pick a title";
      continue;
    }
    if (seen.has(imdbId)) {
      errors.itemErrors[item.key] = "already in this binge";
      continue;
    }
    seen.add(imdbId);
    if (codePointCount(item.comment.trim()) > BINGE_COMMENT_MAX_LENGTH) {
      errors.itemErrors[item.key] = `keep the comment under ${BINGE_COMMENT_MAX_LENGTH} characters`;
    }
  }

  const hasErrors =
    errors.title !== undefined ||
    errors.blurb !== undefined ||
    errors.items !== undefined ||
    Object.keys(errors.itemErrors).length > 0;
  return hasErrors ? errors : null;
}

export function normalizeCuratorName(value: string): { name: string; error?: string } {
  const name = value.trim().split(/\s+/).filter(Boolean).join(" ");
  const length = codePointCount(name);
  if (length < CURATOR_NAME_MIN_LENGTH) {
    return { name, error: `pick a name of at least ${CURATOR_NAME_MIN_LENGTH} characters` };
  }
  if (length > CURATOR_NAME_MAX_LENGTH) {
    return { name, error: `keep the name under ${CURATOR_NAME_MAX_LENGTH} characters` };
  }
  return { name };
}

export function curatorKey(name: string | undefined): string {
  return name?.trim() ?? "";
}

export function curatorLabel(name: string | undefined): string {
  const trimmed = name?.trim() ?? "";
  return trimmed.length > 0 ? trimmed : "a curator";
}

export function bingeDraftToInput(draft: BingeDraft) {
  return {
    title: draft.title.trim(),
    blurb: draft.blurb.trim(),
    items: draft.items
      .filter((item) => item.imdbId.trim().length > 0 || item.comment.trim().length > 0)
      .map((item) => ({ imdbId: normalizeIMDbId(item.imdbId), comment: item.comment.trim() })),
  };
}

export function bingeToDraft(binge: Binge | undefined, newKey: () => string): BingeDraft {
  if (!binge) {
    return { title: "", blurb: "", items: [] };
  }
  return {
    title: binge.title,
    blurb: binge.blurb,
    items: binge.items.map((item) => ({
      key: newKey(),
      imdbId: item.imdbId,
      mediaType: item.mediaType,
      title: item.title,
      year: item.year,
      posterUrl: item.posterUrl,
      comment: item.comment,
    })),
  };
}

export function bingeTitleLabel(title: string, year: number): string {
  const trimmed = title.trim();
  if (trimmed.length === 0) return "";
  return year > 0 ? `${trimmed} (${year})` : trimmed;
}

export function pastedTitlePick(imdbId: string): BingeTitlePick {
  return { imdbId, mediaType: BingeMediaType.UNSPECIFIED, title: "", year: 0, posterUrl: "" };
}

export function moveDraftItem(draft: BingeDraft, key: string, to: number): BingeDraft {
  const from = draft.items.findIndex((item) => item.key === key);
  const target = Math.max(0, Math.min(to, draft.items.length - 1));
  if (from === -1 || from === target) return draft;
  const items = [...draft.items];
  const [moved] = items.splice(from, 1);
  items.splice(target, 0, moved!);
  return { ...draft, items };
}

export function bingeMediaTypeLabel(mediaType: BingeMediaType): string {
  switch (mediaType) {
    case BingeMediaType.MOVIE:
      return "movie";
    case BingeMediaType.TV_SHOW:
      return "tv show";
    default:
      return "";
  }
}

export function bingeItemToMovie(item: BingeItem): Movie {
  return create(MovieSchema, {
    id: item.imdbId,
    title: item.title,
    titlePretty: item.title,
    year: item.year,
    source: MoviesSource.UNSPECIFIED,
    posterUrl: item.posterUrl,
    backdropUrl: item.backdropUrl,
    rating: item.rating,
    overview: item.overview,
    genres: item.genres,
    externalUrl: item.externalUrl,
  });
}

export function formatBingeDate(timestamp: BingeSummary["createdAt"]) {
  if (!timestamp) return "";
  return timestampDate(timestamp).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}
