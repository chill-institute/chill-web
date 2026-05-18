# Deployment

Deployment model for `chill-web`

## Hosting Shape

Target production shape after SST cutover:

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
- `Main` runs the same selective checks, then deploys only when `SST_PRODUCTION_AUTO_DEPLOY_ENABLED=true`; `SST_PRODUCTION_DOMAIN_MODE` controls whether it targets validation or apex hostnames
- `Main` does not deploy for docs, workflow-only, script-only, or app e2e-only changes
- `Deploy` remains available as a manual production deploy fallback for current `main` only and accepts `all`, `chill`, or `binge`; legacy Pages domain detach is only allowed for a single app at a time

SST deploy config:

- staging deploys `chill`, `binge`, and shared `zones`; production deploys `chill` and `binge`
- staging uses `staging.chill.institute` and `staging.binge.institute`; production validation uses `next.chill.institute` and `next.binge.institute`
- production cutover uses the apex domains and keeps `www.*` plus `next.*` as aliases
- SST uses `home: "local"`; GitHub Actions restores and saves encrypted state through the private repo named by `SST_STATE_REPO`
- production keeps separate state files for chill and binge so app deploy lanes do not overwrite each other
- GitHub Environments provide `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_DEFAULT_ACCOUNT_ID`, `SST_STATE_AGE_IDENTITY`, and `SST_STATE_REPO_TOKEN`
- repository variables provide domain names, legacy Pages project names, `SST_PRODUCTION_AUTO_DEPLOY_ENABLED`, `SST_PRODUCTION_DOMAIN_MODE`, `SST_STATE_REPO`, `SST_STATE_REPO_BRANCH`, `SST_STATE_AGE_RECIPIENT`, and the `SST_STATE_FILE_*` paths
- first deploy only: run with `bootstrap_state=true`; later deploys fail closed when encrypted state is missing
- SST manages `always_use_https` and `automatic_https_rewrites` for both zones

Keep the legacy Pages project variables as rollback references until the SST production cutover is stable. They are not used by GitHub Actions after the SST migration.

## Production Cutover

Freeze old Pages deploys and production DNS changes before cutover.

Cut over from Pages to SST one app at a time:

1. Deploy production SST to validation: manual `Deploy` with `domain_mode=validation`, `bootstrap_state=true`, and `detach_pages_domains=false`.
2. Verify `https://next.chill.institute/` and `https://next.binge.institute/`.
3. Cut over `chill`: manual `Deploy` with `app=chill`, `domain_mode=apex`, `bootstrap_state=false`, and `detach_pages_domains=true`.
4. Verify `https://chill.institute/` and `https://www.chill.institute/`.
5. Repeat for `binge`, then set `SST_PRODUCTION_DOMAIN_MODE=apex` and `SST_PRODUCTION_AUTO_DEPLOY_ENABLED=true` for normal push-to-main deploys.

The detach step resolves from repository variables. Later deploys use `bootstrap_state=false` and `detach_pages_domains=false`.

Rollback is to reattach the affected custom domains to the existing Pages project. Do not run `sst remove` for production; production resources are retained/protected.
