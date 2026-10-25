# Design system: "Calm ledger"

Source of truth for every screen. Tokens live in `src/index.css` (CSS variables) and `tailwind.config.js`; components in `src/design-system/primitives`. Read `PRODUCT.md` first. Design laws come from `skills/impeccable` (product register). The owner's current visual reference is `linda-shop-main`: Cairo, compact type, warm neutral surfaces, modest radii, and quiet outlined controls.

## Principles

- **Restrained color.** Tinted neutrals + one accent (the brand primary, ≤10% of a screen) + semantic colors that mean something. Never `#000` / `#fff`.
- **Hairlines over shadows.** Separation = 1px border or space. Shadow only for overlays (sheets, menus, toasts).
- **Typography is the hierarchy.** Size + weight + space, not boxes. One font family: Cairo, variable (Arabic + Latin + numerals), self-hosted. Its digits are tabular by default, which money columns need: check that before changing the family.
- **Cards match Linda Shop.** Statistics use separate `StatCard` tiles; content uses `Card` with Linda's header/content spacing. Client record navigation uses icons, not statistic cards. Keep record lists in `ListGroup`.
- **Motion states, not decorates.** 90–280ms, ease-out only, transform/opacity only. No bounce, no page-load choreography. Honor `prefers-reduced-motion` (already global).

## Bans (match and rewrite)

- Colored side-stripes (`border-inline-start/end` > 1px as an accent on rows/cards/callouts). Use a leading Avatar/icon, a soft tinted background, or nothing.
- Gradient backgrounds on UI surfaces, gradient text, glow/blur blobs, grain, glassmorphism (frosted is only for fixed bars over scrolling content). Owner-pinned exception: the client identity header directly follows Rkeaz's dark gradient and bezel, scoped to `.client-profile-frame`.
- Hero banners with a big number + gradient. Use `PageHeader` (+ `FigureStrip` when figures matter). One owner-approved exception: the custody screens (`pages-legacy/fund/HeroPanel`) open with a solid brand panel, no gradient, once per screen.
- Identical icon-card grids. Prefer `ListGroup`/`ListRow`.
- Modal as a first thought. Prefer inline expansion / a `Sheet`. `Modal` is for confirmations and tiny forms.
- Font sizes below 12px for body or fields. Linda's 11px `text-3xs` is reserved for statistic hints and small priority/change badges, per the owner's matching brief.
- Em dashes (—) and `--` in UI copy. Use commas, colons, periods.
- `tracking-*` on Arabic text (breaks letter joining). Letter-spacing is already neutralized.
- Display fonts or decorative type in labels, buttons, data.

## Tokens

Use semantic Tailwind utilities, not raw colors.

| Need | Utility |
|---|---|
| Page background | `bg-surface-canvas` |
| Panel / row surface | `bg-surface-panel` (+ `border border-border`) |
| Filled input / sunken area | `bg-surface-sunken` |
| Hover / pressed wash | `bg-surface-hover` |
| Text: primary / secondary / tertiary | `text-fg` / `text-fg-subtle` / `text-fg-muted` |
| Accent fill + its text | `bg-accent text-accent-on` (hover `bg-accent-hover`) |
| Accent tint + ink | `bg-accent-soft text-accent-ink` |
| Semantic tint + ink | `bg-success-soft text-success-ink`, `danger`, `warning`, `info` |
| Solid semantic | `bg-danger text-accent-on` (warning: `bg-warning text-warning-on`) |
| Borders | `border-border` (hairline), `border-border-strong` |
| Scrim | `bg-surface-scrim` |

Money meaning: **received / positive balance = success**, **spent / owed / deficit = danger**, **pending / attention = warning**, **neutral facts = fg**. Never use color alone: pair with a sign, label or icon.

Dark mode is derived automatically (accents are lifted per theme). Never hard-code `text-white` on a brand/semantic fill: use `text-accent-on`. Never hard-code light-only colors.

### Type scale (fixed rem, ratio ≈ 1.2)

`text-2xs` 12 (captions, floor) · `text-xs` 13 (metadata) · `text-sm` / `text-base` 14 (labels, controls, body) · `text-md` 16 · `text-lg` 18 (section titles) · `text-xl` 20 (phone page title, key figures) · `text-2xl` 24 (desktop page title) · `text-3xl` 30 · `text-4xl` 40 (single key figure).
Weights: 400 body, 500 labels, 600 row titles/buttons, 700 titles/figures. Numbers: `tabular-nums` (use `<Amount>`).

Statistic cards follow Linda: 104px minimum height, 14px padding, 8px internal gap, 12px/500 labels, 24px/600 figures and 11px hints. `StatCard` fits a long figure to its measured width down to 14px, lets currency wrap independently, and wraps exceptionally long numbers without hiding digits. It never changes the financial value. The client page follows Linda's full-width header and 2-column phone / 4-column desktop summaries, instead of the former sticky identity column.

The product uses a fixed scale, without a font-size selector, as requested by the owner. Browser zoom remains available. Inputs on phones stay 16px to avoid iOS automatic zoom. Do not truncate a page title, a primary action, or a financial label to make it fit.

