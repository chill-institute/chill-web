# Web

`chill-web` is the React SPA and Cloudflare Workers frontend for
`chill.institute`.

## Work

```bash
pnpm install --frozen-lockfile
pnpm exec vp run setup
pnpm exec vp run dev
```

## Proof map

Browser lanes serve `dist/` with mocked API and health responses. Failures leave
`playwright-report/` and `test-results/`.

| Change                      | Check                                                                         | Runs                                                                                                                                               | Leaves                                                                          |
| --------------------------- | ----------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| Docs, copy, config          | `pnpm exec vp run verify` (check, knip, unit, build)                          | local, [CI](./.github/workflows/_verify-app.yml) on PRs and `main`                                                                                 | exit status; `dist/` artifact `web-dist-<run>`                                  |
| Pure logic in `src/`        | `pnpm exec vp test`                                                           | local, inside `verify`                                                                                                                             | exit status                                                                     |
| User workflows              | `pnpm exec vp run e2e`                                                        | local, [CI](./.github/workflows/_e2e.yml) on PRs and on `main` before deploy                                                                       | Playwright report; artifact `playwright-artifacts`                              |
| UI, tokens, layout          | `pnpm exec vp run visual`; `visual:update` for intentional baselines          | local, [CI](./.github/workflows/visual.yml) on UI paths                                                                                            | `e2e/visual/__screenshots__/`; artifact `visual-regression-artifacts`           |
| PWA metadata                | `PLAYWRIGHT_PORT=58320 pnpm exec vp exec playwright test e2e/pwa.spec.ts`     | local, [CI](./.github/workflows/pwa-installability.yml) on PWA paths                                                                               | exit status                                                                     |
| Android home-screen install | Maestro [flow](./.maestro/android-pwa-add-to-home-screen.yaml) on an emulator | [CI](./.github/workflows/pwa-installability.yml) via dispatch or the weekly [Cloudflare schedule](./.github/workflows/cloudflare-pwa-schedule.yml) | junit, screenshots, logs; artifact `android-pwa-home-screen-experiment`         |
| Workflows                   | zizmor                                                                        | [CI](./.github/workflows/_workflow-security.yml)                                                                                                   | exit status                                                                     |
| Deploy                      | `main` push: verify, e2e, build, smoke, SHA-256 manifest, `sst deploy`        | [CI](./.github/workflows/main.yml)                                                                                                                 | artifacts `web-app-<env>-<run>`, `playwright-<env>-<run>`; deployed release SHA |

Gaps:

- No actionlint lane for workflow changes. Owner: chill-institute/chill-web.
- No lane runs the app against a live API. Owner: chill-institute/chill-web.
- No automated check of deployed hosts; [post-deploy checks](./docs/DEPLOYMENT.md#routes) are manual. Owner: operator.

## Ownership

Directory ownership and the `src/ui/` import rule live in
[Architecture](./docs/ARCHITECTURE.md#ownership).

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
- With production auto-deploy enabled, every `main` push deploys only after
  verify and the e2e suite pass on that commit. Pending production deploys
  queue instead of replacing each other.

[Architecture](./docs/ARCHITECTURE.md) · [Deployment](./docs/DEPLOYMENT.md) ·
[Contributing](./CONTRIBUTING.md)
