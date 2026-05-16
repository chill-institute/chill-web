import { Compass } from "lucide-react";
import type { ReactNode } from "react";

import { StatusPanel } from "./status-panel";

type NotFoundScreenProps = {
  homeHref?: string;
  homeLabel?: string;
  children?: ReactNode;
};

function NotFoundScreen({ homeHref = "/", homeLabel = "go home", children }: NotFoundScreenProps) {
  return (
    <StatusPanel>
      <div className="flex items-start gap-3">
        <div className="border-border-soft bg-surface text-fg-2 rounded-full border p-2">
          <Compass />
        </div>
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl leading-7">page not found</h1>
          <p className="text-fg-2 text-sm">
            we couldn&rsquo;t find anything at this URL. it might have moved, or the link might be
            mistyped.
          </p>
        </div>
      </div>
      {children}
      <div>
        <a
          href={homeHref}
          className="text-fg-1 hover:text-fg-2 inline-block text-sm underline underline-offset-4"
        >
          {homeLabel}
        </a>
      </div>
    </StatusPanel>
  );
}

export { NotFoundScreen };
