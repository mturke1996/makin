# Access control

Who may see and do what, and how that is enforced. This replaces the old PIN "app lock" and the
"hide from employees" flags, which only hid things in the browser.

## The idea

Every person has a **role** and, if they are an employee, a list of **permissions** stored in their
profile (`users/{uid}`):

| Role | What they can do |
|------|------------------|
| `admin` | Everything, including users, branding and the audit log. |
| `employee` | Exactly the permissions in their list. No list stored: the default set (`clients.view`, `expenses.create`, `custody.view.own`). |

A profile document with no `role` is the original owner and counts as admin (a legacy rule the app and the
Firestore rules share).

Two layers take the **same** decisions:

1. **The server decides** (`firestore.rules`, `storage.rules`). Nothing a browser does can widen it.
2. **The screens offer only what works** (`src/core/access`). A button that the server would refuse is not shown.

The pure rules of the model live in `src/core/access/` and are unit-tested; the Firestore rules are
tested on the emulator with the app's real queries (`tests/rules/`).

## Permissions

Each area is a ladder: `view` < `manage` < `delete`. Granting a rung grants the ones below, and a
permission also pulls in what it cannot work without (`requires`): the editor and `normalizePermissions`
do this, so a stored list is always consistent. The Firestore rules do **not** expand a list, they read
it as stored, which is why every writer normalizes first.

Prerequisites worth knowing:

- Anything that shows a client name needs `clients.view` (so it is part of the default set).
- `custody.view.own` needs `expenses.create`: a balance is deposits minus the person's expenses.
  `custody.manage` also needs `expenses.view.all` (it computes everyone's balance).
- `clients.delete` needs the right to delete everything that hangs from a client (invoices, payments,
  debts, expenses, workers, projects, letters, custody), because deleting a client removes all of it
  from the browser. There is no Cloud Function behind it.

| Area | Permissions |
|------|-------------|
| Clients | `clients.view`, `clients.manage`, `clients.delete` |
| Invoices | `invoices.view`, `invoices.manage`, `invoices.delete` |
| Payments | `payments.view`, `payments.manage`, `payments.delete` |
| Expenses | `expenses.create` (record, edit, delete and see **own** open expenses), `expenses.view.all`, `expenses.edit.all`, `expenses.delete.all` |
| Debts | `debts.view`, `debts.manage`, `debts.delete` |
| Workers | `workers.view` (sees every payment made to a worker), `workers.manage` |
| Custody | `custody.view.own`, `custody.manage` |
| Letters | `letters.view`, `letters.manage` |
| Projects | `projects.view`, `projects.manage` |
| Reports | `reports.view` |

Templates in the user editor (a starting point, always editable): field employee, project supervisor,
accountant, viewer. See `PERMISSION_TEMPLATES`.

### Expenses are owned

An expense belongs to the user whose uid is in `userId`.

- `expenses.create`: record under your own uid, edit and delete **your own open** expenses, and see them.
- `expenses.view.all`: see everyone's expenses, open the expense invoices and read the users directory.
- Expenses bundled into an expense invoice (`isClosed`) are frozen: nobody edits or deletes one from the
  app. `expenses.edit.all` may reopen it (by deleting its expense invoice). Two server-side exceptions keep
  the housekeeping working: `expenses.edit.all` may refresh only the author name on a closed expense
  (renaming a user), and `expenses.delete.all` may delete one (removing a client). Removing a **user**
  keeps their closed expenses, because they are part of a financial document.
- Old expenses without a `userId` are visible only to people who see all expenses. Nothing can prove they
  are an employee's own, so an employee with only `expenses.create` does not see them.
- Quick add (the **+** button on the home screen) records an expense under the signed-in user. People who
  may see everyone's expenses can pick another employee; the server still checks `userId` on create.
- Expenses carry the invoice number typed by hand; the app no longer uploads invoice photos. Attachments saved on older expenses still open and are removed with their expense.

### Other rules worth knowing

- Recording a payment also moves the invoice status, so `payments.manage` may update exactly `status` and
  `updatedAt` on an invoice.
- Custody (`global_fund_transactions`, `user_balances`): `custody.manage` sees and edits everyone's;
  `custody.view.own` only the records with their own `userId`.
- `users`: everyone reads their own profile; the directory needs `expenses.view.all` or `custody.manage`;
  only admins create, change or delete users.
- `audit_logs` is append-only: anyone registered adds entries in their own name, only admins read, nobody edits or erases.
- There is no catch-all rule: a collection that is not named is closed to everyone.

## How data reaches the browser

Firestore rules are not filters: a query must itself be provably inside what the rules allow. So each
person's browser asks only for what they may see (`src/core/access/dataPlan.ts`):

- an employee with only `expenses.create` subscribes to `expenses where userId == me`;
- someone who views workers also subscribes to `expenses where workerId != null`;
- someone with no permission for a collection does not subscribe to it at all.

The stores (`useDataStore`, `useGlobalFundStore`) follow that plan and re-subscribe when a person's
permissions change (the profile is a live listener). Sorting happens in the browser, because an equality
filter plus a server sort would need a composite index per collection.

Consequence for screens: the store holds only what the person may download. A total computed from a
partial set must not be shown as if it were complete; show a clearly personal figure, or nothing.

## Changing the model

1. Add the permission to `src/core/access/permissions.ts` (label, hint, `requires`).
2. If it opens a screen, map it in `modules.ts`; if it scopes data, add it to `dataPlan.ts` and `policy.ts`.
3. Mirror it in `firestore.rules` (and `storage.rules` for files).
4. Extend `tests/rules/` (the plan replay covers new queries automatically) and `src/core/access/access.test.ts`.
5. Gate the buttons with `useAccess().can('...')`.

`npm run test:rules` runs the rules tests on the Firestore and Storage emulators (needs Java). Run it, with `npm test`, before every push: there is no CI.
Every rule was checked by mutation: weakening any of them makes a test fail.

## Deploying

Order matters. The new rules refuse the old app's unscoped queries, so:

1. Deploy the new app first (push to `main`).
2. Then publish the rules by hand: `npx firebase-tools login`, then
   `npx firebase-tools deploy --only firestore:rules,storage --project company-test-adafd`.
3. Existing employees keep working with the default set; open **المستخدمون** and grant each person what they need.

The retired PIN lock stored its PIN in `settings/appLock`. An admin session deletes that document on sign-in.
There is no PIN any more: sign-in plus the role and permissions above is the whole model.

## Known limits

- Roles and permissions are changed only by admins; there is no self-service.
- A user who is signed in but has no profile document sees an explanation and nothing else.
- Worker balances are exact because `workers.view` receives every worker payment; that is what that permission means.
- Storage: expense attachments are readable by any registered user who knows the file path
  (`expenses/{expenseId}/...`); the path is not guessable and Firestore decides who learns it.
