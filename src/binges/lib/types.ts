import { create } from "@bufbuild/protobuf";
import { timestampDate } from "@bufbuild/protobuf/wkt";
import {
  BingeMediaType,
  MovieSchema,
  MoviesSource,
  type Binge,
  type BingeItem,
  type BingeSummary,
  type Movie,
} from "@chill-institute/contracts/chill/v4/api_pb";

export { BingeMediaType };
export type { Binge, BingeItem, BingeSummary };

export const BINGE_TITLE_MAX_LENGTH = 120;
const BINGE_BLURB_MAX_LENGTH = 1000;
export const BINGE_COMMENT_MAX_LENGTH = 500;
const BINGE_MAX_ITEMS = 50;

const IMDB_ID_PATTERN = /^tt\d{7,8}$/;

/** Counts characters the way the engine does (Unicode code points, not UTF-16 units). */
function lengthOf(value: string): number {
  let count = 0;
  for (const _ of value) count++;
  return count;
}
const IMDB_URL_PATTERN = /imdb\.com\/title\/(tt\d{7,8})/i;

type BingeItemDraft = {
  key: string;
  imdbId: string;
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

/** Accepts a bare title ID or an IMDb title URL; returns the lowercase ID or "" */
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
  } else if (lengthOf(title) > BINGE_TITLE_MAX_LENGTH) {
    errors.title = `keep the title under ${BINGE_TITLE_MAX_LENGTH} characters`;
  }
  if (lengthOf(draft.blurb.trim()) > BINGE_BLURB_MAX_LENGTH) {
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
      errors.itemErrors[item.key] = "needs an IMDb title id like tt0903747";
      continue;
    }
    if (seen.has(imdbId)) {
      errors.itemErrors[item.key] = "already in this binge";
      continue;
    }
    seen.add(imdbId);
    if (lengthOf(item.comment.trim()) > BINGE_COMMENT_MAX_LENGTH) {
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
    return { title: "", blurb: "", items: [{ key: newKey(), imdbId: "", comment: "" }] };
  }
  return {
    title: binge.title,
    blurb: binge.blurb,
    items: binge.items.map((item) => ({
      key: newKey(),
      imdbId: item.imdbId,
      comment: item.comment,
    })),
  };
}

/** The movie detail modal reads a catalog Movie; a resolved binge item carries enough to build one. */
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
