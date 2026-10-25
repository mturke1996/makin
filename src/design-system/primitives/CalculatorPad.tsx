import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode, type RefObject } from 'react';
import { createPortal } from 'react-dom';
import { Backspace, Calculate, Close } from '@mui/icons-material';
import { cn } from './cn';
import { incrementLock, decrementLock } from '../utils/useScrollLock';
import {
  evaluateExpression,
  normalizeExpression,
  setNativeInputValue,
  toInputValue,
} from '../../core/calc/evaluate';

const OPS = '+-*/';
const isDigit = (c: string | undefined) => c != null && c >= '0' && c <= '9';

/** آخر رقم في التعبير (للتحقق من الفاصلة العشرية). */
function lastNumber(expr: string): string {
  const m = expr.match(/[\d.]+$/);
  return m ? m[0] : '';
}

function prettyExpression(expr: string): string {
  let out = '';
  for (let i = 0; i < expr.length; i++) {
    const c = expr[i];
    const prev = expr[i - 1];
    if (c === '*') out += ' × ';
    else if (c === '/') out += ' ÷ ';
    else if (c === '+') out += ' + ';
    // «−» ثنائي بعد رقم أو قوس أو نسبة، وإلا فهو إشارة سالبة ملتصقة بالرقم.
    else if (c === '-') out += isDigit(prev) || prev === ')' || prev === '%' || prev === '.' ? ' − ' : '−';
    else out += c;
  }
  return out;
}

const numberFmt = new Intl.NumberFormat('en-US', { maximumFractionDigits: 6 });

type KeyDef = { key: string; label: ReactNode; kind: 'digit' | 'op' | 'fn' | 'eq'; aria?: string };

const KEYS: KeyDef[] = [
  { key: 'C', label: 'C', kind: 'fn', aria: 'مسح الكل' },
  { key: '()', label: '( )', kind: 'fn', aria: 'أقواس' },
  { key: '%', label: '%', kind: 'fn', aria: 'نسبة مئوية' },
  { key: '/', label: '÷', kind: 'op', aria: 'قسمة' },
  { key: '7', label: '7', kind: 'digit' },
  { key: '8', label: '8', kind: 'digit' },
  { key: '9', label: '9', kind: 'digit' },
  { key: '*', label: '×', kind: 'op', aria: 'ضرب' },
  { key: '4', label: '4', kind: 'digit' },
  { key: '5', label: '5', kind: 'digit' },
  { key: '6', label: '6', kind: 'digit' },
  { key: '-', label: '−', kind: 'op', aria: 'طرح' },
  { key: '1', label: '1', kind: 'digit' },
  { key: '2', label: '2', kind: 'digit' },
  { key: '3', label: '3', kind: 'digit' },
  { key: '+', label: '+', kind: 'op', aria: 'جمع' },
  { key: '0', label: '0', kind: 'digit' },
  { key: '.', label: '.', kind: 'digit', aria: 'فاصلة عشرية' },
  { key: 'BS', label: <Backspace sx={{ fontSize: 20 }} />, kind: 'fn', aria: 'حذف' },
  { key: '=', label: '=', kind: 'eq', aria: 'يساوي' },
];

export type CalculatorPadProps = {
  open: boolean;
  onClose: () => void;
  /** يُطبَّق الناتج على الحقل. */
  onApply: (value: number) => void;
  /** القيمة الحالية في الحقل — تبدأ بها الحاسبة. */
  initialValue?: string | number | null;
  title?: string;
  /** وحدة تظهر بجانب الناتج (د.ل، م²…). */
  unit?: string;
  allowNegative?: boolean;
};

/**
 * حاسبة صغيرة لتسهيل إدخال الكميات والمبالغ — ورقة سفلية على الهاتف ونافذة صغيرة على الشاشات الكبيرة.
 * تدعم لوحة المفاتيح (أرقام، + − × ÷ ، Enter للاستخدام، Esc للإغلاق).
 */
