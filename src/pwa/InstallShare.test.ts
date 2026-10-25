// @vitest-environment jsdom
import { act, createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';

const toast = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }));
vi.mock('react-hot-toast', () => ({ default: toast }));
vi.mock('../config/BrandProvider', () => ({ useBrand: () => ({ name: 'MAKIN', direction: 'rtl' }) }));

import { InstallShare } from './InstallUi';

let root: Root;
let host: HTMLDivElement;
const URL_ = `${window.location.origin}/install`;
const button = (label: string) => [...host.querySelectorAll<HTMLButtonElement>('button')].find((b) => b.textContent?.includes(label))!;

beforeEach(async () => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  toast.success.mockReset(); toast.error.mockReset();
  host = document.createElement('div'); document.body.append(host); root = createRoot(host);
  await act(async () => root.render(createElement(InstallShare, { title: 'ثبّت التطبيق', description: 'شارك الرابط' })));
});
afterEach(async () => { await act(async () => root.unmount()); host.remove(); vi.restoreAllMocks(); Object.assign(navigator, { share: undefined, canShare: undefined }); });

it('«مشاركة الرابط» hands the phone a text that holds the link of the system', async () => {
  const share = vi.fn().mockResolvedValue(undefined);
  Object.assign(navigator, { share, canShare: () => true });
  await act(async () => button('مشاركة الرابط').click());
  expect(share).toHaveBeenCalledOnce();
  expect(share.mock.calls[0][0].text).toContain(URL_);
  expect(share.mock.calls[0][0]).not.toHaveProperty('url');
  expect(toast.error).not.toHaveBeenCalled();
});

it('copies the link and says so when the phone refuses to share, instead of doing nothing', async () => {
  const writeText = vi.fn().mockResolvedValue(undefined);
  Object.assign(navigator, { share: vi.fn().mockRejectedValue(Object.assign(new Error('x'), { name: 'NotAllowedError' })), clipboard: { writeText } });
  await act(async () => button('مشاركة الرابط').click());
  expect(writeText).toHaveBeenCalledWith(expect.stringContaining(URL_));
  expect(toast.success).toHaveBeenCalledWith(expect.stringContaining('نسخ'));
});

it('stays quiet when the share sheet is closed on purpose', async () => {
  const writeText = vi.fn();
  Object.assign(navigator, { share: vi.fn().mockRejectedValue(Object.assign(new Error('x'), { name: 'AbortError' })), clipboard: { writeText } });
  await act(async () => button('مشاركة الرابط').click());
  expect(writeText).not.toHaveBeenCalled();
  expect(toast.success).not.toHaveBeenCalled();
  expect(toast.error).not.toHaveBeenCalled();
});

it('has a WhatsApp button that always works, share sheet or not', async () => {
  const open = vi.spyOn(window, 'open').mockReturnValue(null);
  await act(async () => button('واتساب').click());
  expect(open).toHaveBeenCalledOnce();
  const href = open.mock.calls[0][0] as string;
  expect(href.startsWith('https://wa.me/?text=')).toBe(true);
  expect(decodeURIComponent(href)).toContain(URL_);
});

it('«نسخ الرابط» copies just the link', async () => {
  const writeText = vi.fn().mockResolvedValue(undefined);
  Object.assign(navigator, { clipboard: { writeText } });
  await act(async () => button('نسخ الرابط').click());
  expect(writeText).toHaveBeenCalledWith(URL_);
  expect(toast.success).toHaveBeenCalled();
});
