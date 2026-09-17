import { ArrowLeft, Compass } from "lucide-react";
import type { ReactNode } from "react";

import { StatusPanel } from "./status-panel";
import { Button, buttonVariants } from "./ui/button";

type NotFoundScreenProps = {
  homeHref?: string;
  homeLabel?: string;
  children?: ReactNode;
};

function NotFoundScreen({ homeHref = "/", homeLabel = "go home", children }: NotFoundScreenProps) {
  return (
    <StatusPanel
      icon={<Compass />}
      title="page not found"
      description="nothing lives at this address. it may have moved, or the link is mistyped."
    >
      {children}
      <div className="flex flex-wrap justify-center gap-2">
        <Button variant="outline" onClick={() => window.history.back()}>
          <ArrowLeft data-icon="inline-start" />
          go back
        </Button>
        <a className={buttonVariants({ variant: "default" })} href={homeHref}>
          {homeLabel}
        </a>
      </div>
    </StatusPanel>
  );
}

export { NotFoundScreen };
