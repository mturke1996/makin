/**
 * End-to-end check of the money screens against the REAL Firestore rules and auth, in a real browser.
 *
 *   npm run emulators            (auth + firestore)       in one terminal
 *   npm run seed:emulators                                once
 *   npm run dev:emulators                                 (the app on http://127.0.0.1:3000)
 *   node tests/e2e/money.e2e.cjs
 *
 * Every scenario creates its own records, acts through the screen, then reads the database back to see what really
 * happened. Exit code 1 if anything failed. Needs `playwright` (the browsers are already installed in CI images).
 */
const { chromium } = require('playwright');

const APP = process.env.APP_URL || 'http://127.0.0.1:3000';
const PROJECT = 'demo-makin';
const FS = `http://127.0.0.1:8080/v1/projects/${PROJECT}/databases/(default)/documents`;
const AUTH = 'http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1';
const PASSWORD = 'Makin#1234';

/* ── database helpers (admin access through the emulator) ───────────────────────────────────────────────────── */
const val = (v) => {
  if (v === null || v === undefined) return { nullValue: null };
  if (typeof v === 'string') return { stringValue: v };
  if (typeof v === 'boolean') return { booleanValue: v };
  if (typeof v === 'number') return Number.isInteger(v) ? { integerValue: String(v) } : { doubleValue: v };
  if (Array.isArray(v)) return { arrayValue: { values: v.map(val) } };
  return { mapValue: { fields: Object.fromEntries(Object.entries(v).map(([k, x]) => [k, val(x)])) } };
};
const owner = { Authorization: 'Bearer owner', 'Content-Type': 'application/json' };
async function put(col, id, data) {
  const r = await fetch(`${FS}/${col}/${id}`, { method: 'PATCH', headers: owner, body: JSON.stringify({ fields: Object.fromEntries(Object.entries({ ...data, id }).map(([k, v]) => [k, val(v)])) }) });
  if (!r.ok) throw new Error(`put ${col}/${id}: ${r.status} ${await r.text()}`);
}
const plain = (v) => ('stringValue' in v ? v.stringValue : 'integerValue' in v ? Number(v.integerValue) : 'doubleValue' in v ? v.doubleValue : 'booleanValue' in v ? v.booleanValue : 'nullValue' in v ? null : v);
async function get(col, id) {
  const r = await fetch(`${FS}/${col}/${id}`, { headers: owner });
  if (r.status === 404) return null;
  const j = await r.json();
  return Object.fromEntries(Object.entries(j.fields || {}).map(([k, v]) => [k, plain(v)]));
}
async function list(col) {
  const r = await fetch(`${FS}/${col}?pageSize=300`, { headers: owner });
  const j = await r.json();
  return (j.documents || []).map((d) => ({ id: d.name.split('/').pop(), ...Object.fromEntries(Object.entries(d.fields || {}).map(([k, v]) => [k, plain(v)])) }));
}
async function remove(col, id) { await fetch(`${FS}/${col}/${id}`, { method: 'DELETE', headers: owner }); }
async function account(email, displayName, role, permissions) {
  let uid;
  const up = await fetch(`${AUTH}/accounts:signUp?key=demo-key`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password: PASSWORD, displayName, returnSecureToken: true }) });
  const j = await up.json();
  if (up.ok) uid = j.localId;
  else {
    const si = await fetch(`${AUTH}/accounts:signInWithPassword?key=demo-key`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password: PASSWORD, returnSecureToken: true }) });
    uid = (await si.json()).localId;
  }
  await put('users', uid, { email, displayName, role, ...(permissions ? { permissions } : {}) });
  return uid;
}

