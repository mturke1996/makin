import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * Source-level guards for the expenses and client-profile screens. They are cheap and they keep the
 * old "hide it in the browser" ways from creeping back: the screens must ask the access policy, and
 * the users directory must only be subscribed to through its one gated hook.
 */
const PAGES = join(__dirname, '..');
const FILES = [
  join(PAGES, 'ExpensesPage.tsx'),
  join(PAGES, 'ExpenseInvoicesPage.tsx'),
  join(PAGES, 'ClientProfilePage.tsx'),
  ...walk(join(PAGES, 'money'), ['ExpenseFormSheet.tsx', 'ExpenseInvoiceDetailSheet.tsx', 'ExpenseInvoiceSheet.tsx', 'ExpenseRow.tsx']),
  ...walk(join(PAGES, 'client-profile')),
];

function walk(dir: string, only?: string[]): string[] {
  const out: string[] = [];
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) out.push(...walk(full, only));
    else if (/\.tsx?$/.test(name) && !/\.test\./.test(name) && (!only || only.includes(name))) out.push(full);
  }
  return out;
}

const sources = FILES.map((file) => ({ file: relative(PAGES, file).replace(/\\/g, '/'), text: readFileSync(file, 'utf8') }));

describe('expenses and client profile use the access policy', () => {
  it('reads every file it expects to guard', () => {
    expect(sources.length).toBeGreaterThan(40);
  });

  it('no file touches the removed app lock, usePermissions, or the per-expense visibility fields', () => {
    const banned = [
      'useAppLockStore',
      'AppLockGuard',
      'usePermissions',
      'core/permissions',
      'filterVisibleExpenses',
      'canUserViewExpense',
      'isExpenseByEmployee',
      'getExpenseBadgeInfo',
      'isHiddenFromEmployees',
      'createdByRole',
    ];
    const hits = sources.flatMap(({ file, text }) => banned.filter((word) => text.includes(word)).map((word) => `${file}: ${word}`));
    expect(hits).toEqual([]);
  });

  it('subscribes to the users directory only through the gated hook', () => {
    const direct = sources.filter(({ text }) => /collection\(\s*db\s*,\s*['"]users['"]/.test(text)).map(({ file }) => file);
    expect(direct).toEqual(['client-profile/useUsersDirectory.ts']);

    const hook = sources.find(({ file }) => file === 'client-profile/useUsersDirectory.ts')!.text;
    // nothing is subscribed unless the caller says the person may read the directory
    expect(hook).toMatch(/if \(!enabled\)[\s\S]*return;[\s\S]*onSnapshot/);
  });

  it('the screens that need the directory ask for it with the policy answer', () => {
    const users = (file: string) => sources.find((s) => s.file === file)!.text;
    expect(users('client-profile/useClientProfileData.ts')).toContain('useUsersDirectory(access.canViewDirectory)');
    expect(users('ExpensesPage.tsx')).toContain('useUsersDirectory(seesAll && access.canViewDirectory)');
  });
});
