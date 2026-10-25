import { deleteDoc, doc, getDoc } from 'firebase/firestore';
import { db } from '../config/firebase';

/** localStorage key the old app-lock store persisted its state under (it held who had unlocked the session). */
const LEGACY_LOCK_STORAGE_KEY = 'app-lock-storage';

/**
 * The old PIN "app lock" kept its settings, including the PIN in plain text, in settings/appLock.
 * Nothing reads it any more (access is permissions now), so an admin session deletes it. Employees
 * could already no longer read it: the rules keep `settings` for admins.
 */
export async function retireLegacyAppLock(): Promise<void> {
  try {
    localStorage.removeItem(LEGACY_LOCK_STORAGE_KEY);
  } catch {
    /* private mode */
  }
  try {
    const ref = doc(db, 'settings', 'appLock');
    if ((await getDoc(ref)).exists()) await deleteDoc(ref);
  } catch (error) {
    console.warn('[access] could not retire legacy app lock settings:', error);
  }
}