/* ── browser helpers ───────────────────────────────────────────────────────────────────────────────────────── */
async function open(browser, who, viewport = { width: 1280, height: 900 }) {
  const ctx = await browser.newContext({ viewport, hasTouch: viewport.width < 700 });
  const page = await ctx.newPage();
  const problems = [];
  page.on('pageerror', (e) => problems.push(e.message.slice(0, 160)));
  await page.goto(`${APP}/login`, { waitUntil: 'domcontentloaded' });
  await page.locator('input[type="email"], input[autocomplete="username"]').first().fill(who);
  await page.locator('input[type="password"]').first().fill(PASSWORD);
  await page.locator('button[type="submit"]').first().click();
  await page.waitForURL((u) => !u.pathname.includes('login'), { timeout: 20000 });
  await page.waitForTimeout(1800);
  return { ctx, page, problems };
}
async function go(page, path) {
  // A page that is still finishing a navigation of its own aborts the next one: try again, as a person would.
  for (let attempt = 1; ; attempt++) {
    try {
      await page.goto(`${APP}${path}`, { waitUntil: 'domcontentloaded' });
      break;
    } catch (error) {
      if (attempt >= 3 || !/ERR_ABORTED/.test(String(error))) throw error;
      await page.waitForTimeout(600);
    }
  }
  await page.waitForTimeout(1800);
}
const toasts = (page) => page.locator('[role="status"]').allInnerTexts();
async function until(fn, ms = 8000) {
  const end = Date.now() + ms;
  for (;;) {
    const v = await fn();
    if (v) return v;
    if (Date.now() > end) return v;
    await new Promise((r) => setTimeout(r, 250));
  }
}
// Every run writes its own names, so a record left by an earlier run can never be mistaken for this one's.
const RUN = Date.now().toString(36);
const PAY = 700 + (parseInt(RUN, 36) % 90) + 0.5;
const stamp = (extra = {}) => ({ createdAt: '2026-10-25T09:00:00.000Z', updatedAt: '2026-10-25T09:00:00.000Z', ...extra });
const expense = (id, description, extra = {}) => put('expenses', id, { clientId: 'c-villa', description, amount: 1000, category: 'cement', date: '2026-10-20', isClosed: false, userId: 'someone', createdBy: 'علي', approvalStatus: 'pending', ...stamp(), ...extra });

/* ── scenarios ──────────────────────────────────────────────────────────────────────────────────────────────── */
const scenarios = [];
const scenario = (name, fn) => scenarios.push([name, fn]);
const check = (cond, message) => { if (!cond) throw new Error(message); };

scenario('admin, wide screen: the check button approves an expense under their own uid', async ({ browser, adminUid }) => {
  await expense(`t-a1-${RUN}`, `اختبار اعتماد 1 ${RUN}`);
  const { ctx, page, problems } = await open(browser, 'admin@makin.test');
  await go(page, '/expenses');
  await page.getByRole('button', { name: `اعتماد مصروف اختبار اعتماد 1 ${RUN}` }).click();
  const doc = await until(async () => { const d = await get('expenses', `t-a1-${RUN}`); return d.approvalStatus === 'approved' && d; });
  check(doc, 'the expense was not approved in the database');
  check(doc.reviewedBy === adminUid, `reviewedBy is ${doc.reviewedBy}, not the approver`);
  check(doc.reviewedByName && doc.reviewedAt, 'reviewer name/time missing');
  check(await until(async () => (await toasts(page)).some((t) => t.includes('تم اعتماد المصروف'))), 'no success message');
  check(problems.length === 0, `page errors: ${problems.join(' | ')}`);
  await ctx.close();
});

scenario('admin, phone: the «اعتماد» button under the row approves it', async ({ browser }) => {
  await expense(`t-a2-${RUN}`, `اختبار اعتماد هاتف ${RUN}`);
  const { ctx, page } = await open(browser, 'admin@makin.test', { width: 390, height: 844 });
  await go(page, '/expenses');
  await page.getByRole('button', { name: `اعتماد مصروف اختبار اعتماد هاتف ${RUN}` }).tap();
  const doc = await until(async () => { const d = await get('expenses', `t-a2-${RUN}`); return d.approvalStatus === 'approved' && d; });
  check(doc, 'not approved from the phone button');
  await ctx.close();
});

scenario('admin: the review panel inside the open expense approves it and closes', async ({ browser }) => {
  await expense(`t-a3-${RUN}`, `اختبار لوحة المراجعة ${RUN}`);
  const { ctx, page } = await open(browser, 'admin@makin.test', { width: 390, height: 844 });
  await go(page, '/expenses');
  await page.getByText(`اختبار لوحة المراجعة ${RUN}`).first().click();
  await page.getByRole('dialog').getByRole('button', { name: 'اعتماد', exact: true }).click();
  const doc = await until(async () => { const d = await get('expenses', `t-a3-${RUN}`); return d.approvalStatus === 'approved' && d; });
  check(doc, 'not approved from the panel');
  check(await until(async () => (await page.getByRole('dialog').count()) === 0), 'the form stayed open after approving');
  await ctx.close();
});

