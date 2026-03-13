# Chill Web

Official web client for Chill, built as a client-rendered React SPA with Vite, TanStack Router, and TanStack Query.

## Runtime model

- No server functions.
- No server-side proxy layer.
- Browser calls the hosted API directly.
- Shared RPC types come from [`@chill-institute/contracts`](https://www.npmjs.com/package/@chill-institute/contracts).

## Environment

- `VITE_PUBLIC_API_BASE_URL`: public base URL for `chill-api` (example: `http://localhost:8080`).

If not set, the app falls back to `window.location.origin`.

## Local development

```bash
bun install
bun run dev
```

## Build

```bash
bun run build
```

## Verification

```bash
mise install
mise run verify
```

## Cloudflare Pages (production)

- Build command: `bun run build`
- Output directory: `dist`
- Required env var: `VITE_PUBLIC_API_BASE_URL` pointing to your public API origin.
