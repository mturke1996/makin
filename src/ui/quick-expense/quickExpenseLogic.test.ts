import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  amountToInput,
  buildQuickExpense,
  custodyWarning,
  defaultDescription,
  formatAmountInput,
  listOtherPeople,
  localISODate,
  matchesQuery,
  mergeRanked,
  normalizeSearch,
  padKeyFromKeyboard,
  parseAmount,
  pressAmountKey,
  previewCustody,
  rankCategories,
  rankRecentClients,
  withTimeout,
} from './quickExpenseLogic';
import { readQuickPrefs, writeQuickPrefs } from './quickPrefs';

const type = (keys: string) => [...keys].reduce((acc, k) => pressAmountKey(acc, k === '<' ? 'BS' : k), '');

describe('pressAmountKey', () => {
  it('types digits and a decimal point', () => {
    expect(type('250')).toBe('250');
    expect(type('12.5')).toBe('12.5');
  });

  it('never starts with a stray zero', () => {
    expect(type('05')).toBe('5');
    expect(type('00')).toBe('0');
    expect(type('.')).toBe('0.');
    expect(type('.5')).toBe('0.5');
  });

  it('allows one decimal point and three decimals at most', () => {
    expect(type('1.2.3')).toBe('1.23');
    expect(type('1.2345')).toBe('1.234');
    expect(type('0.001')).toBe('0.001');
  });

  it('stops at nine integer digits', () => {
    expect(type('12345678901')).toBe('123456789');
  });

  it('deletes one character, and clears', () => {
    expect(type('12.5<')).toBe('12.');
    expect(type('12.<')).toBe('12');
    expect(type('7<')).toBe('');
    expect(pressAmountKey('123', 'C')).toBe('');
    expect(pressAmountKey('', 'BS')).toBe('');
  });

  it('ignores unknown keys', () => {
    expect(pressAmountKey('12', '+')).toBe('12');
  });
});

describe('padKeyFromKeyboard', () => {
  it('maps digits (Latin and Arabic-Indic), decimal marks and Backspace', () => {
    expect(padKeyFromKeyboard('7')).toBe('7');
    expect(padKeyFromKeyboard('٣')).toBe('3');
    expect(padKeyFromKeyboard(',')).toBe('.');
    expect(padKeyFromKeyboard('٫')).toBe('.');
    expect(padKeyFromKeyboard('Backspace')).toBe('BS');
    expect(padKeyFromKeyboard('Enter')).toBeNull();
    expect(padKeyFromKeyboard('a')).toBeNull();
  });
});

describe('amount text', () => {
  it('groups thousands and keeps what is being typed', () => {
    expect(formatAmountInput('')).toBe('');
    expect(formatAmountInput('250')).toBe('250');
    expect(formatAmountInput('1234567')).toBe('1,234,567');
    expect(formatAmountInput('12345.')).toBe('12,345.');
    expect(formatAmountInput('0.050')).toBe('0.050');
  });

  it('parses to exact thousandths', () => {
    expect(parseAmount('')).toBe(0);
    expect(parseAmount('0.')).toBe(0);
    expect(parseAmount('12.5')).toBe(12.5);
    expect(parseAmount('0.001')).toBe(0.001);
  });

  it('turns a calculator result into keypad text', () => {
    expect(amountToInput(250)).toBe('250');
    expect(amountToInput(12.34567)).toBe('12.346');
    expect(amountToInput(0)).toBe('');
    expect(amountToInput(-5)).toBe('');
    expect(amountToInput(1e15)).toBe('999999999');
  });
});

describe('localISODate', () => {
  it('uses the local day, not the UTC day', () => {
    expect(localISODate(new Date(2026, 9, 5, 23, 59))).toBe('2026-10-05');
    expect(localISODate(new Date(2026, 0, 1, 0, 1))).toBe('2026-01-01');
  });
});

const exp = (clientId: string, userId: string, createdAt: string, category = 'materials') => ({
  clientId,
  userId,
  category: category as never,
  createdAt,
  date: createdAt.slice(0, 10),
});