The client profile follows Rkeaz's actual composition, with no page-level tabs. Its header component is ported from `rkeaz-group`: centered identity and full contact rows on phones, compact inline identity on desktop, dark gradient and bezel, and phone creation actions. The continuous main column contains the financial board, priorities, then icon entry points and grouped project services. The board groups four primary totals above debts and permitted worker dues, retaining Linda's statistic geometry and measured long-number fitting. It always uses the actual account balance after debts and the agreed percentage. On desktop a 12-column grid gives the main column 8/9 columns and the action/report rail 4/3; on phones the rail follows the main content. Desktop quick actions and shortcuts, the full report and project details occupy the rail. Record icons remain usable during loading and empty states. Financial columns adapt to their container width, including the narrower area beside the rail. Loading placeholders follow this same composition.

### Shape & space

Radii: controls `rounded-md` (8), panels `rounded-lg` (12) / `rounded-xl` (16), sheets `rounded-3xl` (24), pills `rounded-full`. Spacing is a 4px grid: 20px between top-level phone blocks and 24px on wider screens, 12px inside a block, 16px gutters on phones.

Touch: every interactive element ≥ 44×44 CSS px (visually smaller icons get padding). Inputs 48px (`lg` 56px), buttons at least 44/44/48, growing vertically when text wraps.

## Components (import from `src/design-system/primitives`)

| Component | Use |
|---|---|
| `PageShell`, `PageHeader` | Page frame + 20px phone / 24px desktop title, one muted line, actions at inline end. On phones the TopBar already shows back/menu; the page title lives in `PageHeader`. |
| `Section` | Titled group (`text-lg` title, optional action). |
| `StatCard`, `FigureStrip` | Separate Linda-style statistic cards. `FigureStrip` retains its data API and renders the same cards. |
| `ListGroup` + `ListRow` | The default list. Row = leading (Avatar/icon) · title · subtitle · meta · trailing amount · chevron. |
| `Avatar` | Initial in a stable tint; `shape="entity"` for companies/projects. |
| `Badge` | 12px status pill: `tone` neutral/brand/success/warning/danger/info, optional `dot`. |
| `Segmented` | Filters/tabs. `layout="equal"` (2–4 options, sliding thumb) or `"scroll"` (chips). |
| `Button` / `IconButton` | One shape everywhere. `primary` once per view; `secondary`, `outline`, `ghost`, `danger-soft`, `danger`. |
| `Input` / `Select` / `Textarea` / `Field` | Filled fields, 16px text (no iOS zoom), label above, `error`/`hint` text. `calculator` prop on amount inputs. |
| `Amount` | THE way to show money: LTR-isolated number (negatives read `−1,250`), tabular, quiet currency symbol. `tone="auto"` colors by sign. |
| `ProgressBar` | Thin track, transform-animated, RTL-aware. |
| `EmptyState` | Icon + what goes here + how to add the first item + action. |
| `Sheet` | Forms and detail views. Mobile: full-screen or `mobile="bottom"` (drag to dismiss). Desktop: centered panel. |
| `Modal` | Confirmations and tiny forms only. |
| `Skeleton*` | Loading placeholders that match the final layout. Never a centered spinner over content. |

## Screen patterns

- **List screen:** `PageHeader` (title + primary action) → optional `Segmented`/search → `ListGroup`. Sort by what matters (newest, largest balance). Show one decision figure per row.
- **Detail / profile screen:** identity block (Avatar, name, status) → money summary (`FigureStrip` or a single labeled breakdown) → sections of `ListGroup`s → destructive actions last and quiet.
- **Form (Sheet):** one column, grouped by purpose with `Section`-style small titles, primary `Button` pinned in the footer, validation text under the field, amounts use `Input calculator`.
- **Ledger / timeline:** group by month (sticky small month header), one row per entry with signed `Amount`, running balance as `text-xs text-fg-muted`.
- **Empty / error / loading:** every list has all three. Errors say what happened and offer a retry.

## RTL & Arabic

- Layout uses logical properties (`ms-/me-/ps-/pe-/start-/end-`, `text-start`), never `left/right` for meaning. Directional icons (back, chevrons, trending) flip via `rtl-flip` or the chosen RTL icon variant.
- Numbers keep Latin digits and are isolated (`<Amount>`, `<bdi dir="ltr">` for phones/codes).
- Copy: short imperative verbs ("أضف دفعة"), concrete nouns ("المتبقي للعامل"), no filler ("نظرة عامة على…"), no em dashes. Dates `DD/MM/YYYY`.
- Test every screen at 390px RTL, then 1440px; also with browser zoom 130% to catch clipping.

## Motion

| Moment | Duration | Curve |
|---|---|---|
| Press feedback (`active:scale-[0.98]`) | 140ms | `ease-out` |
| Hover/focus color | 140ms | `ease-out` |
| Reveal / expand | 200ms | `ease-out` |
| Sheet in / out | 320 / 220ms | `ease-ios` / `ease-in` |
| Segmented thumb, progress | 200 / 280ms | `ease-out` |

Animate only `transform` and `opacity` (never width/height/top/left; use `grid-template-rows` for height reveals). Lists may stagger with the `.stagger` class (`--i` per child) once on first paint, never on every update.

## Accessibility

Contrast ≥ 4.5:1 for text (the `*-ink` tokens exist for this), visible focus (`focus-visible:shadow-focus`, already global), real `<button>`/`<a>` for actions, `aria-label` on icon-only buttons, status never color-only, `prefers-reduced-motion` respected.
