# Web

`chill-web` is the React SPA for `chill.institute`, deployed to Cloudflare
Workers with SST. Product behavior stays in the hosted API.

## Work

```bash
pnpm install --frozen-lockfile
pnpm exec vp run setup
pnpm exec vp run dev
pnpm exec vp run verify
```

## Rules

- Use the local Vite+ CLI through `pnpm exec vp`.
- Read [DESIGN.md](./DESIGN.md) before UI work. Run shadcn from the repo root
  and map generated classes to the semantic tokens.
- `src/ui/` must not import auth or API code; directory owners are in
  [architecture](./docs/architecture.md#ownership).
- Keep API resolution in `src/lib/env.ts`, auth route behavior in
  `src/auth/route-options/`, and hook behavior in `.vite-hooks/`.
- With production auto-deploy enabled, every `main` push deploys after verify
  and e2e pass on that commit.

## Proof map

Browser lanes use mocked API responses and leave `playwright-report/`.

| Change             | Check                                                                         | CI                                                                  |
| ------------------ | ----------------------------------------------------------------------------- | ------------------------------------------------------------------- |
| Docs, copy, config | `pnpm exec vp run verify`                                                     | [verify](./.github/workflows/_verify-app.yml): PRs, `main`          |
| Pure logic         | `pnpm exec vp test`                                                           | inside verify                                                       |
| User workflows     | `pnpm exec vp run e2e`                                                        | [e2e](./.github/workflows/_e2e.yml): PRs, before deploy             |
| UI, tokens, layout | `pnpm exec vp run visual`; `visual:update` for intended baselines             | [visual](./.github/workflows/visual.yml)                            |
| PWA metadata       | `PLAYWRIGHT_PORT=58320 pnpm exec vp exec playwright test e2e/pwa.spec.ts`     | [PWA](./.github/workflows/pwa-installability.yml)                   |
| Android install    | [Maestro flow](./.maestro/android-pwa-add-to-home-screen.yaml) on an emulator | [PWA](./.github/workflows/pwa-installability.yml): dispatch, weekly |
| Workflows          | shared Actionlint and Zizmor scan                                             | [Main](./.github/workflows/main.yml): `main` push, before deploy    |

Gaps:

- Pull requests get no workflow lint; only the `main` push does.
- No lane runs against a live API or checks deployed hosts; run the
  [post-deploy checks](./docs/deployment.md#delivery) by hand.
