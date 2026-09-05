# Deployment

SST publishes the SPA and redirects through Cloudflare Workers.

| Surface   | Hosts                                                           |
| --------- | --------------------------------------------------------------- |
| App       | `chill.institute`, `staging.chill.institute`                    |
| Redirects | `www.chill.institute`, `binge.institute`, `www.binge.institute` |
| API       | `api.chill.institute`                                           |

Local builds use the production API unless `VITE_PUBLIC_API_BASE_URL` overrides
it.

## App Artifact

- `VITE_PUBLIC_VERSION` is `0.0.<mainline commit count>` and is sent as API
  client metadata.
- `VITE_PUBLIC_RELEASE` is the short commit SHA used for debugging and Sentry.
- Fingerprinted `/assets/*` responses are immutable; missing assets return 404.
- The service worker waits and asks before activating an update.
- `public/_headers` and the static-asset Worker apply browser security headers.

Sentry is enabled only when the build receives its public DSN and environment.
Deploy builds upload hidden source maps, remove them from `dist/`, and never
publish the upload token.

## Delivery

Pull requests run app verification and the fuller functional browser suite.
Browser fixtures mock API and health responses. On `main`, the
shared workflow:

1. Builds `dist/` once with the production environment.
2. Runs sign-in and settings-shell browser smoke against those files.
3. Records and uploads a SHA-256 manifest.
4. Downloads and verifies the artifact in the deployment job.
5. Deploys without rebuilding.

Redirects deploy separately because they do not contain the app bundle. Manual
staging, app, and redirect workflows are maintainer recovery paths.

## Routes

- `/auth/success` stays on the app host for browser auth completion.
- RSS and download links use the API host.

After a hosted change, check the app, one redirect, one SPA navigation, and one
auth-start URL. Live monitoring and rollback are maintainer-operated.
