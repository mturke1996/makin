/**
 * The app works online only: a change is either confirmed by the server or the person is told at once that it was not.
 *
 * - With no connection nothing is written (`requireOnline`): no hidden queue, no «saved on this device».
 * - With a connection the screen already shows the change (Firestore applies it locally the moment it is sent) and the
 *   button waits for the server's answer, but never longer than `WRITE_WAIT_MS`: a refusal (permission, rules) reaches
 *   the person while they are looking, and a dead connection ends in a clear message instead of a spinner.
 */

/** How long a button waits for the server before it reports a slow connection. */
export const WRITE_WAIT_MS = 10000;

export const OFFLINE_MESSAGE = 'لا يوجد اتصال بالإنترنت. اتصل ثم أعد المحاولة، لم يُحفظ شيء.';
export const SLOW_NETWORK_MESSAGE = 'الاتصال بطيء ولم يصل رد من الخادم. تحقق من الإنترنت ثم حاول مجدداً.';

const isOffline = () => typeof navigator !== 'undefined' && navigator.onLine === false;

/** Throws before anything is written when the device knows it has no connection. */
export function requireOnline(): void {
  if (isOffline()) throw Object.assign(new Error(OFFLINE_MESSAGE), { code: 'offline' });
}

/**
 * Rejects with `message` when `work` has not settled in `ms`. The work itself is not cancelled: every write uses a fixed
 * document id, so a late success and a retry never make two records.
 */
export function boundOnline<T>(work: Promise<T>, ms: number = WRITE_WAIT_MS, message: string = SLOW_NETWORK_MESSAGE): Promise<T> {
  if (isOffline()) {
    work.catch(() => undefined);
    return Promise.reject(Object.assign(new Error(OFFLINE_MESSAGE), { code: 'offline' }));
  }
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(Object.assign(new Error(message), { code: 'slow-network' })), ms);
    work.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        clearTimeout(timer);
        reject(error);
      },
    );
  });
}

/** A write to the server: refused at once when offline, otherwise confirmed or reported within `WRITE_WAIT_MS`. */
export async function confirmWrite(start: () => Promise<unknown>, ms: number = WRITE_WAIT_MS): Promise<void> {
  requireOnline();
  await boundOnline(start(), ms);
}
