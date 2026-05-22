import {
  ClipboardCheck,
  ClipboardX,
  Copy,
  ExternalLink,
  RefreshCw,
  TriangleAlert,
} from "lucide-react";
import { useEffect, useId, useMemo, useRef, useState } from "react";

import { StatusPanel } from "./status-panel";
import { Button, buttonVariants } from "./ui/button";
import { Field, FieldLabel } from "./ui/field";
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
  const notesId = useId();
  const resetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (resetTimerRef.current !== null) clearTimeout(resetTimerRef.current);
    },
    [],
  );

  const scheduleCopyReset = () => {
    if (resetTimerRef.current !== null) clearTimeout(resetTimerRef.current);
    resetTimerRef.current = setTimeout(() => setCopyState("idle"), 2000);
  };

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
        <div className="flex flex-col gap-2">
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

      <Field>
        <FieldLabel htmlFor={notesId} className="text-sm font-medium">
          What were you doing?
        </FieldLabel>
        <Textarea
          id={notesId}
          name="error-report-notes"
          className="min-h-24"
          placeholder="Optional notes to include in the copied report."
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
        />
      </Field>

      <div className="flex flex-wrap gap-2">
        <Button variant="outline" onClick={() => window.location.reload()}>
          <RefreshCw data-icon="inline-start" />
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
            scheduleCopyReset();
          }}
        >
          <span data-icon="inline-start">{copyIcon}</span>
          {copyLabel}
        </Button>
        <a className={buttonVariants()} href={issueURL} target="_blank" rel="noreferrer">
          <ExternalLink data-icon="inline-start" />
          create GitHub issue
        </a>
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
