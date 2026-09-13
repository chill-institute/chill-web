import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Code, ConnectError } from "@connectrpc/connect";
import { useGetPutioStartURL } from "@/auth/api-context";
import { prepareSignInAgainURL } from "@/auth/auth";
import { useApi } from "@/auth/api-context";
import { useAuth } from "@/auth/auth";
import { DownloadFolderPicker } from "@/auth/components/download-folder-picker";
import { UserErrorAlert } from "@/auth/components/user-error-alert";
import { folderQueryOptions } from "@/auth/queries/options";
import { Button } from "@/ui/components/ui/button";
import { ResponsiveModal } from "@/ui/components/responsive-modal";
import {
  createInstallation,
  listInstallations,
  revokeInstallation,
  stremioInstallURL,
  type Installation,
} from "./api";

const installationKey = ["stremio-installations"] as const;

function StremioSetup({ token }: { token: string }) {
  const queryClient = useQueryClient();
  const api = useApi();
  const [folderId, setFolderId] = useState(0n);
  const [revoking, setRevoking] = useState<Installation | null>(null);
  const [notice, setNotice] = useState("");
  const folder = useQuery(folderQueryOptions(api, folderId));
  const installations = useQuery({
    queryKey: installationKey,
    queryFn: ({ signal }) => listInstallations(token, signal),
    retry: false,
    gcTime: 0,
  });
  const create = useMutation({
    mutationFn: () => createInstallation(token, String(folderId)),
    onSuccess: (installation) => {
      queryClient.setQueryData<Installation[]>(installationKey, (current) => [
        ...(current ?? []),
        installation,
      ]);
      setNotice("Your add-on is ready. Install it in Stremio or copy the link.");
    },
  });
  const revoke = useMutation({
    mutationFn: (id: string) => revokeInstallation(token, id),
    onSuccess: (_, id) => {
      queryClient.setQueryData<Installation[]>(installationKey, (current) =>
        current?.filter((item) => item.id !== id),
      );
      setRevoking(null);
      setNotice("Add-on revoked. Remove it from Stremio; its link no longer works.");
    },
  });
  const copy = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      setNotice(
        "Installation link copied. Keep it private: anyone with it can browse your add-on’s library, discovery and acquired videos, and play available files.",
      );
    } catch {
      setNotice("Couldn't copy the link. Select the installation link below and copy it manually.");
    }
  };
  return (
    <section data-page="stremio" className="mx-auto flex max-w-xl flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h1 className="font-serif text-3xl">Watch with Stremio</h1>
        <p className="text-fg-2">
          Choose a put.io folder, then install your private chill.institute add-on in Stremio.
        </p>
        <p className="text-fg-3 text-sm">
          Browse your folder, discover Movies and Series, or search Releases in Stremio. Choose a
          release, then confirm on chill.institute before it is sent to put.io.
        </p>
      </div>
      <div className="flex flex-col gap-3 border-y border-border-faint py-4">
        <h2 className="font-serif text-xl">Your folder</h2>
        {folder.error ? <InstallationError error={folder.error} /> : null}
        <p aria-live="polite">
          {folder.isPending
            ? "Loading folder…"
            : folder.data?.parent?.name || (folderId === 0n ? "Your Files" : `Folder ${folderId}`)}
        </p>
        <div className="flex flex-wrap gap-3">
          <DownloadFolderPicker
            triggerLabel="choose folder"
            purpose="Stremio folder"
            initialFolder={folder.data?.parent}
            onSave={(id) => {
              setFolderId(id);
              create.reset();
            }}
          />
          <Button
            variant="primary"
            disabled={
              !folder.isSuccess || !installations.isSuccess || create.isPending || revoke.isPending
            }
            onClick={() => create.mutate()}
          >
            {create.isPending ? "creating…" : "create add-on"}
          </Button>
        </div>
        {create.error ? <InstallationError error={create.error} /> : null}
      </div>
      <p role="status" className="text-fg-2 text-sm">
        {notice}
      </p>
      <div className="flex flex-col gap-4" aria-busy={installations.isPending}>
        <h2 className="font-serif text-xl">Your add-ons</h2>
        {installations.isPending ? <p>Loading add-ons…</p> : null}
        {installations.error ? (
          <>
            <InstallationError error={installations.error} />
            <Button onClick={() => void installations.refetch()}>retry</Button>
          </>
        ) : null}
        {installations.data?.length === 0 ? <p className="text-fg-3">No add-ons yet.</p> : null}
        {!installations.isError &&
          installations.data?.map((installation) => (
            <article
              key={installation.id}
              className="flex min-w-0 flex-col gap-3 rounded border border-border-strong bg-surface p-4"
            >
              <h3 className="font-serif text-lg">
                {installation.folderId === "0" ? "Your Files" : `Folder ${installation.folderId}`}
              </h3>
              <p className="text-fg-3 text-sm">
                Created {new Date(installation.createdAt).toLocaleDateString()}
              </p>
              <div className="flex flex-wrap gap-3">
                <Button
                  render={<a href={stremioInstallURL(installation.manifestUrl)} />}
                  nativeButton={false}
                  role="link"
                >
                  install in Stremio
                </Button>
                <Button onClick={() => void copy(installation.manifestUrl)}>copy link</Button>
                <Button
                  variant="ghost"
                  disabled={revoke.isPending}
                  onClick={() => {
                    revoke.reset();
                    setRevoking(installation);
                  }}
                >
                  revoke
                </Button>
              </div>
              <label className="flex min-w-0 flex-col gap-1 text-sm text-fg-3">
                Private installation link
                <input
                  aria-label="Private installation link"
                  readOnly
                  value={installation.manifestUrl}
                  className="w-full rounded border border-border-faint bg-surface-2 p-2 text-fg-2"
                  onFocus={(event) => event.currentTarget.select()}
                />
              </label>
              <p className="text-fg-3 text-sm">
                Keep this link private. Anyone with it can browse this add-on’s library and
                discovery catalogs, and play library or acquired videos. Revoking stops new
                requests; a video already playing may continue.
              </p>
            </article>
          ))}
      </div>
      <ResponsiveModal
        open={revoking !== null}
        onOpenChange={(open) => {
          if (!open && !revoke.isPending) setRevoking(null);
        }}
        title="Revoke this add-on?"
        description="Its installation link will stop working. You can create a new add-on later."
        desktopContentClassName="top-1/2 left-1/2 w-[min(92vw,448px)] -translate-x-1/2 -translate-y-1/2 rounded-xl border border-border-strong bg-surface p-6 shadow-modal"
        drawerContentClassName="bg-surface p-6"
      >
        <div className="flex flex-col gap-4">
          <h2 className="font-serif text-2xl">Revoke this add-on?</h2>
          <p>Its installation link will stop working. You can create a new add-on later.</p>
          {revoke.error ? <InstallationError error={revoke.error} /> : null}
          <div className="flex justify-end gap-3">
            <Button disabled={revoke.isPending} onClick={() => setRevoking(null)}>
              cancel
            </Button>
            <Button
              disabled={revoke.isPending}
              onClick={() => {
                if (revoking) revoke.mutate(revoking.id);
              }}
            >
              {revoke.isPending ? "revoking…" : "revoke add-on"}
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

export function InstallationError({ error }: { error: unknown }) {
  const getPutioStartURL = useGetPutioStartURL();
  return (
    <div className="flex flex-col gap-2">
      <UserErrorAlert error={error} />
      {error instanceof ConnectError && error.code === Code.Unauthenticated ? (
        <Button onClick={() => window.location.assign(prepareSignInAgainURL(getPutioStartURL))}>
          sign in again
        </Button>
      ) : null}
    </div>
  );
}
