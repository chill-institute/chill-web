# Deployment

SST deploys to Cloudflare Workers: the app on `chill.institute` and
`staging.chill.institute`, redirects on `www.chill.institute`,
`binge.institute`, and `www.binge.institute`. Builds call
`api.chill.institute` unless `VITE_PUBLIC_API_BASE_URL` overrides it.

## Delivery

With production auto-deploy enabled, a `main` push runs verify, then
[Main](../.github/workflows/main.yml) deploys:

1. Build `dist/` once with the environment's Sentry DSN and release stamp. Only
   this job holds the Sentry token; it uploads source maps and removes them.
2. Record a SHA-256 manifest of `dist/`.
3. Run the browser suite, without secrets, against that artifact.
4. Deploy without rebuilding, failing unless the files match the tested
   manifest.

Redirects deploy separately. Production deploys queue instead of replacing
each other. Manual staging, app, and redirect workflows are recovery paths.

After a hosted change, check the app, one redirect, one SPA navigation, and one
auth-start URL. `/auth/success` stays on the app host; RSS and download links
use the API host.

## Artifact

- `VITE_PUBLIC_VERSION` is `0.0.<mainline commit count>`, sent as client
  metadata; `VITE_PUBLIC_RELEASE` is the short commit SHA.
- [`scripts/check-build.ts`](../scripts/check-build.ts) fails the build when
  `dist/` contains a source map.
- `/security.txt` redirects to `public/.well-known/security.txt`; artifact
  uploads include hidden files so `.well-known/` deploys.
- The service worker asks before activating an update. A waiting update
  applies while the app is hidden or on the next route change, never during a
  mutation or while a new Stremio link is on screen.
