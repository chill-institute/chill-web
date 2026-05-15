import { ExternalLink, RefreshCw, ServerCrash } from "lucide-react";

import { StatusPanel } from "./status-panel";
import { Button } from "./ui/button";

type BackendUnavailableScreenProps = {
  onRetry?: () => Promise<unknown> | void;
};

function BackendUnavailableScreen({ onRetry }: BackendUnavailableScreenProps) {
  return (
    <StatusPanel>
      <div className="flex items-start gap-3">
        <div className="border-error-border bg-error-bg text-error-text rounded-full border p-2">
          <ServerCrash />
        </div>
        <div className="space-y-2">
          <h1 className="text-2xl leading-7">The Institute is having a moment…</h1>
          <p className="text-fg-2 text-sm">
            We could not reach the API cleanly. This is usually a brief deploy blip or a temporary
            outage, not a sign-out.
          </p>
        </div>
      </div>

      <div className="border-border-soft bg-surface-2 rounded border p-3 text-sm">
        <div>Try again in a moment.</div>
        <div className="text-fg-3">
          If this keeps happening, a page reload usually confirms whether the backend is back.
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button
          variant="outline"
          onClick={() => {
            void onRetry?.();
            window.location.reload();
          }}
        >
          <RefreshCw />
          reload page
        </Button>
        <Button
          render={<a href="https://status.chill.institute/" target="_blank" rel="noreferrer" />}
        >
          <ExternalLink />
          view status page
        </Button>
      </div>
    </StatusPanel>
  );
}

export { BackendUnavailableScreen };
