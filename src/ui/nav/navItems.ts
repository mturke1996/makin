import {
  Home,
  People,
  Receipt,
  Payments as PaymentsIcon,
  AccountBalance,
  Description,
  ManageAccounts,
  RequestQuote,
  ReceiptLong,
  Inventory2,
  Settings,
  AddCircleOutline,
  History,
  Groups,
  HourglassEmpty,
  CloudUpload,
  Storefront,
  Insights,
} from '../../design-system/icons';
import { ComponentType } from 'react';
import type { AppModule } from '../../core/access/modules';
import type { Permission } from '../../core/access/permissions';
import type { Access } from '../../core/access/useAccess';

/** The part of `useAccess()` the navigation needs (a type only, so this file stays free of the auth store). */
export type NavAccess = Pick<Access, 'isAdmin' | 'can' | 'canAccessModule' | 'canUseExpenseInvoices'>;

export interface NavItem {
  /** Stable key (tests and QA scripts read it). */
  id: string;
  label: string;         // Arabic (default direction=rtl)
  labelEn: string;       // English fallback when direction=ltr
  path: string;
  icon: ComponentType<any>;
  /** Shown when the person can open this area of the app. No rule at all = everybody (Home). */
  module?: AppModule;
  /** Also needs this exact permission (a destination that only makes sense for people who can act). */
  permission?: Permission;
  /** Admins only: settings and the audit log. */
  adminOnly?: boolean;
  /** Also needs every one of these (a page built from several kinds of record). */
  allOf?: Permission[];
  /** Needs expense invoices (the same rule the route and the Firestore rules use). */
  expenseInvoices?: boolean;
}

const HOME: NavItem = { id: 'home', label: 'الرئيسية', labelEn: 'Home', path: '/', icon: Home };
/** The whole company at a glance: built from payments, every expense and the business figures, so it needs all three. */
const COMPANY: NavItem = { id: 'company', label: 'لوحة الشركة', labelEn: 'Company', path: '/company', icon: Insights, allOf: ['payments.view', 'expenses.view.all', 'reports.view'] };
const CLIENTS: NavItem = { id: 'clients', label: 'العملاء', labelEn: 'Clients', path: '/clients', icon: People, module: 'clients' };
const WORKERS: NavItem = { id: 'workers', label: 'مركز العمال', labelEn: 'Workers', path: '/workers', icon: Groups, module: 'workers' };
const INVOICES: NavItem = { id: 'invoices', label: 'الفواتير', labelEn: 'Invoices', path: '/invoices', icon: Receipt, module: 'invoices' };
const NEW_INVOICE: NavItem = {
  id: 'new-invoice',
  label: 'فاتورة جديدة',
  labelEn: 'New Invoice',
  path: '/invoices/new',
  icon: AddCircleOutline,
  module: 'invoices',
  permission: 'invoices.manage',
};
const PAYMENTS: NavItem = { id: 'payments', label: 'المدفوعات', labelEn: 'Payments', path: '/payments', icon: PaymentsIcon, module: 'payments' };
/** Who is late and by how long. Whoever sees payments also sees the clients list (the permission requires it), so debtors can be named. */
const RECEIVABLES: NavItem = { id: 'receivables', label: 'المتأخرات', labelEn: 'Receivables', path: '/receivables', icon: HourglassEmpty, module: 'payments' };
const EXPENSES: NavItem = { id: 'expenses', label: 'المصروفات', labelEn: 'Expenses', path: '/expenses', icon: ReceiptLong, module: 'expenses' };
const EXPENSE_INVOICES: NavItem = {
  id: 'expense-invoices',
  label: 'فواتير المصروفات',
  labelEn: 'Expense invoices',
  path: '/expenses/invoices',
  icon: Inventory2,
  expenseInvoices: true,
};
const FUND: NavItem = { id: 'fund', label: 'العهدات', labelEn: 'Fund', path: '/fund', icon: AccountBalance, module: 'balances' };
const DEBTS: NavItem = { id: 'debts', label: 'الديون', labelEn: 'Debts', path: '/debts', icon: RequestQuote, module: 'debts' };
const LETTERS: NavItem = { id: 'letters', label: 'الرسائل', labelEn: 'Letters', path: '/letters', icon: Description, module: 'letters' };
const USERS: NavItem = { id: 'users', label: 'المستخدمين', labelEn: 'Users', path: '/users', icon: ManageAccounts, module: 'users' };
const AUDIT: NavItem = { id: 'audit', label: 'سجل التدقيق', labelEn: 'Audit log', path: '/settings/audit', icon: History, adminOnly: true };
/** Statements and prices of suppliers need every expense, so it follows `expenses.view.all`. */
const SUPPLIERS: NavItem = { id: 'suppliers', label: 'المورّدون', labelEn: 'Suppliers', path: '/suppliers', icon: Storefront, module: 'expenses', permission: 'expenses.view.all' };
const BACKUP: NavItem = { id: 'backup', label: 'النسخ الاحتياطي', labelEn: 'Backup', path: '/settings/backup', icon: CloudUpload, adminOnly: true };
const SETTINGS: NavItem = { id: 'settings', label: 'الإعدادات', labelEn: 'Settings', path: '/settings/branding', icon: Settings, adminOnly: true };

