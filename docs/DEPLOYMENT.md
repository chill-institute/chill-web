# Deployment

Deployment model for `chill-web`

## Hosting Shape

Production shape:

- static assets on Cloudflare Pages
- API on `https://api.chill.institute`

Staging web deploys to SST-managed Cloudflare Workers static assets. The staging API remains on `https://staging-api.chill.institute`

Build output:

- `apps/chill/dist/`
- `apps/binge/dist/`

## Hostname Plan

- chill app: `https://chill.institute`
- binge app: `https://binge.institute`
- API: `https://api.chill.institute`

Hosted environments resolve the API like this:

- `apps/chill`: `localhost`, `chill.institute`, `www.chill.institute`, `staging.chill.institute`, and `*.chill-institute.pages.dev` -> `https://api.chill.institute` or `https://staging-api.chill.institute` for staging
- `apps/binge`: `localhost`, `binge.institute`, `www.binge.institute`, `staging.binge.institute`, and `*.binge-institute.pages.dev` -> `https://api.chill.institute` or `https://staging-api.chill.institute` for staging

## Public Endpoints

Authenticated app traffic should call `https://api.chill.institute` directly.

Public RSS and download URLs should also use `https://api.chill.institute` directly.

Keep `/auth/success` on the app host.

## Verification

After a hosted web change, verify:

- `https://chill.institute/`
- `https://binge.institute/`
- one real app load in each SPA
- one real auth redirect start URL

## GitHub Actions

Workflow shape:

- pull requests run `Verify`
- `Verify` detects whether `chill`, `binge`, or shared workspace surfaces changed and only runs the affected app jobs
- shared workspace changes such as `packages/*`, `tools/*`, and root build config fan out to both apps
- PRs verify and run e2e only; they do not create public preview deploys
- `Deploy Staging` is a manual workflow that must be run from `main` and promotes built artifacts from a validated same-repo branch or commit SHA to the `staging` GitHub Environment after approval; its secret-bearing SST deploy jobs use trusted `main` deploy code, and its `app` input accepts `chill` or `binge` for branch artifact deploys while `all` and `zones` must use `main`
- pushes to `main` run `Main`
- `Main` runs the same selective checks, then deploys only the affected production app surfaces
- `Deploy` remains available as a manual production deploy fallback for current `main` only and accepts `all`, `chill`, or `binge`

Staging deploys are app-specific SST deployments:

- `apps/chill/dist/` deploys to `https://staging.chill.institute`
- `apps/binge/dist/` deploys to `https://staging.binge.institute`
- `CHILL_WEB_APP=zones` manages shared Cloudflare zone settings through the separate `chill-web-zones` SST app and the `staging` SST stage
- required staging GitHub Environment secret: `CLOUDFLARE_API_TOKEN`
- required staging GitHub Environment variable: `CLOUDFLARE_DEFAULT_ACCOUNT_ID`

SST-managed zone settings:

- `always_use_https = on` for `chill.institute` and `binge.institute`
- `automatic_https_rewrites = on` for `chill.institute` and `binge.institute`

Production deploys are still app-specific Cloudflare Pages deploys:

- `apps/chill/dist/` deploys to the Cloudflare Pages project `chill-institute`
- `apps/binge/dist/` deploys to the Cloudflare Pages project `binge-institute`
- after the SST production migration, `www.chill.institute` redirects to `chill.institute`
- after the SST production migration, `www.binge.institute` redirects to `binge.institute`

GitHub-owned deploy configuration:

- Cloudflare Pages project: `chill-institute`
- Cloudflare Pages default domain: `chill-institute.pages.dev`
- Cloudflare Pages project: `binge-institute`
- Cloudflare Pages default domain: `binge-institute.pages.dev`
- required GitHub secret: `CLOUDFLARE_API_TOKEN`
- required GitHub variable: `CLOUDFLARE_ACCOUNT_ID`

Operator follow-up:

- disable direct Cloudflare Pages Git integration for this repo so GitHub Actions is the only production deploy path
- disable the local Mac web staging services after SST staging is confirmed

Keep browser-side API resolution app-local in `apps/*/src/lib/env.ts`
