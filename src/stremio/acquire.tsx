import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { formatBytes } from "@/ui/lib/format";
import { Button } from "@/ui/components/ui/button";
import { InstallationError } from "./setup";
import {
  acquireRelease,
  getAcquisition,
  getReleases,
  type AcquisitionOperation,
  type AcquisitionTarget,
} from "./acquisition-api";

export function Acquire({ token, target }: { token: string; target: AcquisitionTarget }) {
  const [selected, setSelected] = useState<string | null>(null);
  const [operation, setOperation] = useState<AcquisitionOperation | null>(null);
  const releases = useQuery({
    queryKey: ["stremio-releases", target],
    queryFn: ({ signal }) => getReleases(token, target, signal),
    retry: false,
    gcTime: 0,
  });
  const submit = useMutation({
    mutationFn: (releaseId: string) => acquireRelease(token, target, releaseId),
    retry: false,
    onSuccess: setOperation,
  });
  const activeOperation = operation ?? releases.data?.operation;
  const choice = releases.data?.releases.find((release) => release.id === selected);
  return (
    <section className="mx-auto flex max-w-xl flex-col gap-5" data-page="stremio-acquire">
      <h1 className="font-serif text-3xl">Send to put.io</h1>
      <p className="text-fg-2">
        Choose a release and confirm. Once it is ready, you can watch it in your Stremio add-on.
      </p>
      {activeOperation ? (
        <AcquisitionStatus
          token={token}
          installation={target.installation}
          operation={activeOperation}
        />
      ) : (
        <>
          {releases.isPending ? <p role="status">Finding releases…</p> : null}
          {releases.error ? (
            <>
              <InstallationError error={releases.error} />
              <Button onClick={() => void releases.refetch()}>retry search</Button>
            </>
          ) : null}
          {releases.data?.releases.length === 0 ? (
            <p>No releases found. Try another title in Stremio.</p>
          ) : null}
          <fieldset
            className="flex min-w-0 flex-col gap-3"
            disabled={submit.isPending || submit.isError}
          >
            <legend className="sr-only">Choose a release</legend>
            {releases.data?.releases.map((release) => (
              <label
                key={release.id}
                className="flex min-w-0 cursor-pointer items-start gap-3 rounded border border-border-strong bg-surface p-3"
              >
                <input
                  type="radio"
                  name="release"
                  value={release.id}
                  checked={selected === release.id}
                  onChange={() => setSelected(release.id)}
                  className="mt-1 accent-fg-1"
                />
                <span className="flex min-w-0 flex-col gap-1">
                  <span className="break-words">{release.title}</span>
                  <span className="text-fg-3 text-sm">
                    {release.indexer} · {release.seeders} seeders ·{" "}
                    {formatBytes(BigInt(release.size))}
                  </span>
                </span>
              </label>
            ))}
          </fieldset>
          {choice ? (
            <div className="flex flex-col gap-3 border-t border-border-faint pt-4">
              <p>
                Send <strong className="break-words">{choice.title}</strong> to your put.io account?
                This uses your account storage and transfer allowance.
              </p>
              <Button
                variant="primary"
                disabled={submit.isPending || submit.isError}
                onClick={() => submit.mutate(choice.id)}
              >
                {submit.isPending ? "sending…" : "confirm and send to put.io"}
              </Button>
            </div>
          ) : null}
          {submit.error ? (
            <>
              <InstallationError error={submit.error} />
              <p>
                The request may have been accepted. Check its status before sending anything again.
              </p>
              <Button onClick={() => void releases.refetch()}>check request status</Button>
            </>
          ) : null}
        </>
      )}
      <Link to="/stremio" className="underline underline-offset-2">
        manage your add-ons
      </Link>
    </section>
  );
}

function AcquisitionStatus({
  token,
  installation,
  operation,
}: {
  token: string;
  installation: string;
  operation: AcquisitionOperation;
}) {
  const status = useQuery({
    queryKey: ["stremio-acquisition", installation, operation.id],
    queryFn: ({ signal }) => getAcquisition(token, installation, operation.id, signal),
    retry: false,
    gcTime: 0,
  });
  const files = status.data?.files ?? [];
  return (
    <div className="flex flex-col gap-4" aria-live="polite">
      <h2 className="font-serif text-xl">Your transfer</h2>
      {status.isPending ? <p>Checking transfer…</p> : null}
      {status.error ? <InstallationError error={status.error} /> : null}
      {status.data?.state === "unknown" ? (
        <p>
          We couldn't confirm whether put.io accepted this request. Check your put.io transfers
          before trying again. This page will not send a duplicate.
        </p>
      ) : null}
      {status.data?.transfer ? (
        <p className="break-words">
          {status.data.transfer.name ?? "Your transfer"} — {status.data.transfer.status} ·{" "}
          {Math.round(status.data.transfer.percentDone)}%
        </p>
      ) : null}
      {status.data && files.length === 0 && status.data.state === "submitted" ? (
        <p>Transfer submitted. Check again when put.io has finished preparing your files.</p>
      ) : null}
      {files.length > 0 ? (
        <>
          <p>
            Ready to watch. Refresh your add-on's Acquired videos catalog in Stremio, or select a
            file below in Stremio Web.
          </p>
          <ul className="flex flex-col gap-3">
            {files.map((file) => (
              <li key={file.id}>
                <a
                  className="break-words underline underline-offset-2"
                  href={`https://web.stremio.com/#/detail/movie/${encodeURIComponent(file.stremioId)}`}
                  target="_blank"
                  rel="noreferrer noopener"
                >
                  {file.name}
                </a>
              </li>
            ))}
          </ul>
        </>
      ) : null}
      <Button disabled={status.isFetching} onClick={() => void status.refetch()}>
        {status.isFetching ? "checking…" : "check status"}
      </Button>
    </div>
  );
}
