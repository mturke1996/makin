import app from '../config/firebase';

/**
 * Removes an attachment saved on an older expense (the app no longer uploads new ones).
 * The storage library is fetched only when there is something to delete, not with the app.
 */
export async function deleteStorageFileByUrl(url: string | undefined | null): Promise<void> {
  if (!url || typeof url !== 'string') return;
  try {
    const u = new URL(url);
    const idx = u.pathname.indexOf('/o/');
    if (idx === -1) return;
    const encoded = u.pathname.slice(idx + 3);
    const objectPath = decodeURIComponent(encoded.split('?')[0] || '');
    if (!objectPath) return;
    const { getStorage, ref, deleteObject } = await import('firebase/storage');
    await deleteObject(ref(getStorage(app), objectPath));
  } catch (err) {
    console.warn('[storage] delete attachment failed:', err);
  }
}
