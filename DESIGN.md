---
version: alpha
name: chill.institute
description: Code-first design system for chill.institute.
colors:
  primary: "#0c0a09"
  onPrimary: "#f5f5f4"
  app: "#d6d3d1"
  surface: "#f5f5f4"
  surface2: "#fafaf9"
  hover: "#e7e5e4"
  active: "#d6d3d1"
  foreground: "#0c0a09"
  foregroundMuted: "#44403c"
  foregroundSubtle: "#57534e"
  foregroundFaint: "#78716c"
  borderStrong: "#0c0a09"
  borderDark: "#78716c"
  darkApp: "#292524"
  darkSurface: "#1c1917"
  darkForeground: "#f5f5f4"
  rating: "#f59e0b"
  success: "#036819"
  darkSuccess: "#2da73d"
  error: "#dc2626"
typography:
  heading:
    fontFamily: Family
    fontSize: 2.25rem
    fontWeight: 400
    lineHeight: 1.05
    letterSpacing: "-0.01em"
  heading-md:
    fontFamily: Family
    fontSize: 1.875rem
    fontWeight: 400
    lineHeight: 1.2
    letterSpacing: "-0.01em"
  heading-sm:
    fontFamily: Family
    fontSize: 1.5rem
    fontWeight: 400
    lineHeight: 1.2
    letterSpacing: "-0.01em"
  body:
    fontFamily: Metric
    fontSize: 0.875rem
    fontWeight: 400
    lineHeight: 1.4
  micro:
    fontFamily: Metric
    fontSize: 0.6875rem
    fontWeight: 400
    lineHeight: 1rem
rounded:
  xs: 2px
  sm: 4px
  md: 6px
  lg: 8px
  xl: 12px
spacing:
  px: 1px
  xs: 0.25rem
  sm: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  control-xs: 1.125rem
  control-sm: 1.5rem
  control: 1.875rem
  control-md: 2.25rem
components:
  button:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.sm}"
    height: "{spacing.control}"
    padding: 0.375rem
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.onPrimary}"
    rounded: "{rounded.sm}"
    height: "{spacing.control}"
    padding: 0.375rem
  input:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.foreground}"
    typography: "{typography.body}"
    rounded: "{rounded.sm}"
    height: "{spacing.control}"
    padding: 0.5rem
  select:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.foreground}"
    typography: "{typography.body}"
    rounded: "{rounded.md}"
    height: "{spacing.control}"
    padding: 0.5rem
  card:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.sm}"
    padding: "{spacing.lg}"
  modal:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.xl}"
    padding: "{spacing.xl}"
  app-shell:
    backgroundColor: "{colors.app}"
    textColor: "{colors.foreground}"
  surface-inset:
    backgroundColor: "{colors.surface2}"
    textColor: "{colors.foregroundMuted}"
    rounded: "{rounded.sm}"
    padding: "{spacing.md}"
  hover-state:
    backgroundColor: "{colors.hover}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.sm}"
  active-state:
    backgroundColor: "{colors.active}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.md}"
  metadata:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.foregroundSubtle}"
    typography: "{typography.micro}"
  placeholder:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.foregroundSubtle}"
    typography: "{typography.micro}"
  faint-ink:
    backgroundColor: "{colors.foregroundFaint}"
  hard-border:
    backgroundColor: "{colors.borderStrong}"
    textColor: "{colors.onPrimary}"
  dark-shell:
    backgroundColor: "{colors.darkApp}"
    textColor: "{colors.darkForeground}"
  dark-surface:
    backgroundColor: "{colors.darkSurface}"
    textColor: "{colors.darkForeground}"
    rounded: "{rounded.sm}"
  dark-border:
    backgroundColor: "{colors.borderDark}"
  rating-star:
    backgroundColor: "{colors.rating}"
  success-state:
    backgroundColor: "{colors.success}"
  dark-success-state:
    backgroundColor: "{colors.darkSuccess}"
  error-state:
    backgroundColor: "{colors.error}"
---

## Overview

`chill.institute` uses stone-and-paper surfaces, Metric and Family type, hard
1px borders, compact controls, and stamped button motion. Search is dense:
table-first on desktop, card-first on mobile. Catalog browsing is image-first:
poster grids and detail modals.

The code wins when this file disagrees; update this file to match.

