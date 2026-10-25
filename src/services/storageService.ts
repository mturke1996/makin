import app from '../config/firebase';

/** The storage service, loaded on first use; against the local emulators it talks to the storage emulator. */
async function appStorage() {
  const { getStorage, connectStorageEmulator } = await import('firebase/storage');
  const storage = getStorage(app);
  if (import.meta.env.VITE_USE_EMULATORS === 'true' && !(storage as unknown as { _emulatorConnected?: boolean })._emulatorConnected) {
    connectStorageEmulator(storage, '127.0.0.1', 9199);
    (storage as unknown as { _emulatorConnected?: boolean })._emulatorConnected = true;
  }
  return storage;
}

/**
 * Removes a receipt file saved on an expense (when it is replaced, removed, or the expense is deleted).
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
    const { ref, deleteObject } = await import('firebase/storage');
    await deleteObject(ref(await appStorage(), objectPath));
  } catch (err) {
    console.warn('[storage] delete attachment failed:', err);
  }
}

/**
 * Saves the photo of an expense's receipt at `expenses/{expenseId}/…` (the only place the storage rules open).
 * The storage library is fetched only when a photo is actually uploaded.
 */
export async function uploadExpenseReceipt(expenseId: string, photo: Blob): Promise<{ url: string; name: string }> {
  const { ref, uploadBytes, getDownloadURL } = await import('firebase/storage');
  const name = `receipt-${Date.now()}.jpg`;
  const target = ref(await appStorage(), `expenses/${expenseId}/${name}`);
  await uploadBytes(target, photo, { contentType: 'image/jpeg' });
  return { url: await getDownloadURL(target), name: 'صورة الفاتورة' };
}
