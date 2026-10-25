# Product

register: product

## What this is

A white-label workspace for contracting and project-services businesses. One company runs clients (projects), invoices, payments, expenses, workers, debts and **custody** (عهدة: cash handed to an employee that their expenses are deducted from). It is an installable PWA, Arabic-first (RTL), with Firebase behind it.

## Users

- **Owner / admin.** Reviews the whole business: what each client owes, what was spent, who holds how much custody, what each worker is still owed. Works on a desktop at a desk and on a phone between sites.
- **Field employee.** Records expenses against a client from the site, often one-handed, in bright daylight, on a mid-range Android phone with an unreliable connection. Sees only their own entries (admin expenses are hidden from them).
- **Accountant / bookkeeper.** Reads ledgers, exports PDF/Excel, reconciles custody and worker payments.

## Purpose

Make money movement legible and hard to get wrong. Every screen answers: *how much, between whom, why, and what is left.*

## Tone

Calm, precise, trustworthy. A good paper ledger, not a dashboard toy. Numbers are the content; chrome stays out of their way.

## Anti-references

- Generic SaaS dashboards: gradient hero banners, glowing blobs, grain, glassmorphism.
- Crypto/fintech neon, "hero metric" templates, identical grids of icon cards.
- Heavy dark chrome around light content; colored side-stripes on rows.
- Decorative motion, bounce, page-load choreography.

## Strategic principles

1. **Numbers first.** Amounts are large, tabular, correctly signed in RTL, and colored only when the color carries meaning (received / spent / owed).
2. **One place per fact.** A custody balance, a worker's remaining amount, a client's deficit: computed once in `src/core/finance`, shown the same everywhere.
3. **Progressive disclosure.** Lists show the decision-making figure; details open on demand (sheets, profiles). No screen dumps every record at once.
4. **Thumb-first on phones.** Primary actions live in the bottom half; targets are at least 44px; forms use the right keyboard.
5. **Never lose input.** Forms keep what the user typed on error; destructive actions are confirmed and say what will be deleted.
6. **Same vocabulary everywhere.** One button, one field, one row, one sheet. If "save" looks different on two screens, one is wrong.
7. **Arabic is not a translation layer.** Copy is written in Arabic first, short, concrete, no em dashes.
