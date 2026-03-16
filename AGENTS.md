# Web

`web` is the `chill.institute` React SPA plus a small Cloudflare Pages Functions layer for legacy non-SPA route forwarding.

## Workflow

- Use `vp` for toolchain commands.
- Keep repo entrypoints in `package.json`; they should call `vp` underneath.
- Keep toolchain configuration centered on [`.node-version`](./.node-version) and the `vp` workflow.

## Runtime API Resolution

- Hosted `chill.institute` and `*.web-8vr.pages.dev` talk to `https://api.chill.institute`.
- `localhost` defaults to production unless `VITE_PUBLIC_API_BASE_URL` is explicitly set.
- Keep browser-side API resolution centralized in [`src/lib/env.ts`](./src/lib/env.ts).
- Keep hosted legacy route forwarding resolution centralized in [`functions/_lib/api-origin.js`](./functions/_lib/api-origin.js).

## Verification

- Run `vp install` for a fresh clone or when dependencies change.
- `vp check` is the baseline repo verification command.
- Before finishing meaningful changes, run `vp run test`, `vp run knip`, `vp build`, and `vp run e2e`.
- If you only touch a narrow area, run the smallest relevant subset while working, then finish with the main checks before commit.

## Tooling Notes

- Keep Vite+ hook/config changes minimal and intentional.
- When Vite+ behaves differently in CI, verify with direct local commands first and then make the smallest repo change that matches the tool's real behavior.

## Docs

- Keep [README.md](./README.md) concise.
- Put details in [docs/](./docs/).
- See [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md) for the SPA and Pages Functions split.
