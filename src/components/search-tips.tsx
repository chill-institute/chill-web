import { CircleHelp } from "lucide-react";

import { Popover, PopoverContent, PopoverTrigger } from "@/ui/components/ui/popover";

const tips = [
  {
    example: '"the matrix"',
    meaning: 'results must include "the matrix" or "the.matrix" or "the-matrix" or "the_matrix"',
  },
  { example: "+S01E07", meaning: "results must include S01E07" },
  { example: "-cam", meaning: 'results never include the word "cam"' },
  { example: "tt0133093", meaning: "some trackers accept imdb tt codes" },
  { example: "imdb.com/title/tt0133093", meaning: "chill converts imdb share links to tt codes" },
] as const;

export function SearchTips() {
  return (
    <Popover>
      <PopoverTrigger
        openOnHover
        className="text-fg-3 hover:text-fg-1 inline-flex cursor-default items-center gap-1 text-xs"
      >
        <CircleHelp aria-hidden="true" className="size-3.5" />
        search tips
      </PopoverTrigger>
      <PopoverContent
        align="center"
        side="bottom"
        sideOffset={6}
        size="sm"
        className="w-max max-w-[calc(100vw-2rem)]"
      >
        <dl
          aria-label="search tips"
          className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-sm"
        >
          {tips.map((tip) => (
            <div key={tip.example} className="contents">
              <dt className="text-fg-1">{tip.example}</dt>
              <dd className="text-fg-3 m-0">{tip.meaning}</dd>
            </div>
          ))}
        </dl>
      </PopoverContent>
    </Popover>
  );
}
