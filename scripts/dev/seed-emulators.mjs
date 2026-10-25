/**
 * Seeds the LOCAL Firebase emulators with sample data, so every screen can be developed and checked
 * without a real project. Run after `npm run emulators`:   npm run seed:emulators
 *
 * Sample login:  admin@makin.test / Makin#1234   (admin)   ·   worker@makin.test / Makin#1234 (employee)
 * Everything here is invented demo data. Never point this at a real project.
 */
const PROJECT = 'demo-makin';
const FS = `http://127.0.0.1:8080/v1/projects/${PROJECT}/databases/(default)/documents`;
const AUTH = 'http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1';

const val = (v) => {
  if (v === null || v === undefined) return { nullValue: null };
  if (typeof v === 'string') return { stringValue: v };
  if (typeof v === 'boolean') return { booleanValue: v };
  if (typeof v === 'number') return Number.isInteger(v) ? { integerValue: String(v) } : { doubleValue: v };
  if (Array.isArray(v)) return { arrayValue: { values: v.map(val) } };
  return { mapValue: { fields: fields(v) } };
};
const fields = (o) => Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined).map(([k, v]) => [k, val(v)]));

async function put(collection, id, data) {
  const res = await fetch(`${FS}/${collection}?documentId=${encodeURIComponent(id)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer owner' },
    body: JSON.stringify({ fields: fields({ ...data, id }) }),
  });
  if (!res.ok) throw new Error(`${collection}/${id}: ${res.status} ${await res.text()}`);
}

async function user(email, password, displayName) {
  const res = await fetch(`${AUTH}/accounts:signUp?key=demo-key`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, displayName, returnSecureToken: true }),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(`auth ${email}: ${JSON.stringify(json)}`);
  return json.localId;
}

const now = '2026-10-25T09:00:00.000Z';
const stamp = (extra = {}) => ({ createdAt: now, updatedAt: now, ...extra });
const adminName = 'م. أحمد (مدير)';

const adminUid = await user('admin@makin.test', 'Makin#1234', adminName);
const staffUid = await user('worker@makin.test', 'Makin#1234', 'سالم (موقع)');
await put('users', adminUid, { email: 'admin@makin.test', displayName: adminName, role: 'admin' });
await put('users', staffUid, { email: 'worker@makin.test', displayName: 'سالم (موقع)', role: 'employee' });

// ── Clients (projects) ────────────────────────────────────────────────────────
await put('clients', 'c-villa', {
  name: 'فيلا الأستاذ خالد المبروك', phone: '0912345678', address: 'حي الأندلس', type: 'individual',
  profitPercentage: 15, profitBase: 'expenses', status: 'active', contractValue: 480000,
  startDate: '2026-06-01', expectedEndDate: '2027-02-28', notes: 'فيلا دورين مع سور وحديقة. التسليم على مراحل.',
  createdBy: adminName, ...stamp(),
});
await put('clients', 'c-shop', {
  name: 'شركة النور للتجارة', phone: '0921112233', address: 'طريق المطار', type: 'company',
  profitPercentage: 12, profitBase: 'payments', status: 'active', contractValue: 210000,
  startDate: '2026-08-10', expectedEndDate: '2027-01-15', createdBy: adminName, ...stamp(),
});
await put('clients', 'c-old', {
  name: 'مجمع الشروق السكني', phone: '0945556677', address: 'المنطقة الصناعية', type: 'company',
  status: 'completed', contractValue: 95000, startDate: '2026-01-05', expectedEndDate: '2026-07-30', createdBy: adminName, ...stamp(),
});

// ── Workers ───────────────────────────────────────────────────────────────────
const workers = [
  ['w-elec', 'c-villa', 'علي الكهربائي', 'كهرباء', 18000, 6000, [
    { id: 'i1', title: 'تمديد نقاط الإنارة', quantity: 60, unit: 'نقطة', unitPrice: 150 },
    { id: 'i2', title: 'تأسيس لوحات التوزيع', quantity: 3, unit: 'لوحة', unitPrice: 3000 }]],
  ['w-plumb', 'c-villa', 'مصطفى السباك', 'سباكة', 14000, 14000, undefined],
  ['w-paint', 'c-shop', 'فرج الدهان', 'دهانات', 9000, 3000, undefined],
];
for (const [id, clientId, name, jobType, totalAmount, paidAmount, agreementItems] of workers) {
  await put('workers', id, {
    clientId, name, jobType, totalAmount, paidAmount, remainingAmount: totalAmount - paidAmount,
    status: paidAmount >= totalAmount ? 'completed' : 'active', startDate: '2026-08-15', agreementItems, ...stamp(),
  });
}

// ── Phases / BOQ / site reports ───────────────────────────────────────────────
const phases = [
  ['p1', 'c-villa', 'الحفر والأساسات', 1, 'completed', 25000],
  ['p2', 'c-villa', 'الهيكل الخرساني', 2, 'in_progress', 33000],
  ['p3', 'c-villa', 'التمديدات والتشطيب', 3, 'planned', 120000],
];
for (const [id, clientId, name, order, status, budgetAmount] of phases) await put('project_phases', id, { clientId, name, order, status, budgetAmount, ...stamp() });
// The estimate, by category: concrete is under-estimated, cement is close, rebar is fine.
await put('boq_items', 'b1', { clientId: 'c-villa', phaseId: 'p2', itemCode: 'S-01', description: 'صب خرسانة مسلحة', category: 'concrete', unit: 'm3', quantity: 20, unitPrice: 900, total: 18000, ...stamp() });
await put('boq_items', 'b2', { clientId: 'c-villa', phaseId: 'p2', itemCode: 'S-02', description: 'حديد تسليح', category: 'rebar', unit: 'ton', quantity: 9, unitPrice: 4300, total: 38700, ...stamp() });
await put('boq_items', 'b3', { clientId: 'c-villa', phaseId: 'p2', itemCode: 'S-03', description: 'إسمنت ومونة', category: 'cement', unit: 'piece', quantity: 133, unitPrice: 30, total: 3990, ...stamp() });
await put('boq_items', 'b4', { clientId: 'c-villa', phaseId: 'p3', itemCode: 'F-01', description: 'لياسة داخلية', category: 'plaster', unit: 'm2', quantity: 400, unitPrice: 20, total: 8000, ...stamp() });
await put('site_reports', 's1', {
  clientId: 'c-villa', title: 'تقرير الأسبوع الرابع: الهيكل', reportDate: '2026-10-20', weather: 'مشمس', workersOnSite: 14, progressPercent: 46,
  workCompleted: 'اكتمل صب أعمدة الدور الأرضي وبدأ تجهيز شدات السقف.', issues: 'تأخر وصول حديد الدفعة الثانية يومين.', nextSteps: 'صب سقف الدور الأرضي الخميس.', ...stamp({ createdBy: adminName }),
});

// ── Expenses ──────────────────────────────────────────────────────────────────
const ex = [
  ['e1', 'c-villa', 'خرسانة جاهزة، 22 م³', 20240, 'concrete', '2026-10-18', 22, 920, 'm3'],
  ['e2', 'c-villa', 'حديد تسليح 12 ملم', 18500, 'rebar', '2026-10-15', 4.3, 4300, 'ton'],
  ['e3', 'c-villa', 'إسمنت ومونة', 3600, 'cement', '2026-10-12', 120, 30, 'sack'],
  ['e4', 'c-villa', 'أجور عمال صب', 4200, 'labor', '2026-10-19'],
  ['e5', 'c-villa', 'إيجار شدات وسقالات', 2800, 'equipment', '2026-10-10'],
  ['e6', 'c-villa', 'نقل رمل وزلط', 1650, 'transport', '2026-10-08'],
  ['e7', 'c-villa', 'دفعة للكهربائي علي', 6000, 'labor', '2026-10-14', undefined, undefined, undefined, 'w-elec', 'علي الكهربائي'],
  ['e8', 'c-villa', 'رسوم رخصة البناء', 2400, 'permits', '2026-06-12'],
  ['e9', 'c-shop', 'دهان جوتن 18 لتر × 30', 5400, 'painting', '2026-10-21', 30, 180, 'piece'],
  ['e10', 'c-shop', 'أرضيات بورسلين', 9800, 'flooring', '2026-10-05', 140, 70, 'm2'],
  ['e11', 'c-shop', 'وقود مولد الموقع', 780, 'fuel', '2026-10-23'],
  ['e13', 'c-villa', 'دفعة للسباك مصطفى (تسوية كاملة)', 14000, 'labor', '2026-10-16', undefined, undefined, undefined, 'w-plumb', 'مصطفى السباك'],
  ['e12', 'c-shop', 'دفعة للدهان فرج', 3000, 'labor', '2026-10-22', undefined, undefined, undefined, 'w-paint', 'فرج الدهان'],
];
// Approval: what the admin records is approved on the spot; what the site employee records waits for review
// (one of them was already sent back with a reason).
// Which phase each villa expense belongs to: the foundations are over their budget, the structure is close to it.
const phaseOf = { e1: 'p1', e5: 'p1', e8: 'p1', e2: 'p2', e3: 'p2', e4: 'p2', e6: 'p2' };
const byStaff = { e4: { approvalStatus: 'pending' }, e11: { approvalStatus: 'pending' }, e6: { approvalStatus: 'rejected', reviewedBy: adminUid, reviewedByName: adminName, reviewedAt: now, rejectionReason: 'لا توجد فاتورة، أرفق إيصال النقل' } };
for (const [id, clientId, description, amount, category, date, quantity, unitPrice, unit, workerId, workerName] of ex) {
  const staff = id in byStaff;
  await put('expenses', id, {
    clientId, description, amount, category, date, quantity, unitPrice, unit, workerId, workerName, isClosed: false,
    phaseId: phaseOf[id],
    createdBy: staff ? 'سالم (موقع)' : adminName, userId: staff ? staffUid : adminUid, createdByRole: staff ? 'employee' : 'admin',
    ...(staff ? byStaff[id] : { approvalStatus: 'approved', reviewedBy: adminUid, reviewedByName: adminName, reviewedAt: now }),
    ...stamp(),
  });
}

// ── Invoices & payments ───────────────────────────────────────────────────────
await put('invoices', 'inv1', {
  invoiceNumber: 'MK-2026-001', clientId: 'c-villa', items: [
    { id: 'a', description: 'أعمال الحفر والأساسات (مرحلة 1)', quantity: 1, unitPrice: 60000, total: 60000 },
    { id: 'b', description: 'الدفعة الأولى من الهيكل الخرساني', quantity: 1, unitPrice: 50000, total: 50000 }],
  subtotal: 110000, taxRate: 0, taxAmount: 0, total: 110000, status: 'partially_paid', issueDate: '2026-09-15', dueDate: '2026-10-15', createdBy: adminName, ...stamp(),
});
await put('invoices', 'inv2', {
  invoiceNumber: 'MK-2026-002', clientId: 'c-shop', items: [{ id: 'a', description: 'تشطيب المعرض: الدفعة الأولى', quantity: 1, unitPrice: 70000, total: 70000 }],
  subtotal: 70000, taxRate: 0, taxAmount: 0, total: 70000, status: 'sent', issueDate: '2026-10-01', dueDate: '2026-11-01', createdBy: adminName, ...stamp(),
});
const pays = [
  ['pay1', 'inv1', 'c-villa', 60000, 'bank_transfer', '2026-09-20'],
  ['pay2', 'inv1', 'c-villa', 25000, 'cash', '2026-10-10'],
  ['pay3', 'inv2', 'c-shop', 30000, 'check', '2026-10-12'],
];
for (const [id, invoiceId, clientId, amount, paymentMethod, paymentDate] of pays) await put('payments', id, { invoiceId, clientId, amount, paymentMethod, paymentDate, createdBy: adminName, ...stamp() });

// ── Debts & custody ───────────────────────────────────────────────────────────
await put('standalone_debts', 'd1', {
  clientId: 'c-villa', partyType: 'client', partyName: 'فيلا الأستاذ خالد المبروك', description: 'سلفة مواد على الحساب', amount: 8000, paidAmount: 3000, remainingAmount: 5000,
  status: 'partially_paid', date: '2026-09-28', dueDate: '2026-11-15', createdBy: adminName, ...stamp(),
});
await put('standalone_debts', 'd2', {
  partyType: 'external', partyName: 'مصنع الحديد الوطني', description: 'مستحقات توريد', amount: 12500, paidAmount: 0, remainingAmount: 12500,
  status: 'unpaid', date: '2026-10-02', dueDate: '2026-10-20', createdBy: adminName, ...stamp(),
});
await put('user_balances', 'ub1', { clientId: 'c-villa', userId: staffUid, userName: 'سالم (موقع)', amount: 5000, date: '2026-10-17', notes: 'عهدة مصروفات الموقع', createdBy: adminName, ...stamp() });
await put('global_fund_transactions', 'gf1', { type: 'deposit', amount: 20000, userId: staffUid, userName: 'سالم (موقع)', description: 'عهدة شهر أكتوبر', date: '2026-10-01', createdBy: adminName, ...stamp() });
await put('global_fund_transactions', 'gf2', { type: 'withdrawal', amount: 1650, userId: staffUid, userName: 'سالم (موقع)', clientId: 'c-villa', clientName: 'فيلا الأستاذ خالد المبروك', description: 'نقل رمل وزلط', date: '2026-10-08', createdBy: 'سالم (موقع)', ...stamp() });

console.log('Seeded. Login: admin@makin.test / Makin#1234');
