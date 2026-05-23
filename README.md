# chill-web

![chill.institute web](https://chill.institute/banner.png)

Vite+ repo for The Institute web app at [chill.institute](https://chill.institute)

This repo owns the client app, UI system, e2e tests, Cloudflare Workers frontend deployment, and browser-facing integration with the hosted API.

## Quick Start

Install dependencies and verify the repo:

```bash
vp install
vp run ready
```

Start the app locally:

```bash
vp run dev
```

## Validate

```bash
vp run verify
vp run smoke
vp run e2e
vp run visual
```

## Docs

- [About The Institute](./docs/ABOUT.md): product framing and surfaces
- [FAQ](./docs/FAQ.md): support, reporting, browser, put.io, and contribution questions
- [Design system](./DESIGN.md): visual tokens, primitives, and UI rules
- [Architecture](./docs/ARCHITECTURE.md): app boundaries and route/data shape
- [Deployment](./docs/DEPLOYMENT.md): Cloudflare Workers hosting and CI deploy rules
- [Security](./SECURITY.md): reporting and browser-side security notes
- [Contributing](./CONTRIBUTING.md): local setup and PR expectations

## Contributing

Please read the [contributing guide](./CONTRIBUTING.md).

## License

Licensed under the [MIT License](./LICENSE)