describe('rankRecentClients', () => {
  const valid = new Set(['c1', 'c2', 'c3', 'c4']);
  const list = [
    exp('c1', 'u1', '2026-10-01T10:00:00Z'),
    exp('c2', 'u1', '2026-10-05T10:00:00Z'),
    exp('c1', 'u1', '2026-10-09T10:00:00Z'),
    exp('c3', 'u2', '2026-10-20T10:00:00Z'),
    exp('gone', 'u1', '2026-10-21T10:00:00Z'),
    exp('', 'u1', '2026-10-22T10:00:00Z'),
  ];

  it('orders one person\'s clients by their latest expense', () => {
    expect(rankRecentClients(list, 'u1', valid)).toEqual(['c1', 'c2']);
  });

  it('ignores other people, deleted clients and expenses without a client', () => {
    expect(rankRecentClients(list, 'u2', valid)).toEqual(['c3']);
    expect(rankRecentClients(list, 'nobody', valid)).toEqual([]);
    expect(rankRecentClients(list, undefined, valid)).toEqual([]);
  });

  it('keeps the top six', () => {
    const many = Array.from({ length: 9 }, (_, i) => exp(`c${i}`, 'u1', `2026-10-0${i + 1}T10:00:00Z`));
    const all = new Set(many.map((e) => e.clientId));
    expect(rankRecentClients(many, 'u1', all)).toEqual(['c8', 'c7', 'c6', 'c5', 'c4', 'c3']);
  });
});

describe('mergeRanked', () => {
  it('joins lists without repeats and stops at the limit', () => {
    expect(mergeRanked([['a', 'b'], ['b', 'c', 'd']], 3)).toEqual(['a', 'b', 'c']);
    expect(mergeRanked([[], ['x']], 5)).toEqual(['x']);
  });
});

describe('rankCategories', () => {
  const all = ['materials', 'labor', 'transport', 'equipment', 'fuel', 'tools', 'hospitality', 'other', 'rent', 'plumbing'];

  it('starts with the last one used, then what this person records most, then the common ones', () => {
    const list = [
      exp('c1', 'u1', '2026-10-01T10:00:00Z', 'rent'),
      exp('c1', 'u1', '2026-10-02T10:00:00Z', 'plumbing'),
      exp('c1', 'u1', '2026-10-03T10:00:00Z', 'plumbing'),
      exp('c1', 'u2', '2026-10-03T10:00:00Z', 'fuel'),
    ];
    const ranked = rankCategories(list, 'u1', 'rent', all, 5);
    expect(ranked).toEqual(['rent', 'plumbing', 'materials', 'labor', 'transport']);
  });

  it('falls back to the common set for a newcomer, materials first', () => {
    const ranked = rankCategories([], 'new', undefined, all, 8);
    expect(ranked[0]).toBe('materials');
    expect(ranked).toHaveLength(8);
  });

  it('drops a remembered category the app no longer knows', () => {
    expect(rankCategories([], 'u', 'ancient', all, 3)).toEqual(['materials', 'labor', 'transport']);
  });
});

describe('defaultDescription', () => {
  it('is the category, with the client when there is one', () => {
    expect(defaultDescription('وقود وزيوت')).toBe('وقود وزيوت');
    expect(defaultDescription('وقود وزيوت', 'شركة النور')).toBe('وقود وزيوت · شركة النور');
    expect(defaultDescription(' وقود ', '  ')).toBe('وقود');
  });
});