- Tokens, fonts, motion, heading styles: `src/ui/styles.css`
- shadcn/base primitives: `src/ui/components/ui/`
- Shared components: `src/ui/components/`
- App and catalog surfaces: `src/components/`, `src/catalog/components/`

## Colors

Stone neutrals carry the palette. Light: stone-300 app, stone-100 surfaces,
stone-950 text and hard border. Dark: stone-800 app, stone-900 surfaces,
stone-100 text, stone-500 borders.

Use the semantic utilities in `src/ui/styles.css`, such as `bg-app`,
`bg-surface`, `text-fg-1`, `text-fg-3`, `border-border-strong`,
`border-border-faint`, `text-success`, and `text-error`. No raw blue, indigo,
gray, slate, purple, or marketing gradients.

Contrast floors: 4.5:1 for text, 3:1 for icons, control borders, and focus
rings, against the background each actually sits on. In light mode
`text-fg-4` meets 4.5:1 only on `bg-surface-2`; use `text-fg-3` for text on
`bg-app` or `bg-surface`, and keep `text-fg-4` for separators and icons there.

Accents are sparse and semantic:

- amber: ratings and filled stars only; the star is decorative beside the
  rating value, so never let amber carry meaning alone
- green: successful transfers and put.io follow-up actions only
- red: destructive and error states only
- hot pink and purple: brand assets and special moments, never product chrome

Gradients only for movie and TV detail image scrims. Blur only for the catalog
sticky header, image scrims, and overlay primitives that already have it.

## shadcn Compatibility

`components.json` enables `cssVariables`, and `src/ui/styles.css` maps the
shadcn aliases to Institute tokens. Treat the aliases as a bridge; committed
code uses the Institute utility:

| shadcn               | Institute                |
| -------------------- | ------------------------ |
| `background`         | `app`                    |
| `foreground`         | `fg-1`                   |
| `card`, `popover`    | `surface`                |
| `secondary`, `muted` | `surface-2`              |
| `accent`             | `hover`                  |
| `primary`            | `fg-1` with `fg-inverse` |
| `destructive`        | `error`                  |
| `border`, `input`    | `border-strong`          |
| `ring`               | `ring-focus`             |

Run the shadcn CLI from the repo root, review the diff, and translate classes
before shipping. Use `--overwrite` only when the user asks for an upstream
reset.

## Typography

- Metric is the UI and body font. Family, regular weight only, is the serif for
  app names, headings, table narration, and titles. No third font, no bold
  serif, no monospace anywhere in product UI.
- Inputs, textareas, and native selects stay `0.875rem` on every breakpoint.
- Keep `tracking-[-0.01em]` aligned with `font-serif` and the heading styles.
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

- `shadow-press`, a 1px hard stamp, marks default and primary buttons, active
  tab-like controls, popovers, tooltips, and toasts. On press, stamped controls
  shift 1px and drop it; circular icon controls may scale instead.
- Cards use borders, not shadows. Modals use `shadow-modal`, detail posters
  `shadow-poster`, drawers `shadow-drawer`.

## Shapes

- 2px: checkbox indicators and tiny marks
- 4px: buttons, inputs, cards, result cards
- 6px: tab triggers and select-like controls
- 8px: nested detail rows; the maximum for non-modal cards
- 12px: desktop modals and drawer tops
- full: circular icon controls and intentional pills

## Components

Reuse before writing markup: `Button`, `IconButton`, `Tabs`/`TabsList`/
`TabsTrigger` and `SortRow` for mode and sort controls, `NativeSelect`,
`Empty` or `EmptyState`, `Alert` and `UserErrorAlert`, `Skeleton`,
`PosterCard`, and `ResponsiveModal`, `SettingsModal`, or the shadcn dialog and
drawer primitives for overlays.

Use lucide icons with component-supported sizing and `data-icon` where
expected. No emoji icons beyond existing moments such as the results-table
action-column marker.

## Loading transitions

- Keep known controls mounted and disabled while settings load.
- Skeletons match loaded card geometry at each breakpoint, including metadata
  and action rows.
- Movie and TV details keep a viewport-bounded frame with a scrolling body.
- Settings size to content under a viewport limit, with no fixed-height gaps;
  errors stay with the failing section, and the footer holds links and version.
- Search and catalog content reserve at least one viewport so a short response
  does not pull the footer up.
