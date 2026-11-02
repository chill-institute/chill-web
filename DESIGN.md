# Design

`chill.institute` uses stone-and-paper surfaces, Metric and Family type, hard
1px borders, compact controls, and stamped button motion. Search is dense:
table-first on desktop, card-first on mobile. Catalog browsing is image-first:
poster grids and detail modals.

Token values and component variants live in the source files below.

- Tokens, fonts, motion, heading styles: `src/ui/styles.css`
- shadcn/base primitives: `src/ui/components/ui/`
- Shared components: `src/ui/components/`
- App and catalog surfaces: `src/components/`, `src/catalog/components/`

## Colors

Use the semantic utilities in `src/ui/styles.css`, such as `bg-app`,
`bg-surface`, `text-fg-1`, `text-fg-3`, `border-border-strong`,
`border-border-control`, `border-border-faint`, `text-success`, and `text-error`. No raw blue, indigo,
gray, slate, purple, or marketing gradients.

Contrast floors: 4.5:1 for text, 3:1 for icons, control borders, and focus
rings, against the background each actually sits on. Inputs, selects,
checkboxes, and bordered buttons use `border-border-control`; dividers, cards,
and panels use `border-border-strong`, which is decorative and sits under
3:1 in dark mode. In light mode
`text-fg-4` meets 4.5:1 only on `bg-surface-2`; use `text-fg-3` for text on
`bg-app` or `bg-surface`, and keep `text-fg-4` for separators and icons there.

Accents are sparse and semantic:

- amber: ratings and filled stars only; the star is decorative beside the
  rating value, so never let amber carry meaning alone
- green: successful transfers and put.io follow-up actions only
- red: destructive and error states only
- hot pink and purple: brand assets and special moments, never product chrome

Gradients only for movie and TV detail image scrims. Blur only on the dialog and
drawer overlays and the modal close button; the sticky header is opaque.

## shadcn Compatibility

The alias mapping lives in [styles.css](./src/ui/styles.css), and CLI paths
in [components.json](./components.json).

Run the shadcn CLI from the repo root, review the diff, and translate classes
before shipping. Use `--overwrite` only when the user asks for an upstream
reset.

## Typography

- Metric is the UI and body font. Family, regular weight only, is the serif for
  app names, headings, table narration, and titles. No third font, no bold
  serif, no monospace anywhere in product UI.
- Font sizes, tracking, and responsive input sizing live in
  [styles.css](./src/ui/styles.css). Use theme tokens for off-scale sizes.
- Labels are mostly lowercase (`movies`, `tv shows`, `seeders`, `send to
  put.io`); longer headings may use sentence case. The voice is one operator
  running a useful thing, not a SaaS brand.

## Layout

Utilitarian and dense: search routes center on results, catalog routes on
browsing. No marketing sections, heroes, or decorative filler. Use the lightest
separation that works: whitespace for related groups, borders for siblings,
faint surfaces for secondary panels, bordered cards only for independent or
interactive objects, modals, and mobile result cards.

## Elevation & Depth

- `shadow-press`, a 1px hard stamp, marks default and primary buttons,
  popovers, tooltips, toasts, and the auth and status panels. On press, stamped
  buttons shift 1px and drop it; ghost and icon buttons scale instead.
- Other cards use borders, not shadows. Modals use `shadow-modal`, detail
  posters `shadow-poster`, drawers `shadow-drawer`.

## Components

Reuse before writing markup: `Button`, `IconButton`, `Tabs`/`TabsList`/
`TabsTrigger` and `SortRow` for mode and sort controls, `NativeSelect`,
`Empty` or `EmptyState`, `Alert` and `UserErrorAlert`, `Skeleton`,
`PosterCard`, and `ResponsiveModal`, `SettingsModal`, or the shadcn dialog and
drawer primitives for overlays.

Pick appearance with the component's variant and size props. Outside
`src/ui/components/`, lint rejects classes that restyle a component, arbitrary
values, and inline styles. Exceptions and contracts live in
[vite.config.ts](./vite.config.ts).

Use lucide icons with component-supported sizing and `data-icon` where
expected. Emoji appear only in the results-table action-column marker (🤠) and
the search empty states (🤠, 🤨).

## Loading transitions

- Keep known controls mounted and disabled while settings load.
- Skeletons match loaded card geometry at each breakpoint, including metadata
  and action rows.
- Movie and TV details keep a viewport-bounded frame with a scrolling body.
- Settings size to content under a viewport limit, with no fixed-height gaps;
  errors stay with the failing section, and the footer holds links and version.
- Search and catalog content reserve at least one viewport so a short response
  does not pull the footer up.
