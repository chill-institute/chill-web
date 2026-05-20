# Deployment

Public deployment overview for `chill-web`

## Hosting

`chill-web` builds one root React SPA and serves it from SST-managed Cloudflare Workers static assets:

- `https://chill.institute` for search, movies, and TV shows
- `https://www.chill.institute` redirects to `https://chill.institute`
- `https://binge.institute` redirects to `https://chill.institute`

The app calls the shared API at `https://api.chill.institute` unless `VITE_PUBLIC_API_BASE_URL` is set for a local override.

Build output:

- `dist/`

## Routing

- the root app owns `chill.institute` and `staging.chill.institute`
- `www.chill.institute` redirects to `chill.institute`
- `binge.institute` and `www.binge.institute` redirect to `chill.institute`
- there is no staging binge host
- `/auth/success` stays on the app host so the browser can finish the auth callback
- RSS and download links should use the API host directly

## GitHub Actions

- Pull requests run `Verify`
- `Verify` runs root app checks
- Pushes to `main` run `Main`
- `Main` verifies, runs e2e, deploys the production web surface, and deploys the production redirect worker
- Manual deploy workflows are maintainer-only fallbacks for staging, production web, or production redirect reruns
- PRs do not create public preview deployments

## Verification

After a hosted web change, verify:

- `https://chill.institute/`
- `https://www.chill.institute/`
- `https://binge.institute/`
- `https://www.binge.institute/`
- `www.chill.institute` redirects to `https://chill.institute/`
- both binge URLs redirect to `https://chill.institute/`
- one real app load in the SPA
- one real auth redirect start URL

Maintainer-only operational details are intentionally outside the scope of this public document.