describe('previewCustody', () => {
  it('shows what is left when the custody covers the amount', () => {
    const p = previewCustody(6150, 500);
    expect(p).toMatchObject({ remaining: 6150, after: 5650, fromBalance: 500, deficit: 0, exceeds: false });
    expect(custodyWarning(p)).toBeNull();
  });

  it('is exact to the thousandth', () => {
    expect(previewCustody(0.3, 0.1).after).toBe(0.2);
    expect(previewCustody(100.1, 100.1).after).toBe(0);
  });

  it('flags the part beyond the custody', () => {
    const p = previewCustody(400, 1000);
    expect(p).toMatchObject({ after: -600, fromBalance: 400, deficit: 600, exceeds: true });
    expect(custodyWarning(p)).toEqual({ lead: 'يتجاوز عهدتك بمقدار', amount: 600, tail: 'وسيُخصم من عهدتك القادمة' });
  });

  it('words an empty or negative custody differently, and names the owner when it is someone else', () => {
    expect(custodyWarning(previewCustody(0, 250))).toEqual({
      lead: 'عهدتك منتهية، وسيُخصم',
      amount: 250,
      tail: 'من عهدتك القادمة',
    });
    expect(custodyWarning(previewCustody(-100, 250))?.amount).toBe(250);
    expect(custodyWarning(previewCustody(400, 1000), 'سالم')).toEqual({
      lead: 'يتجاوز عهدة سالم بمقدار',
      amount: 600,
      tail: 'وسيُخصم من عهدته القادمة',
    });
  });

  it('has nothing to flag before an amount is typed', () => {
    const p = previewCustody(6150, 0);
    expect(p.after).toBe(6150);
    expect(p.exceeds).toBe(false);
  });
});

describe('search', () => {
  it('matches Arabic spelling variants', () => {
    expect(normalizeSearch('  الأَنْدَلُس  ')).toBe('الاندلس');
    expect(matchesQuery('اندلس', 'مجمع الأندلس السكني')).toBe(true);
    expect(matchesQuery('مستشفى', 'مستشفى الشفاء')).toBe(true);
    expect(matchesQuery('شفاء', undefined, 'مستشفى الشفاء')).toBe(true);
    expect(matchesQuery('فيلا', 'مجمع الأندلس')).toBe(false);
    expect(matchesQuery('', 'أي شيء')).toBe(true);
  });

  it('treats ta marbuta and ha alike', () => {
    expect(matchesQuery('مدرسة', 'مدرسه النور')).toBe(true);
  });
});

describe('listOtherPeople', () => {
  const directory = [
    { id: 'u-admin', displayName: 'محمد التركي' },
    { id: 'doc-1', uid: 'u-salem', displayName: 'سالم الورفلي' },
    { id: 'u-ali', displayName: 'علي المبروك' },
    { id: 'u-khaled', displayName: 'خالد البوسيفي' },
    { id: 'u-ali', displayName: 'نسخة مكررة' },
    { id: 'u-blank' },
  ];

  it('leaves out me and repeats, uses the auth uid, and puts the recently active first', () => {
    const expenses = [
      { userId: 'u-khaled', createdAt: '2026-10-20T10:00:00Z', date: '2026-10-20' },
      { userId: 'u-salem', createdAt: '2026-10-10T10:00:00Z', date: '2026-10-10' },
    ];
    const people = listOtherPeople(directory, 'u-admin', expenses);
    expect(people.map((p) => p.id)).toEqual(['u-khaled', 'u-salem', 'u-ali', 'u-blank']);
    expect(people[1]).toEqual({ id: 'u-salem', name: 'سالم الورفلي' });
    expect(people[3].name).toBe('مستخدم');
  });

  it('orders by name when nobody has recorded anything', () => {
    const people = listOtherPeople(directory.slice(1, 4), 'x', []);
    expect(people.map((p) => p.name)).toEqual([...people.map((p) => p.name)].sort((a, b) => a.localeCompare(b, 'ar')));
  });
});

