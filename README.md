# chill-web

![chill.institute web](https://chill.institute/banner.png)

Vite+ repo for the Institute web app at [chill.institute](https://chill.institute).

## Product

- `./` powers `https://chill.institute` with search, movie and TV browsing, detail pages, source pickers, RSS shortcuts, and send-to-put.io flows
- `https://www.chill.institute`, `https://binge.institute`, and `https://www.binge.institute` redirect to `https://chill.institute`
- the repo root owns app code, config, hooks, CI entrypoints, and dependencies

## Install

Install dependencies and verify the repo:

```bash
vp install
vp run ready
```

## Run Locally

```bash
vp run dev
```

## Validate

```bash
vp run verify
vp run e2e
```

## Docs

- [About the Institute](./docs/ABOUT.md)
- [Design system](./DESIGN.md)
- [Architecture](./docs/ARCHITECTURE.md)
- [Deployment](./docs/DEPLOYMENT.md)
- [Security](./SECURITY.md)
- [Contributing](./CONTRIBUTING.md)

## Contributing

Please read the [contributing guide](./CONTRIBUTING.md).

## License

Licensed under the [MIT License](./LICENSE).
