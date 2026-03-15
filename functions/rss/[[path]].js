import { resolveHostedAPIBaseURL } from "../_lib/api-origin.js";

export function onRequest({ request }) {
  const url = new URL(request.url);
  const apiOrigin = resolveHostedAPIBaseURL(url.hostname);
  const target = new URL(`${url.pathname}${url.search}`, apiOrigin);

  return Response.redirect(target.toString(), 308);
}
