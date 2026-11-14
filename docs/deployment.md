# Deployment

[sst.config.ts](../sst.config.ts) owns deployment targets and domains;
[src/lib/env.ts](../src/lib/env.ts) owns API resolution.

## Delivery

[Delivery workflows](../.github/workflows/main.yml). Maintainers own production
credentials and manual deployments.

After a hosted change, check the app on each host, one redirect, one SPA navigation, and one
auth-start URL. `/auth/success` stays on the app host; RSS and download links
use the API host.

## Artifact

`/security.txt` redirects to `public/.well-known/security.txt`. Artifact
uploads must keep `include-hidden-files: true`, or `.well-known/` does not
deploy.