scenario('admin: «اعتماد الكل» approves every waiting expense in one go', async ({ browser }) => {
  for (const n of [1, 2, 3]) await expense(`t-all${n}-${RUN}`, `اعتماد جماعي ${n} ${RUN}`);
  const { ctx, page } = await open(browser, 'admin@makin.test');
  await go(page, '/expenses?status=pending');
  await page.getByRole('button', { name: /اعتماد الكل/ }).click();
  await page.getByRole('button', { name: 'تأكيد الاعتماد' }).click();
  const all = await until(async () => { const ds = await Promise.all([1, 2, 3].map((n) => get('expenses', `t-all${n}-${RUN}`))); return ds.every((d) => d.approvalStatus === 'approved'); });
  check(all, 'not all three were approved');
  await ctx.close();
});

scenario('admin: rejecting needs a reason; the reason is stored; a rejected one can still be approved', async ({ browser, adminUid }) => {
  await expense(`t-r1-${RUN}`, `اختبار الرفض ${RUN}`);
  const { ctx, page } = await open(browser, 'admin@makin.test', { width: 390, height: 844 });
  await go(page, '/expenses');
  await page.getByText(`اختبار الرفض ${RUN}`).first().click();
  const dialog = page.getByRole('dialog');
  await dialog.getByRole('button', { name: 'رفض', exact: true }).click();
  await dialog.getByRole('button', { name: 'تأكيد الرفض' }).click();
  check((await get('expenses', `t-r1-${RUN}`)).approvalStatus === 'pending', 'rejected without a reason');
  await dialog.locator('textarea').first().fill('الفاتورة غير واضحة');
  await dialog.getByRole('button', { name: 'تأكيد الرفض' }).click();
  const doc = await until(async () => { const d = await get('expenses', `t-r1-${RUN}`); return d.approvalStatus === 'rejected' && d; });
  check(doc && doc.rejectionReason === 'الفاتورة غير واضحة' && doc.reviewedBy === adminUid, 'rejection not stored with its reason and reviewer');
  await go(page, '/expenses?status=rejected');
  await page.getByText(`اختبار الرفض ${RUN}`).first().click();
  await page.getByRole('dialog').getByRole('button', { name: 'اعتماد', exact: true }).click();
  const again = await until(async () => { const d = await get('expenses', `t-r1-${RUN}`); return d.approvalStatus === 'approved' && d; });
  check(again, 'a rejected expense could not be approved afterwards');
  await ctx.close();
});

scenario('an accountant (employee with edit-all) approves; the rules accept it', async ({ browser }) => {
  const uid = await account('accountant@makin.test', 'المحاسب', 'employee', ['clients.view', 'expenses.view.all', 'expenses.create', 'expenses.edit.all']);
  await expense(`t-acc-${RUN}`, `اعتماد المحاسب ${RUN}`);
  const { ctx, page } = await open(browser, 'accountant@makin.test');
  await go(page, '/expenses');
  await page.getByRole('button', { name: `اعتماد مصروف اعتماد المحاسب ${RUN}` }).click();
  const doc = await until(async () => { const d = await get('expenses', `t-acc-${RUN}`); return d.approvalStatus === 'approved' && d; });
  check(doc && doc.reviewedBy === uid, 'the accountant\'s approval was not stored');
  await ctx.close();
});

scenario('a site employee cannot approve: no button, and their own waiting expense says so', async ({ browser }) => {
  const uid = await account('worker@makin.test', 'سالم (موقع)', 'employee');
  await expense(`t-w1-${RUN}`, `مصروف الموظف ${RUN}`, { userId: uid, createdBy: 'سالم (موقع)' });
  const { ctx, page } = await open(browser, 'worker@makin.test');
  await go(page, '/expenses');
  check((await page.getByRole('button', { name: /اعتماد مصروف/ }).count()) === 0, 'an employee was offered an approve button');
  check((await page.getByText('بانتظار الاعتماد').count()) > 0, 'the employee is not told the expense is waiting');
  await ctx.close();
});

