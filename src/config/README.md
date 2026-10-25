# `src/config/` — White-Label Config Engine

This folder is the **single source of truth** for everything brand-related.

## Files

| File | Role |
|------|------|
| `brand.types.ts`   | `BrandConfig` interface — the shape of a tenant |
| `brand.config.ts`  | Compile-time default brand ("Acme") |
| `BrandProvider.tsx` | React context provider + document sync |
| `firebase.ts`      | Initializes Firebase from the active brand (env vars win) |

## How it works

1. `brand.config.ts` exports a `DEFAULT_BRAND: BrandConfig` — the baseline every build ships with.
2. `useBrandStore` (in `src/stores/useBrandStore.ts`) deep-merges a persisted `override` with the default. The result is the live, fully-materialized `brand`.
3. `BrandProvider` subscribes to the store and calls `applyBrandToDocument(brand)` on every change — which writes CSS variables, sets `<html lang/dir>`, updates `document.title`, and syncs the PWA theme-color meta.
4. `applyBrandToDocument` writes only the brand *bases* (`--brand-primary-base`, …). `src/index.css` derives hover/soft/ink tints and the dark-mode lift from them, so any palette works in both themes. MUI is used for its icon set only; there is no MUI theme.

## Adding a new brand field

1. Add the field to `BrandConfig` in `brand.types.ts`.
2. Default it in `brand.config.ts`.
3. (Optional) Add a form row to `src/ui/pages/BrandingSettingsPage.tsx` so end-users can edit it live.
4. (Optional) Map it to a CSS variable in `src/design-system/theme/applyBrand.ts`.

## Per-tenant Firebase

`firebase.ts` priority order:
1. `import.meta.env.VITE_FIREBASE_*` (production deployment)
2. `useBrandStore.getState().brand.firebase` (in-UI override)
3. `DEFAULT_BRAND.firebase` (placeholder)

Env vars always win. This lets you build one image and deploy N tenants by
only swapping env vars.
