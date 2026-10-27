# Deployment

SST ([`sst.config.ts`](../sst.config.ts)) deploys to Cloudflare Workers: the
app on `chill.institute` and `staging.chill.institute`, redirects on
`www.chill.institute`, `binge.institute`, and `www.binge.institute`. Builds
call `api.chill.institute` unless `VITE_PUBLIC_API_BASE_URL` overrides it.

## Delivery

With production auto-deploy enabled, [Main](../.github/workflows/main.yml)
deploys every `main` push after verify and the browser suite pass on the built
artifact. Maintainers own the manual staging, app, and redirect workflows.

After a hosted change, check the app, one redirect, one SPA navigation, and one
auth-start URL. `/auth/success` stays on the app host; RSS and download links
use the API host.

## Artifact

`/security.txt` redirects to `public/.well-known/security.txt`. Artifact
uploads must keep `include-hidden-files: true`, or `.well-known/` does not
deploy.
