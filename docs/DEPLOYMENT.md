# Deployment

Public deployment overview for `chill-web`

## Hosting

`chill-web` builds two React SPAs and serves them from SST-managed Cloudflare Workers static assets:

- `https://chill.institute` for search
- `https://binge.institute` for browsing

Both apps call the shared API at `https://api.chill.institute`. Staging web hosts use the staging API at `https://staging-api.chill.institute`

Build output:

- `apps/chill/dist/`
- `apps/binge/dist/`

## Routing

- `apps/chill` owns `chill.institute`, `www.chill.institute`, and `staging.chill.institute`
- `apps/binge` owns `binge.institute`, `www.binge.institute`, and `staging.binge.institute`
- `/auth/success` stays on the app host so the browser can finish the auth callback
- RSS and download links should use the API host directly

## GitHub Actions

- Pull requests run `Verify`
- `Verify` detects whether `chill`, `binge`, or shared workspace surfaces changed and runs only the affected app jobs
- Pushes to `main` run `Main`
- `Main` verifies, runs e2e, and deploys only the affected production app surfaces
- Docs-only, workflow-only, script-only, and app e2e-only changes do not deploy app surfaces
- Manual deploy workflows are maintainer-only fallbacks for staging or production reruns
- PRs do not create public preview deployments

## Verification

After a hosted web change, verify:

- `https://chill.institute/`
- `https://www.chill.institute/`
- `https://binge.institute/`
- `https://www.binge.institute/`
- one real app load in each SPA
- one real auth redirect start URL

Maintainer-only operational details are intentionally outside the scope of this public document.