scenario('a site employee records an expense: it is saved waiting for review, under their own uid', async ({ browser }) => {
  const uid = await account('worker@makin.test', 'سالم (موقع)', 'employee');
  const { ctx, page } = await open(browser, 'worker@makin.test');
  await go(page, '/expenses?new=1');
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('وصف المصروف').fill(`مصروف جديد من الموقع ${RUN}`);
  await dialog.getByLabel('المبلغ', { exact: true }).fill('250');
  await dialog.getByLabel('العميل / المشروع').selectOption({ index: 1 }).catch(() => undefined);
  await dialog.getByRole('button', { name: 'حفظ المصروف' }).click();
  const doc = await until(async () => (await list('expenses')).find((d) => d.description === `مصروف جديد من الموقع ${RUN}`));
  check(doc, 'the new expense was not saved');
  check(doc.approvalStatus === 'pending' && doc.userId === uid && doc.amount === 250, `saved as ${doc.approvalStatus}/${doc.userId}/${doc.amount}`);
  await ctx.close();
});

scenario('admin records an expense: saved approved on the spot', async ({ browser, adminUid }) => {
  const { ctx, page } = await open(browser, 'admin@makin.test');
  await go(page, '/expenses?new=1');
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('وصف المصروف').fill(`مصروف المدير الجديد ${RUN}`);
  await dialog.getByLabel('المبلغ', { exact: true }).fill('1234.5');
  await dialog.getByRole('button', { name: 'حفظ المصروف' }).click();
  const doc = await until(async () => (await list('expenses')).find((d) => d.description === `مصروف المدير الجديد ${RUN}`));
  check(doc, 'the new expense was not saved');
  check(doc.approvalStatus === 'approved' && doc.reviewedBy === adminUid && doc.amount === 1234.5, `saved as ${doc.approvalStatus}/${doc.amount}`);
  await ctx.close();
});

scenario('admin deletes an expense: asked first, gone from the database after confirming', async ({ browser }) => {
  await expense(`t-d1-${RUN}`, `مصروف للحذف ${RUN}`, { approvalStatus: 'approved', userId: 'x' });
  const { ctx, page } = await open(browser, 'admin@makin.test');
  await go(page, '/expenses');
  await page.getByRole('button', { name: `حذف مصروف مصروف للحذف ${RUN}` }).click();
  check((await page.getByText('حذف هذا المصروف؟').count()) === 1, 'no confirmation asked');
  check(await get('expenses', `t-d1-${RUN}`), 'deleted before confirming');
  await page.getByRole('button', { name: 'حذف المصروف' }).click();
  check(await until(async () => (await get('expenses', `t-d1-${RUN}`)) === null), 'the expense is still in the database');
  await ctx.close();
});

scenario('admin adds a payment, then deletes it', async ({ browser }) => {
  const before = (await list('payments')).length;
  const { ctx, page } = await open(browser, 'admin@makin.test');
  await go(page, '/payments?new=1');
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('مبلغ الدفعة').fill(String(PAY));
  await dialog.getByLabel('العميل', { exact: true }).selectOption({ index: 1 });
  await dialog.getByRole('button', { name: 'حفظ الدفعة' }).click();
  const added = await until(async () => (await list('payments')).find((p) => p.amount === PAY));
  check(added, `the payment was not saved (had ${before})`);
  await go(page, '/payments');
  await page.getByRole('button', { name: /حذف دفعة/ }).first().click();
  await page.getByRole('button', { name: 'حذف الدفعة' }).click();
  check(await until(async () => !(await list('payments')).some((p) => p.amount === PAY) || null) !== false, 'the payment is still there');
  await ctx.close();
});

