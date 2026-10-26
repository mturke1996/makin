# MAKIN

نظام إدارة شركة **MAKIN** للمقاولات والإنشاءات: العملاء والمشاريع، الفواتير، المدفوعات، المصروفات، العهد، الديون، الرسائل، والمستخدمون بصلاحيات.

React + TypeScript + Vite + Firebase (Auth + Firestore) · RTL · PWA.

## Highlights

- React 18 + TypeScript + Vite -- modern, fast, type-safe
- Tailwind CSS + MUI v7 -- design-system primitives with a legacy bridge
- Dynamic white-label engine -- brand name, logo, colors, Firebase config all swappable at runtime
- GSAP motion with @gsap/react for cleanup-safe animation
- Firebase Auth + Firestore (per-tenant config)
- PWA -- add to iPhone home screen for a native-app feel
- Arabic RTL first-class (Tajawal font) with English LTR support
- Mobile-first with iOS safe-area handling, 44px+ touch targets
- 10+ business modules: invoices, clients, payments, expenses, debts, letters, fund, users

## Architecture

```
src/
  config/          BrandConfig + BrandProvider + firebase.ts
  design-system/   tokens + primitives (see DESIGN.md)
  core/            motion (GSAP), agent, memory, hooks, utils
  stores/          Zustand (auth, data, brand, theme, app-lock, fund)
  services/        Firebase CRUD services
  features/        pdf/ + print/ (brand-driven)
  ui/              shells, nav, brand, feedback, pages, pages-legacy
  types/
```

## Run locally

```
npm install
npm run dev
```

Open http://localhost:3000

## White-label in 30 seconds

Option A -- in the app: sign in, open /settings/branding, live-edit name, logo, colors, Firebase config. Changes apply instantly and persist per browser.

Option B -- env vars (recommended for production). Create `.env.local`:

```
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_STORAGE_BUCKET=...
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...
VITE_FIREBASE_MEASUREMENT_ID=...
```

Env vars always win over the in-app override or the compiled default.

Option C -- baked-in default: edit `src/config/brand.config.ts` and rebuild.

## Deploy to Vercel

1. Push this repo to GitHub.
2. Go to https://vercel.com/new and import the repo.
3. Framework preset: Vite (auto-detected).
4. Build command: `npm run build` -- Output directory: `dist`.
5. Add the 7 env vars above under Settings / Environment Variables.
6. Deploy.

SPA rewrites and cache headers are pre-configured in `vercel.json`.

## Access control and rules

Who may see and do what (roles, permissions, owned expenses) is described in [ACCESS.md](ACCESS.md). The
rules are tested on the emulators with `npm run test:rules`.

Deploy the app first, then publish the rules (they refuse the old app's unscoped queries):

```
npm install -g firebase-tools
firebase login
firebase deploy --only firestore:rules,storage
```

## Preserved modules

| Module    | Route                                         |
| --------- | --------------------------------------------- |
| Dashboard | /                                             |
| Clients   | /clients, /clients/:id                        |
| Invoices  | /invoices, /invoices/new, /invoices/:id       |
| Payments  | /payments                                     |
| Expenses  | /expenses                                     |
| Debts     | /debts                                        |
| Fund      | /fund                                         |
| Letters   | /letters                                      |
| Users     | /users                                        |
| Branding  | /settings/branding                            |

PDF generators (invoice, letter, client reports) are fully brand-driven.

## License

MIT.


## MAKIN setup

1. `cp .env.example .env.local` and fill the `VITE_FIREBASE_*` keys of the **new MAKIN Firebase project** (Console → Project settings → Your apps → Web app).
2. In Firebase Console enable **Authentication → Email/Password**, and create **Firestore** and **Storage**.
3. Create the first admin: add a user in Authentication, then in Firestore create `users/{that uid}` with `{ email, displayName, role: "admin" }`. Further users are added from the app (المستخدمين).
4. Put the project id in `.firebaserc`, then deploy the rules: `npx firebase-tools deploy --only firestore:rules,firestore:indexes,storage`.
5. `npm install && npm run dev`.

## Try it locally without Firebase

```
npm run emulators          # terminal 1: local Auth + Firestore + Storage (needs Java)
npm run seed:emulators     # terminal 2: sample clients, expenses, payments, workers
npm run dev:emulators      # terminal 2: app on http://localhost:3000
```

Sign in with `admin@makin.test` / `Makin#1234`. All data is invented and lives only in the emulator.

## Brand

- Identity guide and logo sheet: `brand/MAKIN-Brand-Identity.pdf`, `brand/MAKIN-Logo.pdf`.
- Icons: Phosphor, one Regular weight (`src/design-system/icons.tsx`, same names the screens already used).
- Palette follows Linda Shop (deep ink `#1F2633`, gold `#C9972B`, warm neutrals), Cairo font.
- Regenerate icons: `node scripts/generate-brand-assets.cjs`. Regenerate PDFs: `PHOSPHOR_DIR=<@phosphor-icons/core>/assets/regular node scripts/generate-brand-pdfs.cjs`.

### Tests

- `npm test`: unit and screen tests (fast, no network).
- `npm run test:rules`: the Firestore and Storage rules against the emulator.
- `npm run test:e2e`: the money screens in a real browser against the real rules (approve, reject, add, delete, offline).
  Start `npm run emulators`, run `npm run seed:emulators` once, then `npm run dev:emulators`, and run it in another terminal.
