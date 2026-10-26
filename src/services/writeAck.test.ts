import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { OFFLINE_MESSAGE, SLOW_NETWORK_MESSAGE, WRITE_WAIT_MS, boundOnline, confirmWrite, requireOnline } from './writeAck';

const never = () => new Promise<void>(() => undefined);
const setOnline = (online: boolean) => vi.stubGlobal('navigator', { onLine: online });

beforeEach(() => {
  vi.useFakeTimers();
  setOnline(true);
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('requireOnline', () => {
  it('lets a connected device through', () => {
    expect(() => requireOnline()).not.toThrow();
  });

  it('refuses at once with a message of its own when there is no connection', () => {
    setOnline(false);
    expect(() => requireOnline()).toThrow(OFFLINE_MESSAGE);
  });
});

describe('confirmWrite', () => {
  it('resolves when the server answers', async () => {
    await expect(confirmWrite(() => Promise.resolve())).resolves.toBeUndefined();
  });

  it('passes a refusal (permission, rules) to the caller', async () => {
    await expect(confirmWrite(() => Promise.reject(Object.assign(new Error('x'), { code: 'permission-denied' })))).rejects.toMatchObject({ code: 'permission-denied' });
  });

  it('never even starts the write when offline: nothing is queued on the device', async () => {
    setOnline(false);
    const write = vi.fn(() => Promise.resolve());
    await expect(confirmWrite(write)).rejects.toMatchObject({ code: 'offline', message: OFFLINE_MESSAGE });
    expect(write).not.toHaveBeenCalled();
  });

  it('reports a silent server after the wait instead of spinning for ever', async () => {
    const done = confirmWrite(never);
    const assertion = expect(done).rejects.toMatchObject({ code: 'slow-network', message: SLOW_NETWORK_MESSAGE });
    await vi.advanceTimersByTimeAsync(WRITE_WAIT_MS - 1);
    await vi.advanceTimersByTimeAsync(2);
    await assertion;
  });

  it('can be pressed again right after a success: every call is independent', async () => {
    const write = vi.fn(() => Promise.resolve());
    await confirmWrite(write);
    await confirmWrite(write);
    await confirmWrite(write);
    expect(write).toHaveBeenCalledTimes(3);
  });
});

describe('boundOnline', () => {
  it('passes the result and the error of work that finishes in time', async () => {
    await expect(boundOnline(Promise.resolve(7), 1000, 'slow')).resolves.toBe(7);
    await expect(boundOnline(Promise.reject(new Error('denied')), 1000, 'slow')).rejects.toThrow('denied');
  });

  it('gives up with its message when the work stays silent', async () => {
    const result = boundOnline(never(), 5000, 'تأخر الإرسال');
    const assertion = expect(result).rejects.toMatchObject({ message: 'تأخر الإرسال', code: 'slow-network' });
    await vi.advanceTimersByTimeAsync(5000);
    await assertion;
  });

  it('refuses at once when offline, and swallows the abandoned work\'s own error', async () => {
    setOnline(false);
    await expect(boundOnline(Promise.reject(new Error('late')), 1000, 'slow')).rejects.toMatchObject({ code: 'offline' });
  });
});
