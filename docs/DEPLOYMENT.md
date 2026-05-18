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

## Observability

Better Stack monitors the production web roots:

- `chill-web-production-root` checks `https://chill.institute/`
- `binge-web-production-root` checks `https://binge.institute/`

Both monitors use HTTPS status checks on a 3 minute cadence. API and subsystem health monitors live with the engine runtime docs.

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
- SST uses `home: "local"` for staging state so deploys do not require Cloudflare R2 billing; GitHub Actions restores and saves the SST local state directory through an encrypted state blob in the private `chill-institute/chill-web-sst-state` repo
- the `Deploy Staging` workflow is serialized with the `web-deploy-staging` concurrency group, and within a run the SST deploy order is `zones` -> `chill` -> `binge` so each deploy sees the encrypted state saved by the previous deploy
- before each app deploy, the workflow removes exact-match legacy `A`, `AAAA`, and `CNAME` DNS records for that staging hostname so Cloudflare can attach the Worker custom domain
- after each app deploy, the workflow verifies the matching public staging hostname with a retried HTTPS request
- required staging GitHub Environment secret: `CLOUDFLARE_API_TOKEN`
- required staging GitHub Environment secret: `SST_STATE_AGE_IDENTITY`
- required staging GitHub Environment secret: `SST_STATE_REPO_TOKEN`
- required staging GitHub Environment variable: `CLOUDFLARE_DEFAULT_ACCOUNT_ID`

Staging SST state repository:

- repo: `chill-institute/chill-web-sst-state`
- blob path: `chill-web/staging/sst-local-state.tar.gz.age`
- encryption recipient: `SST_STATE_AGE_RECIPIENT` in `.github/workflows/deploy-staging.yml`
- write identity: `SST_STATE_REPO_TOKEN`, scoped to Contents read/write on `chill-institute/chill-web-sst-state`
- first deploy only: run `Deploy Staging` with `bootstrap_state=true`; later deploys fail closed when the encrypted state blob is missing

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
