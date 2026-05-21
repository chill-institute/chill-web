# Contributing

Thanks for contributing to `chill-web`

## Setup

Install [Vite+](https://viteplus.dev/guide/) and then install repo dependencies:

```bash
vp install
```

Check the repo is ready:

```bash
vp run ready
```

## Run Locally

Start the app locally from the repo root:

```bash
vp run dev
```

## Validation

Run the full repo checks before opening or updating a pull request:

```bash
vp run verify
vp run smoke
vp run e2e
```

Visual regression snapshots are a separate guardrail. They cover desktop and mobile
rendering in light and dark mode under `e2e/visual/` and are intentionally
excluded from ordinary `vp run e2e`. Run them for intentional layout, token, responsive, or
component-state changes:

```bash
vp run visual
```

When the visual change is intended, update and review the committed baselines:

```bash
vp run visual:update
```

Screenshot baselines are partitioned by viewport and theme project only, and CI is
the source of truth for the committed images. The visual workflow is path-gated
to UI-affecting files so routine non-UI PRs do not pay for it.

CI and deploy behavior is documented in [docs/DEPLOYMENT.md](./docs/DEPLOYMENT.md)

## Git Hooks

`vp install` runs the repo's `prepare` script, which configures Vite+ hooks from `.vite-hooks/`

The repo also ships matching `.githooks/` shims so older local clones that still have `core.hooksPath=.githooks` keep enforcing the same checks.

If your local Git config points somewhere else and hooks are not firing, re-install them with:

```bash
git config --unset core.hooksPath
vp config --hooks-dir .vite-hooks
```

## Development Notes

- This repo contains one client-rendered SPA at the repository root.
- Runtime code, assets, and tests live in `src/`, `public/`, and `e2e/`.
- Root config lives in `package.json`, `vite.config.ts`, `tsconfig.json`, `components.json`, hooks, and CI workflows.
- Root [DESIGN.md](./DESIGN.md) is the design-system brief for humans and agents. The implemented tokens and UI primitives live in `src/ui/`.
- Package versions live directly in `package.json`.
- Prefer `vp` commands over calling `pnpm`, `vite`, or `playwright` directly.
- The app talks directly to the hosted API.
- The root app serves production and staging; redirects are documented in [Deployment](./docs/DEPLOYMENT.md).
- Localhost resolves to `https://api.chill.institute` unless `VITE_PUBLIC_API_BASE_URL` overrides it.
- `VITE_PUBLIC_API_BASE_URL` is only needed as an explicit local override.
- When generating or updating shadcn/base primitives, work from `./` so `components.json` resolves aliases correctly.
- Playwright keeps traces, screenshots, and videos on failure. Check `playwright-report/` and `test-results/` after a failing run.
- Keep ordinary e2e tests in `e2e/*.spec.ts`; keep screenshot guardrails in `e2e/visual/*.visual.spec.ts` so visual baselines do not slow or destabilize behavioral checks.
- Deployment credentials and operational runbooks are maintainer-managed. Do not add secrets, local machine paths, or maintainer-only notes to this repo.

## Pull Requests

- Keep changes focused and explicit.
- Add or update tests when behavior changes.
- Prefer small follow-up PRs over mixing unrelated cleanup into feature work.
