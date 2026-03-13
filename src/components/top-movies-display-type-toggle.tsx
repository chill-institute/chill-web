import { LayoutGrid, LayoutList } from "lucide-react";

import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { TopMoviesDisplayType, type UserSettings } from "@/lib/types";

const displayTypeOptions = [
  {
    icon: <LayoutGrid />,
    label: "Expanded",
    value: TopMoviesDisplayType.EXPANDED,
  },
  {
    icon: <LayoutList />,
    label: "Compact",
    value: TopMoviesDisplayType.COMPACT,
  },
] as const;

export function TopMoviesDisplayTypeToggle({
  value,
  onChange,
}: {
  value: UserSettings["topMoviesDisplayType"];
  onChange: (value: UserSettings["topMoviesDisplayType"]) => void;
}) {
  return (
    <ToggleGroup
      onValueChange={(v) => {
        if (v.length === 0) return;
        onChange(Number(v[0]) as UserSettings["topMoviesDisplayType"]);
      }}
      value={[String(value)]}
    >
      {displayTypeOptions.map(({ icon, label, value: v }) => (
        <ToggleGroupItem key={v} value={String(v)}>
          <Tooltip>
            <TooltipTrigger render={<div>{icon}</div>} />
            <TooltipContent>
              <p>{label} view</p>
            </TooltipContent>
          </Tooltip>
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  );
}
