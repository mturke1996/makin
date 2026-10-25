/**
 * مُقيِّم تعابير حسابية آمن (بدون eval) للحاسبة الصغيرة في حقول الإدخال.
 *
 * يدعم: + − × ÷ والأقواس والكسور العشرية والإشارة السالبة، و% بمنطق الآلة الحاسبة:
 *   «200 × 15%» = 30 ، «1000 + 10%» = 1100 ، «1000 − 10%» = 900 ، «50%» = 0.5
 * ويقبل الأرقام العربية (٠١٢…) والفاصلة العشرية العربية (٫).
 */

const ARABIC_DIGITS = /[٠-٩۰-۹]/g;

export function normalizeExpression(raw: string): string {
  return String(raw ?? '')
    .replace(ARABIC_DIGITS, (d) => String((d.charCodeAt(0) & 0xf) % 10))
    .replace(/[٫]/g, '.')
    .replace(/[٬,\s\u00A0]/g, '')
    .replace(/[×xX*]/g, '*')
    .replace(/[÷/]/g, '/')
    .replace(/[−–—]/g, '-')
    .replace(/٪/g, '%');
}

type Tok = { t: 'num'; v: number } | { t: 'op'; v: string };

function tokenize(src: string): Tok[] | null {
  const out: Tok[] = [];
  let i = 0;
  while (i < src.length) {
    const c = src[i];
    if ((c >= '0' && c <= '9') || c === '.') {
      let j = i;
      let dots = 0;
      while (j < src.length && ((src[j] >= '0' && src[j] <= '9') || src[j] === '.')) {
        if (src[j] === '.') dots += 1;
        j += 1;
      }
      const text = src.slice(i, j);
      if (dots > 1 || text === '.') return null;
      out.push({ t: 'num', v: parseFloat(text) });
      i = j;
      continue;
    }
    if ('+-*/%()'.includes(c)) {
      out.push({ t: 'op', v: c });
      i += 1;
      continue;
    }
    return null;
  }
  return out;
}

type Term = { value: number; percent?: number };

/** يُرجع null إذا كان التعبير غير مكتمل أو غير صالح (مثل القسمة على صفر). */
export function evaluateExpression(raw: string): number | null {
  const src = normalizeExpression(raw);
  if (!src) return null;
  const toks = tokenize(src);
  if (!toks || toks.length === 0) return null;
  let pos = 0;
  const peek = () => toks[pos];
  const isOp = (v: string) => {
    const tk = peek();
    return tk?.t === 'op' && tk.v === v;
  };

  function primary(): number {
    const tk = peek();
    if (!tk) throw new Error('eof');
    if (tk.t === 'num') {
      pos += 1;
      return tk.v;
    }
    if (tk.v === '(') {
      pos += 1;
      const v = expr();
      if (!isOp(')')) throw new Error('paren');
      pos += 1;
      return v;
    }
    throw new Error('unexpected');
  }

  /** عامل مع إشارة أحادية ونسبة لاحقة اختيارية. */
  function factor(): Term {
    if (isOp('-')) {
      pos += 1;
      const f = factor();
      return { value: -f.value, percent: f.percent != null ? -f.percent : undefined };
    }
    if (isOp('+')) {
      pos += 1;
      return factor();
    }
    const v = primary();
    if (isOp('%')) {
      pos += 1;
      return { value: v / 100, percent: v };
    }
    return { value: v };
  }

  function term(): Term {
    let left = factor();
    while (isOp('*') || isOp('/')) {
      const op = (peek() as { v: string }).v;
      pos += 1;
      const right = factor();
      if (op === '/' && right.value === 0) throw new Error('div0');
      left = { value: op === '*' ? left.value * right.value : left.value / right.value };
    }
    return left;
  }

  function expr(): number {
    let acc = term().value;
    while (isOp('+') || isOp('-')) {
      const op = (peek() as { v: string }).v;
      pos += 1;
      const right = term();
      // «أ + ب%» = أ + (أ × ب / 100) — مثل الآلة الحاسبة.
      const delta = right.percent != null ? (acc * right.percent) / 100 : right.value;
      acc = op === '+' ? acc + delta : acc - delta;
    }
    return acc;
  }

  try {
    const value = expr();
    if (pos !== toks.length || !Number.isFinite(value)) return null;
    return roundCalc(value);
  } catch {
    return null;
  }
}

/** تقريب يزيل ضجيج الفاصلة العائمة (0.1 + 0.2). */
export function roundCalc(value: number, digits = 6): number {
  const f = 10 ** digits;
  const r = Math.round((value + Number.EPSILON * Math.sign(value)) * f) / f;
  return Object.is(r, -0) ? 0 : r;
}

/** نص القيمة لكتابتها في حقل إدخال: بدون فواصل آلاف وبدون أصفار زائدة. */
export function toInputValue(value: number): string {
  const r = roundCalc(value);
  if (Number.isInteger(r)) return String(r);
  return r.toFixed(6).replace(/0+$/, '').replace(/\.$/, '');
}

/** يكتب القيمة في حقل إدخال React مُتحكَّم به ويُطلق حدث input ليصل إلى onChange. */
export function setNativeInputValue(input: HTMLInputElement | HTMLTextAreaElement, value: string): void {
  const proto = input instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
  const setter = Object.getOwnPropertyDescriptor(proto, 'value')?.set;
  if (setter) setter.call(input, value);
  else input.value = value;
  input.dispatchEvent(new Event('input', { bubbles: true }));
}
