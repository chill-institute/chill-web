import { getPublicAPIBaseURL } from "@/lib/env";

const RESOLVE_TIMEOUT_MS = 6000;

// An API /download link may redirect to a magnet, which put.io cannot follow
// from a pasted link. Ask the API for the magnet instead; any other link,
// result, or failure copies the link unchanged.
export async function resolveCopyLink(
  link: string,
  fetchImpl: typeof fetch = fetch,
  timeoutMs = RESOLVE_TIMEOUT_MS,
) {
  let url: URL;
  try {
    url = new URL(link);
  } catch {
    return link;
  }
  if (
    url.origin !== new URL(getPublicAPIBaseURL()).origin ||
    !url.pathname.startsWith("/download/")
  ) {
    return link;
  }

  try {
    const response = await fetchImpl(url, {
      credentials: "omit",
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (!response.ok) return link;
    const payload: unknown = await response.json();
    const magnet =
      typeof payload === "object" && payload !== null && "magnet" in payload
        ? payload.magnet
        : undefined;
    return typeof magnet === "string" && magnet.toLowerCase().startsWith("magnet:") ? magnet : link;
  } catch {
    return link;
  }
}
