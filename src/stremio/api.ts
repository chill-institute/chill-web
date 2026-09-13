import * as v from "valibot";
import { Code, ConnectError } from "@connectrpc/connect";
import { getPublicStremioBaseURL } from "@/lib/env";

const installationSchema = v.object({
  id: v.pipe(v.string(), v.regex(/^[a-zA-Z0-9_-]{1,128}$/)),
  folderId: v.pipe(v.string(), v.regex(/^(0|[1-9][0-9]{0,18})$/)),
  createdAt: v.pipe(v.number(), v.integer(), v.minValue(0)),
  manifestUrl: v.string(),
});
export type Installation = v.InferOutput<typeof installationSchema>;

function validateInstallation(value: unknown): Installation {
  const result = v.safeParse(installationSchema, value);
  if (!result.success) throw new Error("Invalid add-on response");
  const url = URL.parse(result.output.manifestUrl);
  if (!url) throw new Error("Invalid add-on installation link");
  const base = new URL(getPublicStremioBaseURL());
  if (
    url.origin !== base.origin ||
    url.username ||
    url.password ||
    url.search ||
    url.hash ||
    !url.pathname.endsWith("/manifest.json")
  ) {
    throw new Error("Invalid add-on installation link");
  }
  return result.output;
}

export async function installationRequest(
  token: string,
  path: string,
  method: string,
  signal?: AbortSignal,
  body?: object,
) {
  const response = await fetch(`${getPublicStremioBaseURL()}/api/installations${path}`, {
    method,
    signal: signal
      ? AbortSignal.any([signal, AbortSignal.timeout(10_000)])
      : AbortSignal.timeout(10_000),
    headers: {
      Authorization: `Bearer ${token}`,
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
    credentials: "omit",
    redirect: "error",
    cache: "no-store",
  });
  if (response.status === 401)
    throw new ConnectError("Sign in again to manage your add-on", Code.Unauthenticated);
  if (!response.ok) throw new Error("Couldn't update your Stremio add-on. Please try again.");
  return response;
}

export async function listInstallations(token: string, signal?: AbortSignal) {
  const response = await installationRequest(token, "", "GET", signal);
  const payload: unknown = await response.json();
  const result = v.safeParse(v.object({ installations: v.array(v.unknown()) }), payload);
  if (!result.success) throw new Error("Invalid add-on response");
  return result.output.installations.map(validateInstallation);
}

export async function createInstallation(token: string, folderId: string) {
  const response = await installationRequest(token, "", "POST", undefined, { folderId });
  return validateInstallation(await response.json());
}

export async function revokeInstallation(token: string, id: string) {
  await installationRequest(token, `/${encodeURIComponent(id)}`, "DELETE");
}

export function stremioInstallURL(manifestUrl: string) {
  return manifestUrl.replace(/^https?:\/\//, "stremio://");
}