scenario('offline: approving does not hang, says it is saved on the device, and reaches the server when back online', async ({ browser }) => {
  await expense(`t-off-${RUN}`, `اعتماد بلا اتصال ${RUN}`);
  const { ctx, page } = await open(browser, 'admin@makin.test');
  await go(page, '/expenses');
  await ctx.setOffline(true);
  const started = Date.now();
  await page.getByRole('button', { name: `اعتماد مصروف اعتماد بلا اتصال ${RUN}` }).click();
  const message = await until(async () => (await toasts(page)).find((t) => t.includes('تم اعتماد')), 9000);
  check(message, 'no answer while offline: the button hangs');
  check(Date.now() - started < 8000, `answered only after ${Date.now() - started}ms`);
  check(message.includes('سيُرفع'), 'it did not say it will upload later');
  check((await get('expenses', `t-off-${RUN}`)).approvalStatus === 'pending', 'the server changed while offline?');
  await ctx.setOffline(false);
  const doc = await until(async () => { const d = await get('expenses', `t-off-${RUN}`); return d.approvalStatus === 'approved' && d; }, 20000);
  check(doc, 'the change never reached the server after reconnecting');
  await ctx.close();
});

scenario('offline: deleting a payment is immediate on screen and reaches the server later', async ({ browser }) => {
  await put('payments', `t-pay-off-${RUN}`, { invoiceId: '', clientId: 'c-villa', amount: 4321, paymentMethod: 'cash', paymentDate: '2030-01-01', createdBy: 'x', ...stamp() });
  const { ctx, page } = await open(browser, 'admin@makin.test');
  await go(page, '/payments');
  await ctx.setOffline(true);
  await page.getByRole('button', { name: /حذف دفعة/ }).first().click();
  await page.getByRole('button', { name: 'حذف الدفعة' }).click();
  const message = await until(async () => (await toasts(page)).find((t) => t.includes('تم حذف الدفعة')), 9000);
  check(message, 'the delete button hangs offline');
  await ctx.setOffline(false);
  check(await until(async () => (await get('payments', `t-pay-off-${RUN}`)) === null, 20000), 'the delete never reached the server');
  await ctx.close();
});

scenario('client page: the expenses sheet approves too', async ({ browser }) => {
  await expense(`t-cp-${RUN}`, `اعتماد من صفحة العميل ${RUN}`);
  const { ctx, page } = await open(browser, 'admin@makin.test');
  await go(page, '/clients/c-villa?section=expenses');
  await page.getByText(`اعتماد من صفحة العميل ${RUN}`).first().click();
  await page.getByRole('dialog').getByRole('button', { name: 'اعتماد', exact: true }).click();
  check(await until(async () => (await get('expenses', `t-cp-${RUN}`)).approvalStatus === 'approved'), 'not approved from the client page');
  await ctx.close();
});


scenario('debts: add an external debt, pay part of it, delete it', async ({ browser }) => {
  const name = `مورد اختبار ${RUN}`;
  const { ctx, page } = await open(browser, 'admin@makin.test');
  await go(page, '/debts');
  await page.getByRole('button', { name: 'دين جديد' }).first().click();
  const dialog = page.getByRole('dialog');
  await dialog.getByText('طرف خارجي', { exact: true }).click();
  await dialog.getByLabel('اسم الطرف').fill(name);
  await dialog.getByLabel('الوصف').fill('دين اختبار');
  await dialog.getByLabel('قيمة الدين').fill('900');
  await dialog.getByRole('button', { name: 'حفظ الدين' }).click();
  const debt = await until(async () => (await list('standalone_debts')).find((d) => d.partyName === name));
  check(debt && debt.amount === 900 && debt.remainingAmount === 900, `debt saved as ${JSON.stringify(debt)}`);
  await go(page, '/debts');
  await page.getByRole('button', { name: `تسديد دين ${name}` }).click();
  await page.getByRole('dialog').getByLabel('المبلغ').fill('400');
  await page.getByRole('button', { name: 'تأكيد التسديد' }).click();
  const paid = await until(async () => { const d = await get('standalone_debts', debt.id); return d.paidAmount === 400 && d; });
  check(paid && paid.remainingAmount === 500, `after paying 400: ${JSON.stringify(paid)}`);
  await go(page, '/debts');
  await page.getByRole('button', { name: `حذف دين ${name}` }).click();
  await page.getByRole('button', { name: 'حذف الدين' }).click();
  check(await until(async () => (await get('standalone_debts', debt.id)) === null), 'the debt is still there');
  await ctx.close();
});