/** Mobile bottom bar: the standard five destinations (the bar swaps in others when one is not allowed). */
export const PRIMARY_NAV: NavItem[] = [HOME, CLIENTS, EXPENSES, PAYMENTS, FUND];

/** Substitutes for a standard bottom-bar destination the person cannot open, in order of preference. */
export const BOTTOM_NAV_FALLBACKS: NavItem[] = [INVOICES, DEBTS, LETTERS];

/** Additional destinations: shown in the sidebar (desktop) and the drawer (mobile). */
export const SECONDARY_NAV: NavItem[] = [WORKERS, NEW_INVOICE, RECEIVABLES, DEBTS, EXPENSES, EXPENSE_INVOICES, SUPPLIERS, LETTERS, USERS, AUDIT, BACKUP, SETTINGS];

export interface NavGroupDef {
  key: string;
  titleAr: string;
  titleEn: string;
  items: readonly NavItem[];
}

/**
 * Desktop sidebar and phone drawer: one logical order with every screen (no duplicate sections).
 * Flow: overview → revenue (invoices, payments) → spending (expenses, custody, debts) → admin.
 */
export const NAV_GROUPS: readonly NavGroupDef[] = [
  { key: 'overview', titleAr: 'عام', titleEn: 'Overview', items: [HOME, COMPANY, CLIENTS, WORKERS] },
  { key: 'revenue', titleAr: 'الفواتير والمدفوعات', titleEn: 'Invoices & payments', items: [INVOICES, NEW_INVOICE, PAYMENTS, RECEIVABLES] },
  { key: 'spending', titleAr: 'المصروفات والعهد', titleEn: 'Expenses & custody', items: [EXPENSES, EXPENSE_INVOICES, SUPPLIERS, FUND, DEBTS] },
  { key: 'admin', titleAr: 'المستندات والإدارة', titleEn: 'Documents & admin', items: [LETTERS, USERS, AUDIT, BACKUP, SETTINGS] },
];

/** Every destination, flat, in sidebar order. */
export const SIDEBAR_NAV: NavItem[] = NAV_GROUPS.flatMap((group) => group.items);

/** Bottom bar size: never more than five, never fewer than two (the bar adds a menu button to reach two). */
export const BOTTOM_NAV_MAX = 5;
export const BOTTOM_NAV_MIN = 2;

/** The one rule for "may this person see this destination?". Locked items are never listed. */
export function isNavItemVisible(item: NavItem, access: NavAccess): boolean {
  if (item.adminOnly && !access.isAdmin) return false;
  if (item.module && !access.canAccessModule(item.module)) return false;
  if (item.permission && !access.can(item.permission)) return false;
  if (item.allOf && !item.allOf.every((p) => access.can(p))) return false;
  if (item.expenseInvoices && !access.canUseExpenseInvoices) return false;
  return true;
}

/** Sidebar / drawer groups, filtered for this person; a group with nothing left disappears. */
export function visibleNavGroups(access: NavAccess): { def: NavGroupDef; items: NavItem[] }[] {
  return NAV_GROUPS.map((def) => ({ def, items: def.items.filter((item) => isNavItemVisible(item, access)) })).filter(
    (group) => group.items.length > 0
  );
}

/**
 * The mobile bottom bar for this person: the standard destinations they may open, topped up with
 * the next allowed ones (invoices, debts, letters) until there are five, kept in sidebar order.
 * An employee who can record expenses and see their custody gets Home, Clients, Expenses, Fund.
 */
export function bottomNavItems(access: NavAccess): NavItem[] {
  const picked = PRIMARY_NAV.filter((item) => isNavItemVisible(item, access));
  for (const item of BOTTOM_NAV_FALLBACKS) {
    if (picked.length >= BOTTOM_NAV_MAX) break;
    if (isNavItemVisible(item, access) && !picked.includes(item)) picked.push(item);
  }
  const order = (item: NavItem) => SIDEBAR_NAV.indexOf(item);
  return picked.sort((a, b) => order(a) - order(b));
}

/** Utility: pick label for current direction. */
export function navLabel(item: NavItem, direction: 'rtl' | 'ltr'): string {
  return direction === 'rtl' ? item.label : item.labelEn;
}

/** Does `pathname` belong to the destination `path`? Home is exact, others match by path segment. */
export function matchesNavPath(pathname: string, path: string): boolean {
  if (path === '/') return pathname === '/';
  return pathname === path || pathname.startsWith(`${path}/`);
}

/** The single most specific destination for the current route (so /invoices/new highlights only "فاتورة جديدة"). */
export function activeNavPath(pathname: string, items: readonly NavItem[]): string | null {
  let best: string | null = null;
  for (const item of items) {
    if (matchesNavPath(pathname, item.path) && (best === null || item.path.length > best.length)) best = item.path;
  }
  return best;
}
