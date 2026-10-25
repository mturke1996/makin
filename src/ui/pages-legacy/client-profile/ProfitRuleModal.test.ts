// @vitest-environment jsdom
import { act, createElement, useState } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ProfitRuleModal } from './ProfitRuleModal';
import type { ClientProfitBase } from '../../../types';

let root: Root;
let host: HTMLDivElement;
const onSave = vi.fn();

function Harness({ initial = '', initialBase = 'expenses' as ClientProfitBase }) {
  const [pct, setPct] = useState(initial);
  const [base, setBase] = useState<ClientProfitBase>(initialBase);
  return createElement(ProfitRuleModal, {
    open: true,
    onClose: vi.fn(),
    percentage: pct,
    onPercentageChange: setPct,
    base,
    onBaseChange: setBase,
    totals: { totalExpenses: 73390, totalPaid: 85000 },
    onSave: () => onSave(pct, base),
  });
}

async function mount(props = {}) {
  host = document.createElement('div');
  document.body.append(host);
  root = createRoot(host);
  await act(async () => { root.render(createElement(Harness, props)); });
}
const field = () => document.querySelector<HTMLInputElement>('input[inputmode="decimal"]')!;
async function type(value: string) {
  await act(async () => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(field(), value);
    field().dispatchEvent(new Event('input', { bubbles: true }));
  });
}
const preview = () => document.querySelector('dl')!.textContent!.replace(/\s+/g, ' ');

beforeEach(() => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  window.matchMedia = vi.fn().mockReturnValue({ matches: false, addListener: vi.fn(), removeListener: vi.fn(), addEventListener: vi.fn(), removeEventListener: vi.fn() });
  onSave.mockReset();
});
afterEach(async () => { await act(async () => { root?.unmount(); }); document.body.innerHTML = ''; });

describe('ProfitRuleModal', () => {
  it('shows the field and previews the value as the percentage is typed', async () => {
    await mount();
    expect(field()).toBeTruthy();
    await type('15');
    expect(preview()).toContain('11,008.5');
  });

  it('switching the base to payments recomputes the preview from the payments total', async () => {
    await mount({ initial: '10' });
    const radios = [...document.querySelectorAll<HTMLInputElement>('input[type="radio"]')];
    expect(radios).toHaveLength(2);
    await act(async () => { radios[1].click(); });
    expect(radios[1].checked).toBe(true);
    expect(preview()).toContain('8,500');
  });

  it('says why a percentage cannot be saved, and does not offer to save it', async () => {
    await mount();
    const save = () => [...document.querySelectorAll('button')].find((b) => b.textContent?.includes('حفظ النسبة'))!;
    for (const bad of ['100', '150', '-5', 'abc']) {
      await type(bad);
      expect(document.querySelector('[role="alert"]'), bad).toBeTruthy();
      expect(save().disabled, bad).toBe(true);
    }
    // Nothing is previewed for a percentage that cannot be used.
    await type('150');
    expect(preview()).toContain('0%');
    await type('10');
    expect(document.querySelector('[role="alert"]')).toBeNull();
    expect(save().disabled).toBe(false);
  });

  it('takes the percent sign, Arabic digits and an empty field', async () => {
    await mount();
    const save = () => [...document.querySelectorAll('button')].find((b) => b.textContent?.includes('حفظ النسبة'))!;
    await type('10%');
    expect(save().disabled).toBe(false);
    expect(preview()).toContain('7,339');
    await type('١٥');
    expect(preview()).toContain('11,008.5');
    await type('');
    expect(save().disabled).toBe(false);
  });

  it('cancels without saving', async () => {
    await mount();
    await act(async () => { [...document.querySelectorAll('button')].find((b) => b.textContent?.trim() === 'إلغاء')!.click(); });
    expect(onSave).not.toHaveBeenCalled();
  });

  it('saves with what was typed', async () => {
    await mount();
    await type('12.5');
    await act(async () => { [...document.querySelectorAll('button')].find((b) => b.textContent?.includes('حفظ النسبة'))!.click(); });
    expect(onSave).toHaveBeenCalledWith('12.5', 'expenses');
  });
});
