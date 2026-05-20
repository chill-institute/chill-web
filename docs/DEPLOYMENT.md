# Deployment

Public deployment overview for `chill-web`

## Hosting

`chill-web` builds one root React SPA and serves it from SST-managed Cloudflare Workers static assets:

- app: `chill.institute`
- redirects to `chill.institute`: `www.chill.institute`, `next.chill.institute`, `binge.institute`, `www.binge.institute`, `next.binge.institute`

The app calls the shared API at `https://api.chill.institute` unless `VITE_PUBLIC_API_BASE_URL` is set for a local override.

Build output:

- `dist/`

## Routing

- `/auth/success` stays on the app host so the browser can finish the auth callback
- RSS and download links should use the API host directly

## GitHub Actions

- Pull requests run `Verify`
- `Verify` runs root app checks
- Pushes to `main` run `Main`
- `Main` verifies, runs e2e, deploys the production web surface, and deploys the production redirect worker
- Manual deploy workflows are maintainer-only fallbacks for production app or production redirect reruns
- PRs do not create public preview deployments

## Verification

After a hosted web change, verify:

- `https://chill.institute/`
- `https://next.chill.institute/`
- `https://next.binge.institute/`
- one real app load in the SPA
- one real auth redirect start URL

Maintainer-only operational details are intentionally outside the scope of this public document.
