import { useRef, useState } from "react";
import { flushSync } from "react-dom";
import { useMutation } from "@tanstack/react-query";
import { AlertCircle, Folder, LogIn } from "lucide-react";
import { useGetPutioStartURL } from "@/auth/api-context";
import { prepareSignInAgainURL, useAuth } from "@/auth/auth";
import { DownloadFolderPicker } from "@/auth/components/download-folder-picker";
import type { FolderCrumb } from "@/auth/components/download-folder-picker-model";
import { UserErrorAlert } from "@/auth/components/user-error-alert";
import { useDownloadFolderQuery } from "@/auth/queries/download-folder";
import { Alert, AlertDescription, AlertTitle } from "@/ui/components/ui/alert";
import { Button } from "@/ui/components/ui/button";
import { ResponsiveModal } from "@/ui/components/responsive-modal";
import { Skeleton } from "@/ui/components/ui/skeleton";
import {
  StremioError,
  createStremioLink,
  disconnectStremio,
  maskedStremioManifestURL,
  stremioInstallURL,
} from "./api";

const privacyNote =
  "Keep it private: anyone with it can play your library and download to your put.io account.";
const disconnectEffect =
  "Every chill add-on link stops working on every device. The website and CLI stay signed in.";

function StremioSetup({ token }: { token: string }) {
  const downloadFolder = useDownloadFolderQuery();
  const [chosenFolder, setChosenFolder] = useState<FolderCrumb | null>(null);
  const [manifestUrl, setManifestUrl] = useState<string | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [confirmingDisconnect, setConfirmingDisconnect] = useState(false);
  const [notice, setNotice] = useState("");
  const linkInput = useRef<HTMLInputElement>(null);
  const create = useMutation({
    mutationFn: () => createStremioLink(token, chosenFolder?.id),
    gcTime: 0,
    onMutate: () => {
      setManifestUrl(null);
      setRevealed(false);
      setNotice("");
    },
    onSuccess: (url) => {
      setManifestUrl(url);
      setNotice("Add-on link ready. Install chill in Stremio or copy the link.");
    },
  });
  const disconnect = useMutation({
    mutationFn: () => disconnectStremio(token),
    gcTime: 0,
    onSuccess: () => {
      create.reset();
      setManifestUrl(null);
      setRevealed(false);
      setConfirmingDisconnect(false);
      setNotice(
        "Disconnected. Every chill add-on link stopped working; remove chill from Stremio.",
      );
    },
  });
  const copy = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      setNotice(`Link copied. ${privacyNote}`);
    } catch {
      flushSync(() => setRevealed(true));
      linkInput.current?.focus();
      setNotice("Couldn't copy the link. Select the add-on link below and copy it manually.");
    }
  };
  const folder = chosenFolder ?? downloadFolder.data?.folder ?? null;
  const busy = create.isPending || disconnect.isPending;

  return (
    <section data-page="stremio" className="mx-auto flex max-w-xl flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h1 className="font-serif text-3xl">Watch with Stremio</h1>
        <p className="text-fg-2">
          Browse, pick releases, download to put.io and play, all inside Stremio.
        </p>
        <p role="note" className="text-fg-3 text-sm">
          Early access. Things will break. If playback stalls, refresh the sources or restart
          Stremio.
        </p>
      </div>
      <div className="flex flex-col gap-3 border-y border-border-faint py-4">
        <h2 className="font-serif text-xl">1. Get your add-on link</h2>
        <p className="text-fg-3 text-sm">Stremio downloads go to this put.io folder.</p>
        {downloadFolder.isError && !chosenFolder ? (
          <UserErrorAlert error={downloadFolder.error} />
        ) : null}
        {downloadFolder.isPending ? (
          <Skeleton className="h-9 w-full rounded" />
        ) : (
          <div
            className="border-border-strong bg-surface flex h-9 w-full items-center justify-between gap-2 rounded border px-2.5 py-1.5 dark:bg-surface-2/30"
            title={folder?.name ?? "no folder selected"}
          >
            <span className="flex min-w-0 flex-1 items-center gap-2">
              <Folder className="text-fg-2 size-4 shrink-0" />
              <span className="text-fg-1 truncate text-sm">
                {folder?.name ?? "no folder selected"}
              </span>
            </span>
            <DownloadFolderPicker
              initialFolder={folder}
              onSave={(_, selected) => setChosenFolder(selected)}
              renderTrigger={(open) => (
                <button
                  aria-expanded={open}
                  aria-haspopup="dialog"
                  aria-label={folder ? "change download folder" : "choose download folder"}
                  disabled={busy}
                  className="text-fg-3 hover-hover:hover:text-fg-1 inline-flex min-h-6 shrink-0 cursor-pointer items-center text-sm hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring-focus focus-visible:ring-offset-2 focus-visible:ring-offset-app disabled:cursor-not-allowed disabled:opacity-70"
                  type="button"
                >
                  {folder ? "change" : "choose"}
                </button>
              )}
            />
          </div>
        )}
        <div className="flex flex-wrap gap-3">
          <Button variant="primary" disabled={busy} onClick={() => create.mutate()}>
            {create.isPending
              ? "getting link…"
              : manifestUrl
                ? "get a new link"
                : "get add-on link"}
          </Button>
        </div>
        {create.error ? <StremioErrorAlert error={create.error} /> : null}
      </div>
      <p role="status" className="text-fg-2 text-sm empty:hidden">
        {notice}
      </p>
      {manifestUrl ? (
        <article className="flex min-w-0 flex-col gap-3 rounded border border-border-strong bg-surface p-4">
          <h2 className="font-serif text-xl">2. Install chill</h2>
          <div className="flex flex-wrap gap-3">
            <Button
              render={<a href={stremioInstallURL(manifestUrl)} />}
              nativeButton={false}
              role="link"
              variant="primary"
            >
              install chill
            </Button>
            <Button onClick={() => void copy(manifestUrl)}>copy link</Button>
            <Button variant="ghost" aria-pressed={revealed} onClick={() => setRevealed(!revealed)}>
              {revealed ? "hide link" : "show link"}
            </Button>
          </div>
          <label className="flex min-w-0 flex-col gap-1 text-sm text-fg-3">
            Add-on link
            <input
              ref={linkInput}
              readOnly
              value={revealed ? manifestUrl : maskedStremioManifestURL()}
              className="w-full rounded border border-border-faint bg-surface-2 p-2 text-fg-2"
              onFocus={(event) => {
                if (revealed) event.currentTarget.select();
              }}
            />
          </label>
          <p className="text-fg-3 text-sm">
            On Stremio Web or another device, paste the link into Stremio’s add-on search.
          </p>
          <p className="text-fg-3 text-sm">
            This link is shown once. Get a new link to install chill on another device.{" "}
            {privacyNote}
          </p>
        </article>
      ) : null}
      <div className="flex flex-col items-start gap-3">
        <h2 className="font-serif text-xl">Disconnect</h2>
        <p className="text-fg-3 text-sm">{disconnectEffect}</p>
        <Button
          disabled={busy}
          onClick={() => {
            disconnect.reset();
            setConfirmingDisconnect(true);
          }}
        >
          disconnect Stremio
        </Button>
      </div>
      <ResponsiveModal
        open={confirmingDisconnect}
        onOpenChange={(open) => {
          if (!open && !disconnect.isPending) setConfirmingDisconnect(false);
        }}
        title="Disconnect Stremio?"
        description={disconnectEffect}
        desktopContentClassName="top-1/2 left-1/2 w-[min(92vw,448px)] -translate-x-1/2 -translate-y-1/2 rounded-xl border border-border-strong bg-surface p-6 shadow-modal"
        drawerContentClassName="bg-surface p-6"
      >
        <div className="flex flex-col gap-4">
          <h2 className="font-serif text-2xl">Disconnect Stremio?</h2>
          <p>{disconnectEffect}</p>
          {disconnect.error ? <StremioErrorAlert error={disconnect.error} /> : null}
          <div className="flex justify-end gap-3">
            <Button disabled={disconnect.isPending} onClick={() => setConfirmingDisconnect(false)}>
              cancel
            </Button>
            <Button
              variant="primary"
              disabled={disconnect.isPending}
              onClick={() => disconnect.mutate()}
            >
              {disconnect.isPending ? "disconnecting…" : "disconnect"}
            </Button>
          </div>
        </div>
      </ResponsiveModal>
    </section>
  );
}

export function AuthenticatedStremioSetup() {
  const { authToken } = useAuth();
  return authToken ? <StremioSetup key={authToken} token={authToken} /> : null;
}

function StremioErrorAlert({ error }: { error: unknown }) {
  const getPutioStartURL = useGetPutioStartURL();
  if (!(error instanceof StremioError)) return <UserErrorAlert error={error} />;
  return (
    <Alert variant="destructive">
      <AlertCircle />
      <AlertTitle>{error.message}</AlertTitle>
      {error.kind === "folder-missing" ? (
        <AlertDescription>Choose a download folder above, then get your link.</AlertDescription>
      ) : null}
      {error.kind === "unauthenticated" ? (
        <div className="col-start-2 mt-2 flex flex-wrap gap-2">
          <Button
            size="sm"
            onClick={() => window.location.assign(prepareSignInAgainURL(getPutioStartURL))}
          >
            <LogIn />
            sign in again
          </Button>
        </div>
      ) : null}
    </Alert>
  );
}
