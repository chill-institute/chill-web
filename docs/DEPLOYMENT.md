# Deployment

Public deployment overview for `chill-web`

## Hosting

`chill-web` builds one root React SPA and serves it from SST-managed Cloudflare Workers static assets:

- app: `chill.institute`, `staging.chill.institute`
- redirects to `chill.institute`: `www.chill.institute`, `binge.institute`, `www.binge.institute`

The app calls the shared API at `https://api.chill.institute` unless `VITE_PUBLIC_API_BASE_URL` is set for a local override

Browser crash reporting is enabled only when `VITE_PUBLIC_SENTRY_DSN` is set at
build time. Production and staging deploy jobs pass the public DSN through GitHub
environment variables and stamp `VITE_PUBLIC_SENTRY_ENVIRONMENT` accordingly.
Deploy builds upload hidden source maps when the GitHub environment provides
`SENTRY_AUTH_TOKEN` as a secret plus `SENTRY_ORG` and `SENTRY_PROJECT` as
variables. Uploaded source maps are deleted from `dist/` before deployment.

Build output:

- `dist/`
- `/assets/*` responses are fingerprinted build artifacts. They are served with
  immutable browser caching, and the static-asset worker converts SPA HTML
  fallbacks on `/assets/*` into real `404` responses so stale chunk URLs trigger
  one guarded runtime recovery reload instead of loading `index.html` as
  JavaScript. The failed import remains rejected so route loaders cannot receive
  an undefined module, and the reload guard clears only after every route match
  resolves successfully.
- The service worker precaches the app shell and generated assets. New service
  workers auto-activate and reload controlled clients when deployed so users do
  not stay pinned to an old app shell. Public fonts, social images, docs imagery,
  test fixtures, icons, and seasonal logos stay out of the install cache.

## Routing

- there is no staging binge host
- `/auth/success` stays on the app host so the browser can finish the auth callback
- RSS and download links should use the API host directly

## GitHub Actions

- Pull requests run `Verify`
- `Verify` runs root app checks and functional e2e
- Pushes to `main` run `Main`
- `Main` verifies, runs functional e2e, builds and deploys the production web surface, and deploys the production redirect worker
- Manual deploy workflows are maintainer-only fallbacks for staging, production app, or production redirect reruns
- App deploy jobs call the shared `Build and Deploy App` action for bundle build, Sentry source maps, SST state restore/save, and SST app deploy
- PRs do not create public preview deployments
- Live host monitoring and rollback are maintainer-operated outside GitHub Actions

## Verification

After a hosted web change, external monitoring should cover:

- `https://chill.institute/`
- one redirect host
- one real app load in the SPA
- one real auth redirect start URL

Maintainer-only operational details are intentionally outside the scope of this public document.
