# Contributing

Thanks for contributing to `chill-web`.

## Setup

Install the pinned dependencies, including the repo-local Vite+ CLI:

```bash
pnpm install --frozen-lockfile
pnpm exec vp run setup
```

## Run Locally

Start the app locally from the repo root:

```bash
pnpm exec vp run dev
```

## Validation

Run the full repo checks before opening or updating a pull request:

```bash
pnpm exec vp run verify
pnpm exec vp run smoke
pnpm exec vp run e2e
```

If Vite+ fails with `Unrecognized database version`, run
`pnpm exec vp cache clean` and retry.

Playwright checks are split by signal. Functional coverage lives in ordinary e2e
tests, and screenshot guardrails live under `e2e/visual/`.

Visual regression snapshots cover desktop and mobile rendering in light and dark
mode. They are intentionally excluded from ordinary functional e2e; run them for
intentional layout, token, responsive, or component-state changes:

```bash
pnpm exec vp run visual
```

When the visual change is intended, update and review the committed baselines:

```bash
pnpm exec vp run visual:update
```

Screenshot baselines are partitioned by viewport and theme project only, and CI is
the source of truth for the committed images. The visual workflow is path-gated
to UI-affecting files so routine non-UI PRs do not pay for it.

CI and deploy behavior is documented in [Deployment](./docs/DEPLOYMENT.md).

## Git Hooks

`pnpm install` runs the repo's `prepare` script, which configures Vite+
hooks from `.vite-hooks/`.

If your local Git config points somewhere else and hooks are not firing, re-install them with:

```bash
git config --unset core.hooksPath
pnpm exec vp config --hooks-dir .vite-hooks
```

## Development Notes

- [Architecture](./docs/ARCHITECTURE.md) owns the app layout and runtime boundaries.
- [Design system](./DESIGN.md) is the design-system brief for humans and agents. The implemented tokens and UI primitives live in `src/ui/`.
- Package versions and task entrypoints live in `package.json`.
- Use `pnpm exec vp` for repo tasks instead of invoking Vite, Vitest, or
  Playwright directly.
- Hosted environments and redirects are documented in [Deployment](./docs/DEPLOYMENT.md).
- Localhost resolves to `https://api.chill.institute` unless you set `VITE_PUBLIC_API_BASE_URL`.
- `VITE_PUBLIC_API_BASE_URL` is only needed as an explicit local override.
- When generating or updating shadcn/base primitives, work from `./` so `components.json` resolves aliases correctly.
- Playwright keeps traces, screenshots, and videos on failure. Check `playwright-report/` and `test-results/` after a failing run.
- Keep ordinary e2e tests in `e2e/*.spec.ts` and screenshot guardrails in `e2e/visual/*.visual.spec.ts` so each check reports the right kind of failure.
- Deployment credentials and operational runbooks are maintainer-managed. Do not add secrets, local machine paths, or maintainer-only notes to this repo.

## Pull Requests

- Keep changes focused and explicit.
- Add or update tests when behavior changes.
- Prefer small follow-up PRs over mixing unrelated cleanup into feature work.
