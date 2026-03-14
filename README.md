# `chill-institute/web`

![React](https://img.shields.io/badge/React-19-black?logo=react)
![Vite+](https://img.shields.io/badge/Vite%2B-toolchain-black)
![SPA](https://img.shields.io/badge/runtime-SPA-black)

Official web client for `chill.institute`.

## Start Here

Install Vite+ first:

```bash
curl -fsSL https://viteplus.dev/install.sh | sh
```

Docs:
- [viteplus.dev/guide](https://viteplus.dev/guide/)

Then:

```bash
vp install
pnpm dev
```

## Development

Runtime model:

- client-rendered React SPA
- no server functions
- no server-side proxy layer
- browser calls the hosted API directly
- shared RPC types come from [`@chill-institute/contracts`](https://www.npmjs.com/package/@chill-institute/contracts)

Hosted environments resolve the API from the current hostname at runtime:

- `localhost` and `*.web-8vr.pages.dev` -> `https://api.binge.institute`
- `binge.institute` -> `https://api.binge.institute`
- `chill.institute` -> `https://api.chill.institute`

`VITE_PUBLIC_API_BASE_URL` is only needed as an explicit local override.

Cloudflare Pages:

- Build command: `pnpm build`
- Output directory: `dist`
- Node version file: [`.node-version`](./.node-version)
- No API build variable is required for hosted deploys because the app resolves API origin at runtime.

Verify:

```bash
vp check
vp run test
vp run knip
vp build
vp run e2e
```

## Docs

- [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md)

This repo uses Vite+ as its frontend toolchain and talks to the hosted API directly from the browser.
