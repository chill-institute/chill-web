import { ExternalLink, RefreshCw, ServerCrash } from "lucide-react";

import { StatusPanel } from "./status-panel";
import { Button, buttonVariants } from "./ui/button";

type BackendUnavailableScreenProps = {
  onRetry?: () => Promise<unknown> | void;
  reloadAfterRetry?: boolean;
};

function BackendUnavailableScreen({
  onRetry,
  reloadAfterRetry = true,
}: BackendUnavailableScreenProps) {
  return (
    <StatusPanel
      icon={<ServerCrash />}
      tone="error"
      title="The Institute is having a moment…"
      description="We could not reach the API. This is usually a brief deploy blip, not a sign-out. Try again in a moment."
    >
      <div className="flex flex-wrap justify-center gap-2">
        <Button
          onClick={() => {
            void onRetry?.();
            if (reloadAfterRetry) window.location.reload();
          }}
        >
          <RefreshCw data-icon="inline-start" />
          {reloadAfterRetry ? "reload page" : "try again"}
        </Button>
        <a
          className={buttonVariants({ variant: "outline" })}
          href="https://status.chill.institute/"
          target="_blank"
          rel="noreferrer"
        >
          <ExternalLink data-icon="inline-start" />
          view status page
        </a>
      </div>
    </StatusPanel>
  );
}

export { BackendUnavailableScreen };
