// @vitest-environment jsdom
import { act, createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { CategoryBreakdown } from './CategoryBreakdown';

let root: Root;
let host: HTMLDivElement;
beforeEach(() => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  window.matchMedia = vi.fn().mockReturnValue({ matches: true, addListener: vi.fn(), removeListener: vi.fn(), addEventListener: vi.fn(), removeEventListener: vi.fn() });
  host = document.createElement('div'); document.body.append(host); root = createRoot(host);
});
afterEach(async () => { await act(async () => root.unmount()); host.remove(); });

const data = [
  { key: 'a', label: 'حديد', value: 24200, count: 3 },
  { key: 'b', label: 'خرسانة', value: 20240, count: 2 },
  { key: 'c', label: 'تسليح', value: 18500, count: 2 },
  { key: 'd', label: 'أسمنت', value: 3600, count: 1 },
  { key: 'e', label: 'معدات', value: 2800, count: 1 },
  { key: 'f', label: 'نقل', value: 4050, count: 1 },
];
const total = data.reduce((s, d) => s + d.value, 0);
const shareLabels = () => [...host.querySelectorAll('li span.text-xs bdi')].map((el) => el.textContent!);
const percents = () => shareLabels().map((t) => Number(t.replace('%', '')));

it('prints shares that add up to 100 (the list used to read 101)', async () => {
  await act(async () => root.render(createElement(CategoryBreakdown, { data, total, active: 'all', onSelect: vi.fn(), initialRows: 6 })));
  const p = percents();
  expect(p).toHaveLength(6);
  expect(p.reduce((a, b) => a + b, 0)).toBe(100);
});

it('never prints 0% for something that exists', async () => {
  const tiny = [{ key: 'a', label: 'كبير', value: 100000, count: 1 }, { key: 'b', label: 'صغير', value: 1, count: 1 }];
  await act(async () => root.render(createElement(CategoryBreakdown, { data: tiny, total: 100001, active: 'all', onSelect: vi.fn() })));
  expect(shareLabels()).toEqual(['100%', '<1%']);
});

it('wears the wording of what it breaks down, and selects and clears like a filter', async () => {
  const onSelect = vi.fn();
  const wording = { region: 'المدفوعات حسب طريقة الدفع', title: 'حسب طريقة الدفع', count: (n: number) => `${n} طرق`, all: (n: number) => `عرض كل الطرق (${n})` };
  await act(async () => root.render(createElement(CategoryBreakdown, { data, total, active: 'all', onSelect, initialRows: 2, wording })));
  expect(host.querySelector('section')!.getAttribute('aria-label')).toBe('المدفوعات حسب طريقة الدفع');
  expect(host.textContent).toContain('حسب طريقة الدفع');
  expect(host.textContent).toContain('6 طرق');
  expect(host.textContent).toContain('عرض كل الطرق (6)');
  expect(host.querySelectorAll('li')).toHaveLength(2);
  await act(async () => host.querySelector<HTMLButtonElement>('li button')!.click());
  expect(onSelect).toHaveBeenCalledWith('a');
  await act(async () => root.render(createElement(CategoryBreakdown, { data, total, active: 'a', onSelect, initialRows: 2, wording })));
  await act(async () => host.querySelector<HTMLButtonElement>('li button')!.click());
  expect(onSelect).toHaveBeenLastCalledWith('all');
});

it('renders nothing without data', async () => {
  await act(async () => root.render(createElement(CategoryBreakdown, { data: [], total: 0, active: 'all', onSelect: vi.fn() })));
  expect(host.textContent).toBe('');
});
