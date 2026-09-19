import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Code, ConnectError } from "@connectrpc/connect";
import { useGetPutioStartURL } from "@/auth/api-context";
import { prepareSignInAgainURL } from "@/auth/auth";
import { useAuth } from "@/auth/auth";
import { UserErrorAlert } from "@/auth/components/user-error-alert";
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
  const [revoking, setRevoking] = useState<Installation | null>(null);
  const [notice, setNotice] = useState("");
  const installations = useQuery({
    queryKey: installationKey,
    queryFn: ({ signal }) => listInstallations(token, signal),
    retry: false,
    gcTime: 0,
  });
  const create = useMutation({
    mutationFn: () => createInstallation(token),
    onSuccess: (installation) => {
      queryClient.setQueryData<Installation[]>(installationKey, (current) => [
        ...(current ?? []),
        installation,
      ]);
      setNotice("Account connected. Install chill in Stremio or copy the link.");
    },
  });
  const revoke = useMutation({
    mutationFn: (id: string) => revokeInstallation(token, id),
    onSuccess: (_, id) => {
      queryClient.setQueryData<Installation[]>(installationKey, (current) =>
        current?.filter((item) => item.id !== id),
      );
      setRevoking(null);
      setNotice("Connection revoked. The link no longer works; remove chill from Stremio.");
    },
  });
  const copy = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      setNotice(
        "Link copied. Keep it private: it can play your library and download to your put.io account.",
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
          Browse, pick releases, download to put.io and play, all inside Stremio.
        </p>
        <p role="note" className="text-fg-3 text-sm">
          Early access. Things will break. If playback stalls, refresh the sources or restart
          Stremio.
        </p>
      </div>
      <div className="flex flex-col gap-3 border-y border-border-faint py-4">
        <h2 className="font-serif text-xl">1. Connect account</h2>
        <p className="text-fg-3 text-sm">
          Browse videos across your put.io library, including subfolders.
        </p>
        <div className="flex flex-wrap gap-3">
          <Button
            variant="primary"
            disabled={!installations.isSuccess || create.isPending || revoke.isPending}
            onClick={() => create.mutate()}
          >
            {create.isPending ? "connecting…" : "connect account"}
          </Button>
        </div>
        {create.error ? <InstallationError error={create.error} /> : null}
      </div>
      <p role="status" className="text-fg-2 text-sm">
        {notice}
      </p>
      <div className="flex flex-col gap-4" aria-busy={installations.isPending}>
        <h2 className="font-serif text-xl">2. Install chill</h2>
        {installations.isPending ? <p>Loading connections…</p> : null}
        {installations.error ? (
          <>
            <InstallationError error={installations.error} />
            <Button onClick={() => void installations.refetch()}>retry</Button>
          </>
        ) : null}
        {installations.data?.length === 0 ? (
          <p className="text-fg-3">Connect your account to get a private installation link.</p>
        ) : null}
        {!installations.isError &&
          installations.data?.map((installation) => (
            <article
              key={installation.id}
              className="flex min-w-0 flex-col gap-3 rounded border border-border-strong bg-surface p-4"
            >
              <h3 className="font-serif text-lg">
                {installation.folderId === "0"
                  ? "Your put.io library"
                  : `Folder ${installation.folderId}`}
              </h3>
              <p className="text-fg-3 text-sm">
                Connected {new Date(installation.createdAt).toLocaleDateString()}
              </p>
              <div className="flex flex-wrap gap-3">
                <Button
                  render={<a href={stremioInstallURL(installation.manifestUrl)} />}
                  nativeButton={false}
                  role="link"
                >
                  install chill
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
              <p className="text-fg-3 text-sm">
                On Stremio Web or another device, paste the link into Stremio’s add-on search.
              </p>
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
                Keep this link private: anyone with it can play your library and download to your
                put.io account. Revoking stops new requests; transfers and playback links already
                issued keep working.
              </p>
            </article>
          ))}
      </div>
      <ResponsiveModal
        open={revoking !== null}
        onOpenChange={(open) => {
          if (!open && !revoke.isPending) setRevoking(null);
        }}
        title="Revoke this connection?"
        description="The link stops working. Transfers and playback links already issued keep going."
        desktopContentClassName="top-1/2 left-1/2 w-[min(92vw,448px)] -translate-x-1/2 -translate-y-1/2 rounded-xl border border-border-strong bg-surface p-6 shadow-modal"
        drawerContentClassName="bg-surface p-6"
      >
        <div className="flex flex-col gap-4">
          <h2 className="font-serif text-2xl">Revoke this connection?</h2>
          <p>
            Its installation link will stop working. Transfers already started and playback links
            already issued may continue.
          </p>
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
              {revoke.isPending ? "revoking…" : "revoke connection"}
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

function InstallationError({ error }: { error: unknown }) {
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
