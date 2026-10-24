# Architecture

`chill-web` is a client-rendered React app. TanStack Router routes call
TanStack Query hooks, which reach the hosted v4 API through a Connect client
typed by `@chill-institute/contracts`. The API owns product behavior; this repo
owns browser state, requests, and rendering.

## Ownership

The source tree groups API transport under [src/api](../src/api/), auth under
[src/auth](../src/auth/), catalog flows under [src/catalog](../src/catalog/), and curated binges under
[src/binges](../src/binges/).
[src/ui](../src/ui/) contains reusable UI and must not import auth or API code.

## Requests

The transport sends requests to `/v4` as client `web`, with the deploy version
in `X-Chill-Client-Version`. Hosted data is untrusted; timeouts, auth failures,
and errors render as explicit UI states. `/auth/*` also serves the chilly-token
page for the CLI, MCP, and scripts. Build variables: [`src/env.d.ts`](../src/env.d.ts); origin defaults:
[`src/lib/env.ts`](../src/lib/env.ts). Sentry runs only with a public DSN and
environment; filters live in [`src/lib/sentry.ts`](../src/lib/sentry.ts).

## Stremio setup

`/stremio` gets add-on links from the chill API, sending the token only in an
Authorization header ([`src/stremio/api.ts`](../src/stremio/api.ts)).

- A link keeps the download folder it was issued with.
- A new link appears once, masked; if copying fails it is revealed and selected.
- The link lives only in component state: never in storage, URLs, telemetry,
  screenshots, or support reports.
- Disconnect stops every link for the account and leaves web and CLI sessions
  signed in.

`VITE_PUBLIC_STREMIO_BASE_URL` must be HTTPS outside local development. Stremio
e2e and visual tests use fixtures, never real credentials.
