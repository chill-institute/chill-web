import { Badge } from "@/ui/components/ui/badge";
import { getTVShowStatusLabel, TVShowStatus } from "@/catalog/lib/types";

function toneForStatus(status: TVShowStatus) {
  switch (status) {
    case TVShowStatus.TV_SHOW_STATUS_RETURNING:
    case TVShowStatus.TV_SHOW_STATUS_IN_PRODUCTION:
      return "success";
    case TVShowStatus.TV_SHOW_STATUS_CANCELED:
      return "error";
    case TVShowStatus.TV_SHOW_STATUS_PLANNED:
    case TVShowStatus.TV_SHOW_STATUS_ENDED:
    case TVShowStatus.TV_SHOW_STATUS_UNSPECIFIED:
    default:
      return "muted";
  }
}

export function TVShowStatusBadge({
  status,
  className,
}: {
  status: TVShowStatus;
  className?: string;
}) {
  const tone = toneForStatus(status);
  return (
    <Badge variant={tone} className={className}>
      {getTVShowStatusLabel(status)}
    </Badge>
  );
}
