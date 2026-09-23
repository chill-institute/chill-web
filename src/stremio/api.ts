import * as v from "valibot";
import { getPublicAPIBaseURL, getPublicStremioBaseURL } from "@/lib/env";

export type StremioErrorKind =
  | "folder-missing"
  | "unavailable"
  | "unauthenticated"
  | "network"
  | "failed";

const errorMessages: Record<StremioErrorKind, string> = {
  "folder-missing": "Pick a download folder first.",
  unavailable: "The Stremio add-on isn't available yet. Please try again later.",
  unauthenticated: "Session expired. Please sign in again.",
  network: "Couldn't reach chill.institute. Check your connection and try again.",
  failed: "Couldn't update your Stremio add-on. Please try again.",
};

export class StremioError extends Error {
  readonly kind: StremioErrorKind;

  constructor(kind: StremioErrorKind, options?: ErrorOptions) {
    super(errorMessages[kind], options);
    this.name = "StremioError";
    this.kind = kind;
  }
}

const credentialPattern = /^[A-Za-z0-9_~-][A-Za-z0-9._~-]{0,4095}$/;
const manifestPathPattern = /^\/s\/([^/]+)\/manifest\.json$/;

export function isStremioManifestURL(value: string) {
  const url = URL.parse(value);
  if (!url) return false;
  const credential = manifestPathPattern.exec(url.pathname)?.[1];
  return (
    url.origin === getPublicStremioBaseURL() &&
    !url.username &&
    !url.password &&
    !url.search &&
    !url.hash &&
    credential !== undefined &&
    credentialPattern.test(credential)
  );
}

function stremioManifestURL(credential: string) {
  const url = `${getPublicStremioBaseURL()}/s/${credential}/manifest.json`;
  if (!isStremioManifestURL(url)) throw new StremioError("failed");
  return url;
}

export function maskedStremioManifestURL() {
  return `${new URL(getPublicStremioBaseURL()).host}/s/••••/manifest.json`;
}

export function stremioInstallURL(manifestUrl: string) {
  return manifestUrl.replace(/^https?:\/\//, "stremio://");
}

const errorBodySchema = v.object({ code: v.string() });

async function errorKind(response: Response): Promise<StremioErrorKind> {
  if (response.status === 401) return "unauthenticated";
  if (response.status === 503) return "unavailable";
  const body = v.safeParse(errorBodySchema, await response.json().catch(() => null));
  if (response.status === 409 && body.success && body.output.code === "download_folder_missing") {
    return "folder-missing";
  }
  return "failed";
}

async function engineRequest(token: string, path: string, body?: object) {
  let response: Response;
  try {
    response = await fetch(`${getPublicAPIBaseURL()}/stremio/${path}`, {
      method: "POST",
      signal: AbortSignal.timeout(10_000),
      headers: {
        Authorization: `Bearer ${token}`,
        ...(body ? { "Content-Type": "application/json" } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
      credentials: "omit",
      redirect: "error",
      cache: "no-store",
    });
  } catch (cause) {
    throw new StremioError("network", { cause });
  }
  if (!response.ok) throw new StremioError(await errorKind(response));
  return response;
}

const credentialResponseSchema = v.object({ credential: v.string() });

export async function createStremioLink(token: string, folderId?: bigint) {
  const response = await engineRequest(
    token,
    "credential",
    folderId === undefined ? {} : { folder_id: folderId.toString() },
  );
  const payload = v.safeParse(credentialResponseSchema, await response.json().catch(() => null));
  if (!payload.success) throw new StremioError("failed");
  return stremioManifestURL(payload.output.credential);
}

export async function disconnectStremio(token: string) {
  await engineRequest(token, "disconnect");
}