export function CalculatorPad({
  open,
  onClose,
  onApply,
  initialValue,
  title = 'حاسبة سريعة',
  unit,
  allowNegative = false,
}: CalculatorPadProps) {
  const [expr, setExpr] = useState('');
  const [fresh, setFresh] = useState(false);
  const [shake, setShake] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  // تهيئة من قيمة الحقل عند كل فتح.
  useEffect(() => {
    if (!open) return;
    const seed = evaluateExpression(String(initialValue ?? ''));
    setExpr(seed != null && seed !== 0 ? toInputValue(seed) : '');
    setFresh(seed != null && seed !== 0);
  }, [open, initialValue]);

  // قفل التمرير + إخفاء لوحة مفاتيح الهاتف + التركيز على الحاسبة.
  useEffect(() => {
    if (!open) return;
    incrementLock();
    const active = document.activeElement as HTMLElement | null;
    active?.blur?.();
    const t = window.setTimeout(() => panelRef.current?.focus({ preventScroll: true }), 30);
    return () => {
      window.clearTimeout(t);
      decrementLock();
    };
  }, [open]);

  const result = useMemo(() => {
    const full = evaluateExpression(expr);
    if (full != null) return full;
    // معاينة أثناء الكتابة: تجاهل المعامل الأخير غير المكتمل.
    const trimmed = expr.replace(/[+\-*/(]+$/, '');
    const depth = (trimmed.match(/\(/g) || []).length - (trimmed.match(/\)/g) || []).length;
    return evaluateExpression(trimmed + ')'.repeat(Math.max(0, depth)));
  }, [expr]);

  const press = useCallback((key: string) => {
    setShake(false);
    setExpr((prev) => {
      const last = prev.slice(-1);
      if (isDigit(key)) {
        if (fresh) return key;
        const num = lastNumber(prev);
        if (num === '0') return prev.slice(0, -1) + key;
        if (last === ')' || last === '%') return prev + '*' + key;
        return prev + key;
      }
      if (key === '.') {
        if (fresh) return '0.';
        if (lastNumber(prev).includes('.')) return prev;
        if (!isDigit(last)) return prev + (last === ')' || last === '%' ? '*0.' : '0.');
        return prev + '.';
      }
      if (OPS.includes(key)) {
        if (!prev) return key === '-' ? '-' : prev;
        if (last === '(') return key === '-' ? prev + '-' : prev;
        if (OPS.includes(last)) {
          // «×−» يسمح بعدد سالب بعد الضرب/القسمة، وإلا يُستبدل المعامل.
          if (key === '-' && (last === '*' || last === '/')) return prev + '-';
          const base = prev.replace(/[+\-*/]+$/, '');
          return base ? base + key : key === '-' ? '-' : '';
        }
        if (last === '.') return prev.slice(0, -1) + key;
        return prev + key;
      }
      if (key === '%') {
        return isDigit(last) || last === ')' ? prev + '%' : prev;
      }
      if (key === '()') {
        const depth = (prev.match(/\(/g) || []).length - (prev.match(/\)/g) || []).length;
        if (depth > 0 && (isDigit(last) || last === ')' || last === '%')) return prev + ')';
        if (isDigit(last) || last === ')' || last === '%') return prev + '*(';
        return prev + '(';
      }
      if (key === 'BS') return fresh ? '' : prev.slice(0, -1);
      if (key === 'C') return '';
      return prev;
    });
    if (key !== '=') setFresh(false);
  }, [fresh]);

  const evaluateNow = useCallback(() => {
    const v = evaluateExpression(expr);
    if (v == null) {
      if (expr) setShake(true);
      return;
    }
    setExpr(toInputValue(v));
    setFresh(true);
  }, [expr]);

  const canApply = result != null && (allowNegative || result >= 0);

  const apply = useCallback(() => {
    const v = expr ? evaluateExpression(expr) ?? result : 0;
    if (v == null || (!allowNegative && v < 0)) {
      setShake(true);
      return;
    }
    onApply(v);
    onClose();
  }, [expr, result, allowNegative, onApply, onClose]);

  // دعم لوحة المفاتيح الفعلية — بمرحلة الالتقاط كي لا تُغلق Esc النافذة الأم.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      let k = normalizeExpression(e.key);
      if (e.key === 'Enter') k = 'ENTER';
      else if (e.key === 'Escape') k = 'ESC';
      else if (e.key === 'Backspace') k = 'BS';
      else if (e.key === 'Delete') k = 'C';
      else if (e.key === '(' || e.key === ')') k = '()';
      else if (e.key === ',' || e.key === '٫') k = '.';
      if (!k || !(isDigit(k) || '.+-*/%='.includes(k) || ['ENTER', 'ESC', 'BS', 'C', '()'].includes(k))) return;
      e.preventDefault();
      e.stopPropagation();
      if (k === 'ESC') onClose();
      else if (k === 'ENTER') apply();
      else if (k === '=') evaluateNow();
      else press(k);
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [open, onClose, apply, evaluateNow, press]);

  if (!open) return null;

  const resultText = result != null ? numberFmt.format(result) : '—';

  return createPortal(
    <div className="fixed inset-0 z-[1300] flex items-end justify-center sm:items-center sm:p-4" dir="rtl">
      <div
        className="absolute inset-0 bg-black/35 backdrop-blur-[2px] calc-fade-in"
        onClick={(e) => {
          e.stopPropagation();
          onClose();
        }}
        aria-hidden
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
        className={cn(
          'relative w-full max-w-md outline-none',
          'rounded-t-2xl border border-border bg-surface-panel shadow-xl calc-sheet-in',
          'pb-[max(12px,env(safe-area-inset-bottom))]',
          'sm:w-[340px] sm:rounded-2xl sm:pb-3',
        )}
      >
        <div className="mx-auto mt-2 h-1 w-10 rounded-full bg-border sm:hidden" aria-hidden />
        <header className="flex items-center justify-between gap-2 px-4 pb-1 pt-2.5">
          <span className="flex items-center gap-1.5 text-xs font-extrabold text-fg font-arabic">
            <Calculate sx={{ fontSize: 17 }} style={{ color: 'var(--accent-ink)' }} />
            {title}
          </span>
          <button
            type="button"
            onClick={onClose}
            aria-label="إغلاق الحاسبة"
            className="grid size-11 place-items-center rounded-md text-fg-muted transition hover:bg-surface-hover hover:text-fg"
          >
            <Close sx={{ fontSize: 17 }} />
          </button>
        </header>

        {/* الشاشة */}
        <div
          className={cn(
            'mx-3 rounded-xl border border-border bg-surface-sunken/70 px-3.5 py-2.5 text-end',
            shake && 'calc-shake border-[color:var(--brand-danger)]',
          )}
          dir="ltr"
          aria-live="polite"
        >
          <p className="min-h-[1.25rem] truncate font-num text-sm font-semibold tabular-nums text-fg-muted">
            {expr ? prettyExpression(expr) : '0'}
          </p>
          <p
            className={cn(
              'mt-0.5 truncate font-num text-[1.75rem] font-extrabold leading-tight tabular-nums',
              result != null && result < 0 && !allowNegative ? 'text-[color:var(--brand-danger)]' : 'text-fg',
            )}
          >
            <span className="me-1 text-base font-bold text-fg-subtle">=</span>
            {resultText}
            {unit && result != null && <span className="ms-1.5 text-xs font-bold text-fg-muted font-arabic">{unit}</span>}
          </p>
        </div>

        {/* لوحة المفاتيح */}
        <div className="grid grid-cols-4 gap-1.5 px-3 pt-2.5" dir="ltr">
          {KEYS.map((k) => (
            <button
              key={k.key}
              type="button"
              aria-label={k.aria ?? String(k.label)}
              onClick={() => (k.key === '=' ? evaluateNow() : press(k.key))}
              className={cn(
                'h-12 select-none rounded-xl font-num text-lg font-bold transition active:scale-[0.96] sm:h-11',
                'focus:outline-none focus-visible:shadow-focus',
                k.kind === 'digit' && 'border border-border bg-surface-raised text-fg hover:bg-surface-hover',
                k.kind === 'op' &&
                  'bg-[color-mix(in_srgb,var(--brand-primary)_12%,transparent)] text-[color:var(--brand-primary)] hover:bg-[color-mix(in_srgb,var(--brand-primary)_18%,transparent)]',
                k.kind === 'fn' && 'bg-surface-sunken text-fg-muted hover:bg-surface-hover hover:text-fg',
                k.kind === 'eq' && 'bg-[color:var(--brand-primary)] text-white shadow-sm hover:opacity-95',
                k.key === 'C' && 'text-[color:var(--brand-danger)]',
              )}
            >
              {k.label}
            </button>
          ))}
        </div>

        {/* الإجراءات */}
        <div className="flex gap-2 px-3 pt-2.5">
          <button
            type="button"
            onClick={onClose}
            className="h-11 rounded-xl border border-border px-4 text-sm font-bold text-fg-muted transition hover:bg-surface-hover font-arabic"
          >
            إلغاء
          </button>
          <button
            type="button"
            onClick={apply}
            disabled={!canApply}
            className={cn(
              'flex h-11 min-w-0 flex-1 items-center justify-center gap-1.5 rounded-xl px-3 text-sm font-extrabold text-white shadow-sm transition font-arabic',
              'bg-[color:var(--brand-primary)] hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-45',
            )}
          >
            <span>استخدام</span>
            {result != null && (
              <bdi className="truncate font-num tabular-nums" dir="ltr">
                {resultText}
              </bdi>
            )}
          </button>
        </div>
        {result != null && result < 0 && !allowNegative && (
          <p className="px-4 pt-1.5 text-center text-2xs font-bold text-[color:var(--brand-danger)] font-arabic">
            الناتج سالب — لا يمكن استخدامه في هذا الحقل
          </p>
        )}
      </div>
    </div>,
    document.body,
  );
}

