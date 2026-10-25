# `src/design-system/`: primitives and brand bridge

The visual contract ("Calm ledger") lives in `DESIGN.md` at the repo root; read it first.
This folder is the code side of it.

- **Tokens** are CSS variables in `src/index.css`, exposed as semantic utilities by `tailwind.config.js`
  (`bg-surface-panel`, `text-fg-subtle`, `bg-accent`, `bg-success-soft text-success-ink`, ...).
  There is no TypeScript token layer: change the variable, not a copy of it.
- **Brand** colors come from `BrandConfig` through `theme/applyBrand.ts`, which writes only the
  `--brand-*-base` variables to `:root`. Hover, soft and ink tints and the dark-mode lift are derived in CSS,
  so any palette works in both themes.

## Primitives (`primitives/`)

Import from `primitives/index.ts`. Everything is a thin Tailwind component; MUI is used for its icon set only.

| Group | Components |
|-------|------------|
| Actions | `Button`, `IconButton`, `Switch` / `SwitchRow`, `Segmented`, `CalculatorPad` |
| Form | `Field`, `Input`, `Select`, `Textarea` |
| Layout | `PageShell`, `PageHeader`, `Section`, `Card`, `Surface`, `Stack`, `ListGroup` / `ListRow`, `FigureStrip` |
| Overlays | `Sheet` (forms, details), `Modal` (confirmations, tiny forms) |
| Data | `Amount` (LTR-isolated signed money), `Badge`, `Avatar`, `ProgressBar`, `Skeleton`, `EmptyState`, `ClientProfileHero` |

## Utilities (`utils/`)

- `useBackDismiss`: Android/browser Back closes the topmost overlay (one marker history entry per overlay).
- `useEscapeDismiss`: Escape closes only the topmost overlay.
- `useMountTransition`: mount/unmount with an enter/exit state, for transform/opacity transitions.
- `useScrollLock`: body scroll lock counter shared by overlays.

## Extending

- New primitive: add it to `primitives/`, export it from `primitives/index.ts`, and cover it in the QA audit
  (touch targets of at least 40px, no text under 12px, no horizontal overflow).
- New token: add the variable to `src/index.css` (light and dark), then map it in `tailwind.config.js`.
