import { getStorage, ref, deleteObject } from 'firebase/storage';
import app from '../config/firebase';

const storage = getStorage(app);

/** Removes an attachment saved on an older expense (the app no longer uploads new ones). */
export async function deleteStorageFileByUrl(url: string | undefined | null): Promise<void> {
  if (!url || typeof url !== 'string') return;
  try {
    const u = new URL(url);
    const idx = u.pathname.indexOf('/o/');
    if (idx === -1) return;
    const encoded = u.pathname.slice(idx + 3);
    const objectPath = decodeURIComponent(encoded.split('?')[0] || '');
    if (!objectPath) return;
    await deleteObject(ref(storage, objectPath));
  } catch (err) {
    console.warn('[storage] delete attachment failed:', err);
  }
}