/**
 * زر حاسبة صغير يُلحق بحقل إدخال: يفتح الحاسبة بقيمة الحقل الحالية ويكتب الناتج فيه
 * (يعمل مع أي حقل مُتحكَّم به — react-hook-form أو useState).
 */
export function CalculatorButton({
  inputRef,
  title,
  unit,
  allowNegative,
  onApplied,
  className,
  size = 'md',
}: {
  inputRef: RefObject<HTMLInputElement | HTMLTextAreaElement>;
  title?: string;
  unit?: string;
  allowNegative?: boolean;
  onApplied?: (value: number) => void;
  className?: string;
  size?: 'sm' | 'md';
}) {
  const [open, setOpen] = useState(false);
  const [seed, setSeed] = useState('');
  const btnRef = useRef<HTMLButtonElement>(null);

  const close = useCallback(() => {
    setOpen(false);
    btnRef.current?.focus({ preventScroll: true });
  }, []);

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        aria-label={title ? `فتح ${title}` : 'فتح الحاسبة'}
        title="حاسبة"
        onMouseDown={(e) => e.preventDefault()}
        onClick={(e) => {
          e.stopPropagation();
          setSeed(inputRef.current?.value ?? '');
          setOpen(true);
        }}
        className={cn(
          'grid shrink-0 place-items-center rounded-md text-[color:var(--brand-primary)] transition',
          'bg-[color-mix(in_srgb,var(--brand-primary)_9%,transparent)] hover:bg-[color-mix(in_srgb,var(--brand-primary)_16%,transparent)]',
          'focus:outline-none focus-visible:shadow-focus active:scale-95',
          size === 'sm' ? 'size-10' : 'size-11',
          className,
        )}
      >
        <Calculate sx={{ fontSize: size === 'sm' ? 20 : 22 }} />
      </button>
      <CalculatorPad
        open={open}
        onClose={close}
        initialValue={seed}
        title={title}
        unit={unit}
        allowNegative={allowNegative}
        onApply={(v) => {
          const input = inputRef.current;
          if (input) setNativeInputValue(input, toInputValue(v));
          onApplied?.(v);
        }}
      />
    </>
  );
}
