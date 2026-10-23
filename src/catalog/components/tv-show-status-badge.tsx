import { Badge } from "@/ui/components/ui/badge";
import { cn } from "@/ui/lib/cn";
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
      return "neutral";
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
    <Badge
      variant="outline"
      className={cn(
        "rounded",
        tone === "success" && "border-success/40 bg-success/10 text-success",
        tone === "error" && "border-error/40 bg-error/10 text-error",
        tone === "neutral" && "border-border-soft bg-surface-2 text-fg-3",
        className,
      )}
    >
      {getTVShowStatusLabel(status)}
    </Badge>
  );
}
