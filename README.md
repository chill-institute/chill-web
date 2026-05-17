# chill-web

![chill.institute web](https://chill.institute/banner.png)

Vite+ workspace repo for the Institute's two web apps: [chill.institute](https://chill.institute) and [binge.institute](https://binge.institute).

## Apps

- `apps/chill/` powers `https://chill.institute` with search, result comparison, and send-to-put.io flows
- `apps/binge/` powers `https://binge.institute` with movie and TV browsing, detail pages, source pickers, and RSS shortcuts
- the repo root owns shared workspace config, hooks, CI entrypoints, and package catalog wiring

## Quickstart

Install dependencies and verify the workspace:

```bash
vp install
vp run ready
```

Run an app locally:

```bash
vp run dev:chill
vp run dev:binge
```

Validate the repo:

```bash
vp run verify
vp run verify:chill
vp run verify:binge
vp run e2e
```

## Docs

- [Design system](./DESIGN.md)
- [About the Institute](./docs/ABOUT.md)
- [User guides](./docs/GUIDES.md)
- [Architecture](./docs/ARCHITECTURE.md)
- [Deployment](./docs/DEPLOYMENT.md)
- [Contributing](./CONTRIBUTING.md)

## Contributing

Please read the [contributing guide](./CONTRIBUTING.md).

## License

Licensed under the [MIT License](./LICENSE).
