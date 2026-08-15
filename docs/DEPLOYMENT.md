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

App deploys stamp two independent build identifiers. `VITE_PUBLIC_VERSION` is
`0.0.<first-parent-commit-count>`, a reproducible and monotonically increasing
version on `main` used by backend product analytics and displayed in settings.
`VITE_PUBLIC_RELEASE` remains the short commit SHA used by Sentry and linked from
the settings footer. Deploy checkouts fetch full history so a commit produces the
same version in automatic, manual, production, and staging deployments.

Build output:

- `dist/`
- `/assets/*` responses are fingerprinted build artifacts. They are served with
  immutable browser caching, and the static-asset worker converts SPA HTML
  fallbacks on `/assets/*` into real `404` responses instead of loading
  `index.html` as JavaScript. TanStack Router owns normal split-route recovery: a
  missing route module gets one guarded full-page reload, and a persistent failure
  reaches the app error screen. A URL-guarded Vite fallback provides the same
  one-shot recovery when browser session storage is unavailable. Errors caught
  after that fallback schedules page replacement are not reported as crashes;
  terminal failures after the guarded retry remain reportable. Route-owned detail
  modals ship in their route chunks so they do not add a second unguarded lazy-import
  boundary. Terminal module-load crash reports carry bounded recovery
  strategy and attempt tags without duplicating the failed asset URL into tags.
- The service worker precaches the app shell and generated assets. New service
  workers wait while existing tabs continue with their current app shell and
  cache. The app prompts when an update is ready; accepting activates the worker
  and reloads the page, while deferring leaves the current version running.
  Public fonts, social images, docs imagery, test fixtures, icons, and seasonal
  logos stay out of the install cache.
- Cloudflare asset-first responses receive `X-Content-Type-Options`,
  `Referrer-Policy`, `X-Frame-Options`, and a conservative `Permissions-Policy`
  from `public/_headers`. The static-asset Worker applies the same HTML policy to
  responses that reach Worker code and separately hardens fingerprinted assets
  and missing asset paths. Content Security Policy and HSTS are separate
  deployment concerns because they must account for the inline theme bootstrap,
  API and Sentry origins, PWA behavior, and sibling subdomains.

## Routing

- `/auth/success` stays on the app host so the browser can finish the auth callback
- RSS and download links should use the API host directly

## GitHub Actions

- Pull requests run `Verify`
- `Verify` runs root app checks and functional e2e
- Pushes to `main` run `Main`
- `Main` verifies, then builds one production app artifact, runs functional e2e
  against that artifact, and deploys those exact files after checksum validation
- Manual deploy workflows are maintainer-only fallbacks for staging, production app, or production redirect reruns
- The shared app deploy workflow uploads Sentry source maps during the single
  build, removes them from `dist/`, records a SHA-256 manifest, and passes the
  tested artifact to the SST deployment job without rebuilding
- Redirect and zone deploys remain separate because they do not publish the app bundle
- Live host monitoring and rollback are maintainer-operated outside GitHub Actions

## Verification

After a hosted web change, external monitoring should cover:

- `https://chill.institute/`
- one redirect host
- one real app load in the SPA
- one real auth redirect start URL
