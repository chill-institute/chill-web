# Deployment

Deployment model for `chill-web`

## Hosting Shape

Production hosting shape:

- static assets on SST-managed Cloudflare Workers
- API on `https://api.chill.institute`

Staging also deploys to SST-managed Cloudflare Workers static assets. The staging API remains on `https://staging-api.chill.institute`

Build output:

- `apps/chill/dist/`
- `apps/binge/dist/`

## Hostname Plan

- chill app: `https://chill.institute`
- binge app: `https://binge.institute`
- API: `https://api.chill.institute`

Hosted environments resolve the API like this:

- `apps/chill`: `localhost` and `*.chill.institute` -> `https://api.chill.institute`, except `staging.chill.institute` -> `https://staging-api.chill.institute`
- `apps/binge`: `localhost` and `*.binge.institute` -> `https://api.chill.institute`, except `staging.binge.institute` -> `https://staging-api.chill.institute`

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

Both monitors use HTTPS status checks on a 3 minute cadence. Add staging root monitors for `https://staging.chill.institute/` and `https://staging.binge.institute/` when the SST staging migration is complete. API and subsystem health monitors live with the engine runtime docs.

## GitHub Actions

Workflow shape:

- pull requests run `Verify`
- `Verify` detects whether `chill`, `binge`, or shared workspace surfaces changed and only runs the affected app jobs
- shared workspace changes such as `packages/*`, `tools/*`, and root build config fan out to both apps
- PRs verify and run e2e only; they do not create public preview deploys
- `Deploy Staging` is a manual workflow that must be run from `main` and promotes built artifacts from a validated same-repo branch or commit SHA to the `staging` GitHub Environment after approval; its secret-bearing SST deploy jobs use trusted `main` deploy code, and its `app` input accepts `chill` or `binge` for branch artifact deploys while `all` and `zones` must use `main`
- pushes to `main` run `Main`
- `Main` runs the same selective checks, then deploys only when `SST_PRODUCTION_AUTO_DEPLOY_ENABLED=true`
- `Main` does not deploy for docs, workflow-only, script-only, or app e2e-only changes
- `Deploy` remains available as a manual production deploy fallback for current `main` only and accepts `all`, `chill`, or `binge`

SST deploy config:

- staging deploys `chill`, `binge`, and shared `zones`; production deploys `chill` and `binge`
- staging uses `staging.chill.institute` and `staging.binge.institute`; production uses `chill.institute` and `binge.institute`
- production deploys explicitly keep `www.*` attached as Workers domains
- SST uses `home: "local"`; GitHub Actions restores and saves encrypted state through the private repo named by `SST_STATE_REPO`
- production keeps separate state files for chill and binge so app deploy lanes do not overwrite each other
- GitHub Environments provide `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_DEFAULT_ACCOUNT_ID`, `SST_STATE_AGE_IDENTITY`, and `SST_STATE_REPO_TOKEN`
- repository variables provide domain names, `SST_PRODUCTION_AUTO_DEPLOY_ENABLED`, `SST_STATE_REPO`, `SST_STATE_REPO_BRANCH`, `SST_STATE_AGE_RECIPIENT`, and the `SST_STATE_FILE_*` paths
- first deploy only: run with `bootstrap_state=true`; later deploys fail closed when encrypted state is missing
- SST manages `always_use_https` and `automatic_https_rewrites` for both zones

## Production Operations

Production has been cut over to SST. Normal deploys are push-to-`main` through `Main` with `SST_PRODUCTION_AUTO_DEPLOY_ENABLED=true`.

Use manual `Deploy` only to rerun the current `main` production deploy path after an incident or GitHub Actions retry failure:

1. Choose `app=chill`, `app=binge`, or `app=all`.
2. Keep `bootstrap_state=false` unless intentionally bootstrapping a missing encrypted state file.

Both production deploy paths restore encrypted SST state, refresh Cloudflare/SST state, deploy, explicitly ensure `www.*` Workers domains, and then save encrypted state.

Rollback is to redeploy the last known good `main` commit through the manual `Deploy` workflow. Do not run `sst remove` for production; production resources are retained/protected.
