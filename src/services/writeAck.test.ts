import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ACK_WAIT_OFFLINE_MS, ACK_WAIT_ONLINE_MS, ackOrQueue, boundOnline, queuedWrites, setLateFailureReporter } from './writeAck';

const never = () => new Promise<void>(() => undefined);
let late: ReturnType<typeof vi.fn<(error: unknown) => void>>;

beforeEach(() => {
  vi.useFakeTimers();
  late = vi.fn<(error: unknown) => void>();
  setLateFailureReporter(late);
});
afterEach(() => {
  vi.useRealTimers();
  setLateFailureReporter(null);
  vi.unstubAllGlobals();
});

describe('ackOrQueue', () => {
  it('is «confirmed» when the server answers in time, and counts nothing as queued', async () => {
    const before = queuedWrites();
    await expect(ackOrQueue(Promise.resolve())).resolves.toBe('confirmed');
    expect(queuedWrites()).toBe(before);
  });

  it('passes a refusal that arrives in time to the caller', async () => {
    await expect(ackOrQueue(Promise.reject(Object.assign(new Error('x'), { code: 'permission-denied' })))).rejects.toMatchObject({ code: 'permission-denied' });
    expect(late).not.toHaveBeenCalled();
  });

  it('lets go after the wait instead of spinning for ever: «queued»', async () => {
    const before = queuedWrites();
    const result = ackOrQueue(never());
    await vi.advanceTimersByTimeAsync(ACK_WAIT_ONLINE_MS - 1);
    let settled = false;
    void result.then(() => { settled = true; });
    await Promise.resolve();
    expect(settled).toBe(false);
    await vi.advanceTimersByTimeAsync(2);
    await expect(result).resolves.toBe('queued');
    expect(queuedWrites()).toBe(before + 1);
  });

  it('tells the person when the server turns a let-go change down later', async () => {
    let refuse!: (e: unknown) => void;
    const write = new Promise<void>((_, reject) => { refuse = reject; });
    const result = ackOrQueue(write);
    await vi.advanceTimersByTimeAsync(ACK_WAIT_ONLINE_MS + 1);
    await expect(result).resolves.toBe('queued');
    expect(late).not.toHaveBeenCalled();
    const error = Object.assign(new Error('refused'), { code: 'permission-denied' });
    refuse(error);
    await vi.advanceTimersByTimeAsync(0);
    expect(late).toHaveBeenCalledExactlyOnceWith(error);
  });

  it('stays quiet when a let-go change is accepted later', async () => {
    let accept!: () => void;
    const write = new Promise<void>((resolve) => { accept = resolve; });
    const result = ackOrQueue(write);
    await vi.advanceTimersByTimeAsync(ACK_WAIT_ONLINE_MS + 1);
    await result;
    accept();
    await vi.advanceTimersByTimeAsync(0);
    expect(late).not.toHaveBeenCalled();
  });

  it('does not make anyone wait when the device already knows it is offline', async () => {
    vi.stubGlobal('navigator', { onLine: false });
    const result = ackOrQueue(never());
    await vi.advanceTimersByTimeAsync(ACK_WAIT_OFFLINE_MS + 1);
    await expect(result).resolves.toBe('queued');
  });

  it('accepts an explicit wait', async () => {
    const result = ackOrQueue(never(), 50);
    await vi.advanceTimersByTimeAsync(51);
    await expect(result).resolves.toBe('queued');
  });
});

describe('boundOnline', () => {
  it('passes the answer through when it comes in time', async () => {
    await expect(boundOnline(Promise.resolve(7), 1000, 'slow')).resolves.toBe(7);
    await expect(boundOnline(Promise.reject(new Error('denied')), 1000, 'slow')).rejects.toThrow('denied');
  });

  it('gives up with the message and a deadline code when nothing comes', async () => {
    const result = boundOnline(never(), 1000, 'الاتصال بطيء');
    const caught = result.catch((e) => e);
    await vi.advanceTimersByTimeAsync(1001);
    const error = await caught;
    expect(error).toMatchObject({ message: 'الاتصال بطيء', code: 'deadline-exceeded' });
  });

  it('does not reject later once it has answered', async () => {
    const out = boundOnline(Promise.resolve('ok'), 1000, 'slow');
    await expect(out).resolves.toBe('ok');
    await vi.advanceTimersByTimeAsync(5000);
  });
});
