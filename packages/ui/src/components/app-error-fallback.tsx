import {
  ClipboardCheck,
  ClipboardX,
  Copy,
  ExternalLink,
  RefreshCw,
  TriangleAlert,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { StatusPanel } from "./status-panel";
import { Button } from "./ui/button";
import { Textarea } from "./ui/textarea";
import { buildErrorReport, buildGitHubIssueURL, formatErrorReport } from "../lib/error-report";

type AppErrorFallbackProps = {
  app: string;
  error: unknown;
  componentStack?: string;
  release?: string;
};

function getClientReportContext(release?: string) {
  const routePath = typeof window === "undefined" ? "/" : window.location.pathname;
  const userAgent = typeof navigator === "undefined" ? "unknown" : navigator.userAgent;

  return {
    occurredAt: new Date().toISOString(),
    release: release ?? "dev",
    routePath,
    userAgent,
  };
}

function AppErrorFallback({ app, error, componentStack, release }: AppErrorFallbackProps) {
  const [copyState, setCopyState] = useState<"idle" | "copied" | "error">("idle");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (copyState === "idle") {
      return;
    }

    const timeout = window.setTimeout(() => setCopyState("idle"), 2000);
    return () => window.clearTimeout(timeout);
  }, [copyState]);

  const report = useMemo(
    () =>
      buildErrorReport(error, {
        app,
        ...getClientReportContext(release),
        componentStack,
        notes,
      }),
    [app, componentStack, error, notes, release],
  );

  const reportText = useMemo(() => formatErrorReport(report), [report]);
  const issueURL = useMemo(() => buildGitHubIssueURL(report), [report]);

  const copyLabel =
    copyState === "copied" ? "copied" : copyState === "error" ? "copy failed" : "copy report";

  const copyIcon =
    copyState === "copied" ? <ClipboardCheck /> : copyState === "error" ? <ClipboardX /> : <Copy />;

  return (
    <StatusPanel>
      <div className="flex items-start gap-3">
        <div className="border-error-border bg-error-bg text-error-text rounded-full border p-2">
          <TriangleAlert />
        </div>
        <div className="space-y-2">
          <h1 className="text-2xl leading-7">Something went wrong.</h1>
          <p className="text-fg-2 text-sm">
            The app hit a crash. Nothing is sent anywhere unless you choose to copy the report.
          </p>
        </div>
      </div>

      <div className="border-border-soft bg-surface-2 rounded border p-3 text-sm">
        <div>
          <strong>Message:</strong> {report.error.message}
        </div>
        <div>
          <strong>Route:</strong> {report.routePath}
        </div>
        <div>
          <strong>Release:</strong> {report.release}
        </div>
      </div>

      <label className="flex flex-col gap-2 text-sm">
        <span className="font-medium">What were you doing?</span>
        <Textarea
          className="min-h-24"
          placeholder="Optional notes to include in the copied report."
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
        />
      </label>

      <div className="flex flex-wrap gap-2">
        <Button variant="outline" onClick={() => window.location.reload()}>
          <RefreshCw />
          reload page
        </Button>
        <Button
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(reportText);
              setCopyState("copied");
            } catch {
              setCopyState("error");
            }
          }}
        >
          {copyIcon}
          {copyLabel}
        </Button>
        <Button render={<a href={issueURL} target="_blank" rel="noreferrer" />}>
          <ExternalLink />
          create GitHub issue
        </Button>
      </div>

      <details className="border-border-soft bg-surface-2 rounded border p-3 text-sm">
        <summary className="cursor-pointer font-medium select-none">Preview copied report</summary>
        <pre className="mt-3 overflow-x-auto text-xs leading-5 break-words whitespace-pre-wrap">
          {reportText}
        </pre>
      </details>
    </StatusPanel>
  );
}

export { AppErrorFallback };
