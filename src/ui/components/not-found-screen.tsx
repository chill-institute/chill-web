import { Compass } from "lucide-react";
import type { ReactNode } from "react";

import { StatusPanel } from "./status-panel";
import { buttonVariants } from "./ui/button";

type NotFoundScreenProps = {
  homeHref?: string;
  homeLabel?: string;
  children?: ReactNode;
};

function NotFoundScreen({ homeHref = "/", homeLabel = "go home", children }: NotFoundScreenProps) {
  return (
    <StatusPanel className="max-w-xl gap-5 rounded p-5 sm:p-6">
      <div className="flex items-start gap-4">
        <Compass aria-hidden="true" className="text-fg-3 mt-0.5 size-5 shrink-0" />
        <div className="flex min-w-0 flex-col gap-5">
          <div className="flex flex-col gap-1.5">
            <h1 className="text-xl leading-6">page not found</h1>
            <p className="text-fg-2 max-w-prose text-base leading-6 sm:text-sm sm:leading-5">
              we couldn&rsquo;t find anything at this URL. it might have moved, or the link might be
              mistyped.
            </p>
          </div>
          {children}
          <div>
            <a className={buttonVariants({ variant: "primary" })} href={homeHref}>
              {homeLabel}
            </a>
          </div>
        </div>
      </div>
    </StatusPanel>
  );
}

export { NotFoundScreen };
