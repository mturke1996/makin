import toast from 'react-hot-toast';
import { formatFirebaseError } from '../core/formatFirebaseError';

/**
 * Waiting for the server is not the same as saving.
 *
 * With the local cache on, Firestore applies a write to this device at once and sends it when it can. The promise it
 * returns, though, settles only when the SERVER answers: on a weak or lost connection it stays open for minutes, and a
 * button that waits for it spins with nothing to say. `ackOrQueue` waits a short while (2.5s) for the answer (so a refusal
 * such as «permission denied» still reaches the person while they are looking), and then lets go: the change is on
 * the device, it goes up by itself, and if the server turns it down later the person is told then.
 */

/** How long a button waits for the server before the change is treated as «saved here, uploading». */
export const ACK_WAIT_ONLINE_MS = 2500;
/** The same when the device already knows it is offline: no point making anyone wait. */
export const ACK_WAIT_OFFLINE_MS = 400;

let queued = 0;
/** How many writes so far were let go before the server answered (a screen compares before and after an action). */
export const queuedWrites = () => queued;

type LateFailureReporter = (error: unknown) => void;
const defaultReporter: LateFailureReporter = (error) => {
  console.warn('[write] the server refused a change saved on this device:', error);
  toast.error(`تعذّر رفع تغيير حُفظ على جهازك: ${formatFirebaseError(error)}`, { duration: 8000 });
};
let reportLateFailure: LateFailureReporter = defaultReporter;
/** For tests: replace what happens when a write that was let go is refused later. */
export function setLateFailureReporter(reporter: LateFailureReporter | null) {
  reportLateFailure = reporter ?? defaultReporter;
}

const isOffline = () => typeof navigator !== 'undefined' && navigator.onLine === false;

export type AckResult = 'confirmed' | 'queued';

export async function ackOrQueue(write: Promise<unknown>, waitMs: number = isOffline() ? ACK_WAIT_OFFLINE_MS : ACK_WAIT_ONLINE_MS): Promise<AckResult> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const slow = new Promise<'queued'>((resolve) => {
    timer = setTimeout(() => resolve('queued'), waitMs);
  });
  try {
    // A refusal that arrives in time rejects here, and the caller shows it like any other error.
    const result = await Promise.race([write.then(() => 'confirmed' as const), slow]);
    if (result === 'queued') {
      queued += 1;
      write.catch(reportLateFailure);
    }
    return result;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * For work that cannot be left half done on the device (a transaction needs the server): gives up waiting after `ms`
 * with `message`, instead of spinning for ever. The work itself is not cancelled.
 */
export function boundOnline<T>(work: Promise<T>, ms: number, message: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(Object.assign(new Error(message), { code: 'deadline-exceeded' })), ms);
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

export const SLOW_NETWORK_MESSAGE = 'الاتصال بطيء ولم يصل رد من الخادم. تحقق من الإنترنت ثم حاول مجدداً.';