describe('buildQuickExpense', () => {
  const now = new Date(2026, 9, 23, 14, 5, 9);
  const base = {
    id: 'e-1',
    now,
    clientId: 'c1',
    amount: 250,
    category: 'fuel',
    description: '',
    fallbackDescription: 'وقود وزيوت · شركة النور',
    invoiceNumber: '',
    owner: { id: 'u-salem', name: 'سالم الورفلي' },
  };

  it('writes the fields the rest of the app writes, for the owner', () => {
    const e = buildQuickExpense(base);
    expect(e).toEqual({
      id: 'e-1',
      clientId: 'c1',
      description: 'وقود وزيوت · شركة النور',
      amount: 250,
      category: 'fuel',
      date: '2026-10-23',
      isClosed: false,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
      userId: 'u-salem',
      createdBy: 'سالم الورفلي',
    });
  });

  it('writes nothing from the old hiding model and no attachment', () => {
    const e = buildQuickExpense({ ...base, invoiceNumber: 'A-1' }) as unknown as Record<string, unknown>;
    expect(e).not.toHaveProperty('createdByRole');
    expect(e).not.toHaveProperty('isHiddenFromEmployees');
    expect(e).not.toHaveProperty('attachmentUrl');
    expect(e).not.toHaveProperty('attachmentName');
  });

  it('keeps what the person typed, trimmed', () => {
    expect(buildQuickExpense({ ...base, description: '  شراء كابلات ' }).description).toBe('شراء كابلات');
  });

  it('saves the invoice number trimmed, and omits it when empty', () => {
    expect(buildQuickExpense({ ...base, invoiceNumber: '  INV-77 ' }).invoiceNumber).toBe('INV-77');
    expect(buildQuickExpense({ ...base, invoiceNumber: '   ' })).not.toHaveProperty('invoiceNumber');
    expect(buildQuickExpense(base)).not.toHaveProperty('invoiceNumber');
  });

  it('rounds the amount to the thousandth', () => {
    expect(buildQuickExpense({ ...base, amount: 0.1 + 0.2 }).amount).toBe(0.3);
  });
});

describe('quick prefs', () => {
  const memory = () => {
    const data: Record<string, string> = {};
    return {
      data,
      getItem: (k: string) => (k in data ? data[k] : null),
      setItem: (k: string, v: string) => {
        data[k] = v;
      },
    };
  };

  it('remembers the last client and category per person', () => {
    const s = memory();
    writeQuickPrefs('u1', { clientId: 'c2', category: 'fuel' }, s);
    writeQuickPrefs('u2', { clientId: 'c9' }, s);
    expect(readQuickPrefs('u1', s)).toEqual({ clientId: 'c2', category: 'fuel' });
    expect(readQuickPrefs('u2', s)).toEqual({ clientId: 'c9' });
    expect(readQuickPrefs('u3', s)).toEqual({});
  });

  it('survives broken or blocked storage', () => {
    const broken = {
      getItem: () => {
        throw new Error('blocked');
      },
      setItem: () => {
        throw new Error('full');
      },
    };
    expect(readQuickPrefs('u1', broken)).toEqual({});
    expect(() => writeQuickPrefs('u1', { clientId: 'c1' }, broken)).not.toThrow();
    const garbage = memory();
    garbage.setItem('quick-expense:v1:u1', '{not json');
    expect(readQuickPrefs('u1', garbage)).toEqual({});
    garbage.setItem('quick-expense:v1:u1', JSON.stringify({ clientId: 5, category: '' }));
    expect(readQuickPrefs('u1', garbage)).toEqual({});
    expect(readQuickPrefs(undefined, memory())).toEqual({});
  });
});

describe('withTimeout', () => {
  afterEach(() => vi.useRealTimers());

  it('passes the result through when the work is quick', async () => {
    await expect(withTimeout(Promise.resolve(7), 1000, 'slow')).resolves.toBe(7);
  });

  it('passes the work\'s own error through', async () => {
    await expect(withTimeout(Promise.reject(new Error('denied')), 1000, 'slow')).rejects.toThrow('denied');
  });

  it('gives up with the message when the work stays silent', async () => {
    vi.useFakeTimers();
    const silent = new Promise<void>(() => {});
    const result = withTimeout(silent, 15000, 'تأخر الإرسال');
    const assertion = expect(result).rejects.toThrow('تأخر الإرسال');
    await vi.advanceTimersByTimeAsync(15000);
    await assertion;
  });
});
