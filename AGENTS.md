# Web

`web` is a Vite+ repo that hosts the Cloudflare Workers frontend for `chill.institute`.

## Structure

- `./` is the `chill.institute` app — search, movies, TV shows, settings, auth, assets, and e2e tests.
- `src/routes/` is the TanStack file-route tree.
- `src/router.tsx`, `src/routes/`, and `src/routeTree.gen.ts` match the Vite+ TanStack Start scaffold shape.
- `src/catalog/` owns movie and TV browsing surfaces, source selectors, catalog queries, and detail modals.
- `src/ui/` is purely presentational primitives. Design tokens (`@theme` semantic surface/fg/border colors, heading element styles), `lucide`-iconed shared components (StickyHeader, Tabs, SortRow, PosterCard, IconButton, InstituteFooter, AuthPage, StatusPanel, AppErrorBoundary/Fallback, BackendUnavailableScreen, CopyButton, SettingsModal, EmptyState), the canonical `.btn` / `.input` / `.kbd` styles, plus pure hooks (`useTheme`, `useIsDesktop`) and lib helpers (`cn`, `format`, `public-links`). No api/auth coupling.
- `src/api/` is the chill backend connect-rpc client. Exposes `createApi({ authToken, baseUrl, normalizeSettings? })`, `getPutioStartURL`, the auth-error constants, `withTimeoutSignal`, and the auth-failure / settings-defaults helpers.
- `src/auth/` is auth + api wiring. Owns `AuthProvider`/`useAuth` (PASETO token + put.io OAuth callback storage), `ApiProvider`/`useApi`/`useGetPutioStartURL`, connect-rpc error mapping, api-coupled components, shared queries, and auth route options.
- the repo root owns shared repo config, scripts, hooks, and CI entrypoints

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
- `vp run knip`

## Conventions

- Keep repo entrypoints in the root [package.json](./package.json); they should call `vp` underneath.
- Prefer `vp` over direct `pnpm`, `vite`, `vitest`, or `playwright` invocations.
- Keep dependency versions in the root [package.json](./package.json).
- Keep browser-side API resolution in `src/lib/env.ts`; the client takes the resolved `baseUrl` as input.
- Keep shadcn config in `components.json`.
- Keep presentational primitives in `src/ui/`, auth/API wiring in `src/auth/` and `src/api/`, and catalog-specific behavior in `src/catalog/`.
- Auth flow routes (sign-out, debug.crash, auth/success, auth/cli-token) live as `*RouteOptions` objects in `src/auth/route-options/*`. App route files should stay thin shims.
- Keep Vite and hook/config changes minimal and intentional.
- Keep `.vite-hooks/` as the canonical hook path; `.githooks/` exists only as a compatibility shim for stale local Git config.
- CI verifies and deploys the app surface; docs-only, workflow-only, and e2e-only changes do not deploy it.

## Read More

- repo architecture and app boundaries: [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md)
- hosted deployment overview: [docs/DEPLOYMENT.md](./docs/DEPLOYMENT.md)
- day-to-day workflow: [CONTRIBUTING.md](./CONTRIBUTING.md)
