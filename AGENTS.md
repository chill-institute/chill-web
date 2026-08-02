# Web

`web` is a Vite+ repo that hosts the Cloudflare Workers frontend for `chill.institute`.

## Structure

- `src/routes/` is the TanStack file-route tree; keep route files thin when a domain module owns the behavior.
- `src/api/` owns Connect-RPC transport and API helpers; `src/auth/` owns token lifecycle and API wiring.
- `src/catalog/` owns movie and TV browsing behavior.
- `src/ui/` owns presentational primitives, tokens, pure hooks, and UI helpers.
- The repo root owns Vite+, Playwright, shadcn, hook, and CI configuration.

## Stack

- React SPA with TanStack Router and TanStack Query
- Vite+ app tooling through `vp`
- Playwright suites in `e2e/`

## Design

- Read [DESIGN.md](./DESIGN.md) before creating, redesigning, or reviewing UI.
- Treat `src/ui/styles.css` and `src/ui/components/` as the implemented design-system source of truth.
- Treat external mockups and generated design exports as reference material. If they conflict with current code, preserve the current code unless the user explicitly asks for a visual change.
- Use shadcn/base project context from the relevant `components.json` before adding or updating UI primitives.
- Translate upstream shadcn token classes back to the Institute token vocabulary in [DESIGN.md](./DESIGN.md) before committing generated UI.

## Commands

- `vp install`
- `vp run ready`
- `vp run dev`
- `vp run verify`
- `vp run smoke`
- `vp run e2e`
- `vp run visual`
- `vp run visual:update`
- `vp run knip`

## Conventions

- Keep repo entrypoints in the root [package.json](./package.json); they should call `vp` underneath.
- Prefer `vp` over direct `pnpm`, `vite`, `vitest`, or `playwright` invocations.
- Keep visual regression tests under `e2e/visual/` and run them with `vp run visual`; ordinary `vp run e2e` intentionally ignores that folder.
- Keep dependency versions in the root [package.json](./package.json).
- Keep browser-side API resolution in `src/lib/env.ts`; the client takes the resolved `baseUrl` as input.
- Keep shadcn config in `components.json`.
- Keep presentational primitives in `src/ui/`, auth/API wiring in `src/auth/` and `src/api/`, and catalog-specific behavior in `src/catalog/`.
- Auth flow routes (sign-out, debug.crash, auth/success, auth/cli-token) live as `*RouteOptions` objects in `src/auth/route-options/*`. App route files should stay thin shims.
- Keep Vite and hook/config changes minimal and intentional.
- Keep hook behavior in `.vite-hooks/`; the `.githooks/` launchers delegate to that canonical path.
- When `SST_PRODUCTION_AUTO_DEPLOY_ENABLED` is true, every push to `main` runs workflow security, app verification, functional e2e, and production app and redirect deployment.

## Read More

- repo architecture and app boundaries: [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md)
- hosted deployment overview: [docs/DEPLOYMENT.md](./docs/DEPLOYMENT.md)
- day-to-day workflow: [CONTRIBUTING.md](./CONTRIBUTING.md)
