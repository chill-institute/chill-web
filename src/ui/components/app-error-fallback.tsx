import { ClipboardCheck, ClipboardX, Copy, RefreshCw, TriangleAlert } from "lucide-react";
import { useId, useMemo, useRef, useState } from "react";

import { StatusPanel } from "./status-panel";
import { Button } from "./ui/button";
import { Field, FieldLabel } from "./ui/field";
import { Textarea } from "./ui/textarea";
import { buildErrorReport, formatErrorReport } from "../lib/error-report";
import { useMountEffect } from "../hooks/use-effects";

type AppErrorFallbackProps = {
  error: unknown;
  componentStack?: string;
  release?: string;
  sentryEventId?: string;
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

function AppErrorFallback({
  error,
  componentStack,
  release,
  sentryEventId,
}: AppErrorFallbackProps) {
  const [copyState, setCopyState] = useState<"idle" | "copied" | "error">("idle");
  const [notes, setNotes] = useState("");
  const notesId = useId();
  const resetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useMountEffect(() => () => {
    if (resetTimerRef.current !== null) clearTimeout(resetTimerRef.current);
  });

  const scheduleCopyReset = () => {
    if (resetTimerRef.current !== null) clearTimeout(resetTimerRef.current);
    resetTimerRef.current = setTimeout(() => setCopyState("idle"), 2000);
  };

  const report = useMemo(
    () =>
      buildErrorReport(error, {
        ...getClientReportContext(release),
        componentStack,
        notes,
        sentryEventId,
      }),
    [componentStack, error, notes, release, sentryEventId],
  );

  const reportText = useMemo(() => formatErrorReport(report), [report]);

  const copyLabel =
    copyState === "copied" ? "copied" : copyState === "error" ? "copy failed" : "copy report";

  const copyIcon =
    copyState === "copied" ? <ClipboardCheck /> : copyState === "error" ? <ClipboardX /> : <Copy />;

  return (
    <StatusPanel
      icon={<TriangleAlert />}
      tone="error"
      title="Something went wrong."
      description={
        sentryEventId
          ? "The app hit a crash and sent a private crash report."
          : "The app hit a crash. Crash reporting is not configured for this build."
      }
      contentClassName="max-w-2xl"
    >
      <dl className="border-border-soft bg-surface-2 m-0 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 rounded border p-3 text-sm">
        <dt className="font-medium">Message</dt>
        <dd className="m-0 min-w-0 break-words">{report.error.message}</dd>
        <dt className="font-medium">Route</dt>
        <dd className="m-0 min-w-0 break-words">{report.routePath}</dd>
        <dt className="font-medium">Release</dt>
        <dd className="m-0 min-w-0 break-words">{report.release}</dd>
        {sentryEventId ? (
          <>
            <dt className="font-medium">Sentry event</dt>
            <dd className="m-0 min-w-0 break-words">{sentryEventId}</dd>
          </>
        ) : null}
      </dl>

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