scenario('client page: the agreed percentage saves (10%, Arabic digits), and the board shows it', async ({ browser }) => {
  const { ctx, page } = await open(browser, 'admin@makin.test');
  await go(page, '/clients/c-shop');
  await page.getByRole('button', { name: 'فتح النسبة المتفق عليها' }).first().click();
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('النسبة المتفق عليها (%)').fill('١٨٪');
  await dialog.getByRole('button', { name: 'حفظ النسبة' }).click();
  const client = await until(async () => { const c = await get('clients', 'c-shop'); return c.profitPercentage === 18 && c; });
  check(client, 'the percentage was not saved');
  await dialog.getByLabel('النسبة المتفق عليها (%)').count().catch(() => 0);
  await ctx.close();
});

scenario('client page: add an expense and a payment from the page itself', async ({ browser }) => {
  const { ctx, page } = await open(browser, 'admin@makin.test');
  await go(page, '/clients/c-villa');
  await page.getByRole('button', { name: 'إضافة مصروف' }).first().click();
  let dialog = page.getByRole('dialog');
  await dialog.getByLabel('وصف المصروف').fill(`مصروف من الملف ${RUN}`);
  await dialog.getByLabel('المبلغ الإجمالي').fill('321');
  await dialog.getByRole('button', { name: 'حفظ المصروف' }).click();
  const exp = await until(async () => (await list('expenses')).find((d) => d.description === `مصروف من الملف ${RUN}`));
  check(exp && exp.clientId === 'c-villa' && exp.amount === 321, `expense saved as ${JSON.stringify(exp)}`);
  await go(page, '/clients/c-villa');
  await page.getByRole('button', { name: 'إضافة دفعة' }).first().click();
  dialog = page.getByRole('dialog');
  await dialog.getByLabel('المبلغ', { exact: true }).fill('654');
  await dialog.getByRole('button', { name: 'تسجيل الدفعة' }).click();
  const pay = await until(async () => (await list('payments')).find((d) => d.amount === 654 && d.clientId === 'c-villa'));
  check(pay, 'the payment was not saved from the client page');
  await remove('payments', pay.id);
  await ctx.close();
});

scenario('quick expense (the floating button) records an expense for the project', async ({ browser }) => {
  const { ctx, page } = await open(browser, 'admin@makin.test');
  await go(page, '/clients/c-villa');
  await page.getByRole('button', { name: 'تسجيل مصروف سريع' }).first().click();
  const dialog = page.getByRole('dialog');
  await dialog.waitFor();
  const amount = dialog.locator('input[inputmode="decimal"]').first();
  await amount.fill('88');
  await dialog.getByRole('button', { name: /تسجيل المصروف/ }).click();
  const exp = await until(async () => (await list('expenses')).find((d) => d.amount === 88 && d.clientId === 'c-villa' && d.id.length > 10 && !d.id.startsWith('t-')));
  check(exp, 'the quick expense was not saved');
  check(exp.approvalStatus === 'approved', `saved as ${exp.approvalStatus}`);
  await remove('expenses', exp.id);
  await ctx.close();
});

/* ── runner ─────────────────────────────────────────────────────────────────────────────────────────────── */
(async () => {
  const adminUid = await account('admin@makin.test', 'م. أحمد (مدير)', 'admin');
  // Whatever an interrupted earlier run left behind (it all carries createdBy «x») would otherwise sort into the lists.
  for (const p of await list('payments')) if (p.createdBy === 'x') await remove('payments', p.id);
  for (const e of await list('expenses')) if (e.id.startsWith('t-')) await remove('expenses', e.id);
  const browser = await chromium.launch();
  let failed = 0;
  for (const [name, fn] of scenarios) {
    try {
      await fn({ browser, adminUid });
      console.log(`PASS  ${name}`);
    } catch (error) {
      failed += 1;
      console.log(`FAIL  ${name}\n      ${error.message}`);
    }
  }
  await browser.close();
  console.log(`\n${scenarios.length - failed} of ${scenarios.length} passed`);
  process.exit(failed ? 1 : 0);
})();
