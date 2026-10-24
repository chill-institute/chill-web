# Architecture

`chill-web` is a client-rendered React app. TanStack Router routes call
TanStack Query hooks, which reach the hosted v4 API through a Connect client
typed by `@chill-institute/contracts`. The API owns product behavior; this repo
owns browser state, requests, and rendering.

## Ownership

| Path                         | Owns                                                   |
| ---------------------------- | ------------------------------------------------------ |
| `src/api/`                   | Connect transport, API helpers, defaults, timeouts     |
| `src/auth/`                  | Tokens, API context, auth routes and route options     |
| `src/catalog/`               | Movie and TV queries, routes, modals, sort             |
| `src/binges/`                | Curated binge queries, home section, picker, editor    |
| `src/queries/`, `src/hooks/` | Search and settings queries and hooks                  |
| `src/lib/`                   | Environment, crash reporting, PWA updates, search data |
| `src/workers/`               | Static-asset Worker, headers, redirects                |
| `src/ui/`                    | Tokens, primitives, pure hooks; no auth or API imports |
| `src/components/`            | App shell, search, settings, shared UI                 |

## Requests

The transport sends requests to `/v4` as client `web`, with the deploy version
in `X-Chill-Client-Version`. Hosted data is untrusted; timeouts, auth failures,
and errors render as explicit UI states. `/auth/*` also serves the chilly-token
page for the CLI, MCP, and scripts. Build variables: [`src/env.d.ts`](../src/env.d.ts); origin defaults:
[`src/lib/env.ts`](../src/lib/env.ts). Sentry runs only with a public DSN and
environment; filters live in [`src/lib/sentry.ts`](../src/lib/sentry.ts).

## Catalog sort

One saved `UserSettings.catalog.sort` covers movies, TV, and every provider; a
`sort` search param overrides it for that URL. Values and ties live in
[`src/catalog/lib/sort.ts`](../src/catalog/lib/sort.ts).

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
