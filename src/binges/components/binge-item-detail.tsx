import { useState } from "react";

import { MovieDetailModal } from "@/catalog/components/movie-detail-modal";
import { TvShowDetailModal } from "@/catalog/components/tv-show-detail-modal";
import { BingeMediaType, bingeItemToMovie, type BingeItem } from "@/binges/lib/types";

export function BingeItemDetail({ item, onClose }: { item: BingeItem; onClose: () => void }) {
  const [season, setSeason] = useState<number | undefined>(undefined);

  if (item.mediaType === BingeMediaType.TV_SHOW) {
    return (
      <TvShowDetailModal
        imdbId={item.imdbId}
        activeSeason={season}
        onSeasonChange={setSeason}
        onClose={onClose}
      />
    );
  }
  return <MovieDetailModal movie={bingeItemToMovie(item)} onClose={onClose} />;
}
