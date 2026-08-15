# Contributing

## Start

```bash
pnpm install --frozen-lockfile
pnpm exec vp run setup
pnpm exec vp run dev
```

Use the repository-local Vite+ CLI through `pnpm exec vp`.

## Verify

```bash
pnpm exec vp run verify
pnpm exec vp run smoke
pnpm exec vp run e2e
```

For visual changes, compare desktop and mobile snapshots in both themes:

```bash
pnpm exec vp run visual
pnpm exec vp run visual:update  # intentional baseline changes only
```

Functional tests live in `e2e/*.spec.ts`; screenshot tests live in
`e2e/visual/*.visual.spec.ts`. CI owns the canonical screenshots.

If Vite+ reports `Unrecognized database version`, run
`pnpm exec vp cache clean` and retry.

## Work in the Repo

- Read [DESIGN.md](./DESIGN.md) before changing UI.
- Keep API transport in `src/api/`, auth in `src/auth/`, catalog behavior in
  `src/catalog/`, and presentation in `src/ui/`.
- Run shadcn from the repo root so `components.json` resolves correctly.
- Check `playwright-report/` and `test-results/` after browser failures.
- Update docs and tests with user-visible behavior.

`pnpm install` configures hooks from `.vite-hooks/`. If another hooks path wins:

```bash
git config --unset core.hooksPath
pnpm exec vp config --hooks-dir .vite-hooks
```

Deployment credentials and production operations remain maintainer-managed.
