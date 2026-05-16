---
version: alpha
name: chill.institute
description: Code-first design system for chill.institute and binge.institute.
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
  borderDark: "#44403c"
  darkApp: "#292524"
  darkSurface: "#1c1917"
  darkForeground: "#f5f5f4"
  rating: "#f59e0b"
  success: "#16a34a"
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
    rounded: "{rounded.sm}"
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
  error-state:
    backgroundColor: "{colors.error}"
---

## Overview

`chill.institute` and `binge.institute` are sibling products, not twins. They share the same stone-and-paper material, Metric and Family typography, hard 1px borders, compact controls, and stamped button motion. They split by job:

- `chill.institute` is the search utility. It is compact, table-first on desktop, and card-first on mobile.
- `binge.institute` is the catalog browser. It is image-first, warmer, and built around poster grids and detail modals.

This file is for agents and external design tools. The implementation source of truth is still the code:

- Tokens, fonts, theme colors, motion, heading styles: `packages/ui/src/styles.css`
- shadcn/base components: `packages/ui/src/components/ui/`
- shared Institute components: `packages/ui/src/components/`
- chill-only surfaces: `apps/chill/src/components/`
- binge-only surfaces: `apps/binge/src/components/`

If this file conflicts with current code, trust the current code and update this file deliberately.

## Colors

Stone neutrals do almost all the work. Light mode uses a stone-300 app background, stone-100 surfaces, stone-950 text, and a hard stone-950 border. Dark mode uses stone-800 app background, stone-900 surfaces, stone-100 text, and stone-700 borders.

Use semantic utilities from `packages/ui/src/styles.css`, such as `bg-app`, `bg-surface`, `text-fg-1`, `text-fg-3`, `border-border-strong`, `border-border-faint`, `text-success`, and `text-error`. Do not introduce raw blue, indigo, gray, slate, purple, or marketing-gradient palettes.

Accents are sparse and semantic:

- amber only for ratings and filled star icons
- green only for successful transfer states or put.io follow-up actions
- red only for destructive, error, and matrix-loader states
- hot pink and purple are brand reserve for assets or special moments, not product chrome

Use gradients only for movie and TV detail image scrims. Use blur only for the binge sticky header, image scrims, and overlay primitives that already own it.

## shadcn Compatibility

The repo uses source-owned shadcn/base components with Tailwind v4. `components.json` has `cssVariables` enabled, and `packages/ui/src/styles.css` exposes shadcn-compatible aliases (`background`, `foreground`, `card`, `popover`, `primary`, `secondary`, `muted`, `accent`, `destructive`, `border`, `input`, and `ring`) that resolve back to the Institute tokens.

When importing or updating upstream shadcn components, treat those aliases as a bridge, not a second design language. Prefer the Institute utilities in committed code:

- `background` maps to `app`
- `foreground` maps to `fg-1`
- `card` and `popover` map to `surface`
- `secondary` and `muted` map to `surface-2`
- `accent` maps to `hover`
- `primary` maps to `fg-1` with `fg-inverse`
- `destructive` maps to `error`
- `border` and `input` map to `border-strong`
- `ring` maps to `ring-focus`

Run the shadcn CLI from the directory that owns the target `components.json`, inspect generated diffs, and adapt class names to the Institute vocabulary before shipping. Do not run `--overwrite` unless the user explicitly asks for a full upstream reset.

## Typography

Metric is the UI and body font. Family is the serif display font for app names, headings, table narration, and movie or show titles. Family only uses regular weight.

Use lowercase for most product labels: `movies`, `tv shows`, `source`, `seeders`, `and chill`, `send to put.io`, `settings`. Longer human-facing headings can use sentence case. The voice should sound like one operator running a useful thing, not a SaaS brand.

Do not add a third font. Do not bold serif headings. Keep `tracking-[-0.01em]` behavior aligned with the existing `font-serif` and heading styles in `packages/ui/src/styles.css`.

## Layout

Keep the apps utilitarian and dense. `chill.institute` should keep search and result scanning central. `binge.institute` should keep catalog browsing central. Avoid marketing sections, testimonial blocks, oversized hero layouts, and decorative filler.

Use the lightest surface that works:

- whitespace for related groups
- borders and separators for sibling groups
- recessed or faint surfaces for secondary panels
- bordered cards only for independent objects, interactive items, modals, and mobile result cards

Shared layout vocabulary lives in app-local shells and shared primitives. Promote a component to `packages/ui` only when it is presentational and clearly shared between the two apps. Keep API, auth, queries, and app-specific behavior out of `packages/ui`.

## Elevation & Depth

The signature depth is the press stamp: `shadow-press`, a 1px by 1px hard shadow. It belongs on default and primary buttons, active tab-like controls, popovers, tooltips, and toasts that need the stamped Institute feel.

Cards usually have borders, not shadows. Modals use `shadow-modal`. Poster images inside detail modals use `shadow-poster`. Drawers use `shadow-drawer`.

Press behavior matters: stamped controls translate by 1px and drop the stamp shadow. Circular icon controls may scale slightly instead.

## Shapes

The default radius is compact:

- 2px for checkbox indicators and tiny marks
- 4px for buttons, inputs, cards, and result cards
- 6px for tab triggers and select-like controls
- 8px for nested detail rows
- 12px for desktop modals and drawer tops
- full radius only for circular icon controls and intentional pills

Do not drift into soft rounded SaaS cards. Keep cards at 8px or less unless they are modal-scale surfaces.

## Components

The repo uses shadcn/base with Tailwind v4, lucide icons, and source-owned components. Run shadcn commands from the package or app whose `components.json` matches the work:

- `packages/ui/components.json` owns reusable UI primitives under `packages/ui/src/components/ui`
- `apps/chill/components.json` and `apps/binge/components.json` point app work at app-local components while resolving UI primitives to `@chill-institute/ui/components/ui`

Prefer existing components before creating markup:

- `Button` for actions
- `IconButton` for icon-only actions
- `Tabs`, `TabsList`, `TabsTrigger`, `SortPill`, and `SortRow` for compact mode and sort controls
- `Select`, `SelectGroup`, and `SelectItem` for option menus
- `Empty` or `EmptyState` for empty states
- `Alert` and `UserErrorAlert` for errors
- `Skeleton` for loading placeholders
- `PosterCard` for catalog tiles
- `ResponsiveModal`, `SettingsModal`, and shadcn dialog/drawer primitives for overlays

Use lucide icons. Icons inside buttons should use component-supported sizing and `data-icon` where the component expects it. Do not use emoji as icons except the existing personality moments, such as the results-table action-column marker.

## Do's and Don'ts

Do:

- read this file before external design work
- inspect current code before trusting older mockups
- use semantic tokens and existing variants
- keep UI copy lowercase and direct
- keep cards bordered, compact, and purposeful
- keep `packages/ui` presentational
- preserve the difference between chill's search utility and binge's catalog browser

Do not:

- copy raw CSS or HTML from historical Claude design exports into the app
- introduce new palettes, gradients, glass, glow, or decorative illustration systems
- build a landing page where a tool surface belongs
- put app data fetching, auth, or API coupling in `packages/ui`
- override shadcn component colors through one-off class strings when a token or variant should exist
- re-create shared primitives in app code without checking `packages/ui` first
