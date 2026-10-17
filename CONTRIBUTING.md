# Contributing

```bash
pnpm install --frozen-lockfile
pnpm exec vp run setup
pnpm exec vp run dev
pnpm exec vp run verify
pnpm exec vp run e2e
pnpm exec vp run visual  # visual:update only for intended baseline changes
```

- Read [DESIGN.md](./DESIGN.md) before changing UI. Visual tests cover desktop
  and mobile in both themes; CI owns the canonical screenshots.
- Functional tests live in `e2e/*.spec.ts`, screenshot tests in `e2e/visual/`.
- Update docs and tests with user-visible behavior.
- If Vite+ reports `Unrecognized database version`, run
  `pnpm exec vp cache clean` and retry.
- If hooks do not run, reset the hooks path:
  `git config --unset core.hooksPath && pnpm exec vp config --hooks-dir .vite-hooks`.

Maintainers handle deployment credentials and production operations.
