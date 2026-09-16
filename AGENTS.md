# Web

`chill-web` is the React SPA and Cloudflare Workers frontend for
`chill.institute`.

## Work

```bash
pnpm install --frozen-lockfile
pnpm exec vp run setup
pnpm exec vp run dev
pnpm exec vp run verify
```

Use `smoke` for fast browser proof, `e2e` for functional coverage, and `visual`
for UI changes. Intentional snapshot updates use `visual:update`.

## Ownership

- `src/routes/`: thin TanStack route files
- `src/api/`: Connect transport and API helpers
- `src/auth/`: token lifecycle, API context, and auth routes
- `src/catalog/`: movie and TV behavior
- `src/ui/`: tokens, primitives, pure hooks, and presentation
- `src/components/`: app-shell and cross-surface composition

## UI

Read [DESIGN.md](./DESIGN.md) before UI work. Existing tokens and primitives are
the source of truth. Run shadcn from the repo root and translate generated
classes into the repository's semantic token vocabulary.

## Contracts

- Use the local Vite+ CLI through `pnpm exec vp`.
- Keep API resolution in `src/lib/env.ts`.
- Keep route-specific visual tests under `e2e/visual/`.
- Keep auth route behavior in `src/auth/route-options/`; route files stay thin.
- Keep hook behavior in `.vite-hooks/`; Vite+ owns dispatchers.
- With production auto-deploy enabled, every `main` push verifies and deploys
  the tested app and redirect artifacts.

[Architecture](./docs/ARCHITECTURE.md) · [Deployment](./docs/DEPLOYMENT.md) ·
[Contributing](./CONTRIBUTING.md)
