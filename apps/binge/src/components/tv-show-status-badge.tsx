import { Badge } from "@chill-institute/ui/components/ui/badge";
import { cn } from "@chill-institute/ui/cn";
import { getTVShowStatusLabel, TVShowStatus } from "@/lib/types";

function toneForStatus(status: TVShowStatus) {
  switch (status) {
    case TVShowStatus.TV_SHOW_STATUS_RETURNING:
    case TVShowStatus.TV_SHOW_STATUS_IN_PRODUCTION:
      return "border-success/40 bg-success/10 text-success";
    case TVShowStatus.TV_SHOW_STATUS_CANCELED:
      return "border-error/40 bg-error/10 text-error";
    case TVShowStatus.TV_SHOW_STATUS_PLANNED:
    case TVShowStatus.TV_SHOW_STATUS_ENDED:
    case TVShowStatus.TV_SHOW_STATUS_UNSPECIFIED:
    default:
      return "border-border-soft bg-surface-2 text-fg-3";
  }
}

export function TVShowStatusBadge({
  status,
  className,
}: {
  status: TVShowStatus;
  className?: string;
}) {
  return (
    <Badge variant="outline" className={cn("rounded", toneForStatus(status), className)}>
      {getTVShowStatusLabel(status)}
    </Badge>
  );
}
