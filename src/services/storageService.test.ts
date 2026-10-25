import { beforeEach, describe, expect, it, vi } from 'vitest';

const sdk = vi.hoisted(() => ({ loaded: vi.fn(), ref: vi.fn((_s: unknown, p: string) => ({ path: p })), deleteObject: vi.fn().mockResolvedValue(undefined) }));
vi.mock('../config/firebase', () => ({ default: { name: 'app' } }));
vi.mock('firebase/storage', () => {
  sdk.loaded();
  return { getStorage: () => ({ bucket: 'b' }), ref: sdk.ref, deleteObject: sdk.deleteObject };
});

import { deleteStorageFileByUrl } from './storageService';

beforeEach(() => { sdk.loaded.mockClear(); sdk.ref.mockClear(); sdk.deleteObject.mockClear(); });

describe('deleteStorageFileByUrl', () => {
  it('does not even fetch the storage library when there is nothing to delete', async () => {
    for (const url of [undefined, null, '', 'not a url', 'https://example.com/file.png']) await deleteStorageFileByUrl(url as never);
    expect(sdk.loaded).not.toHaveBeenCalled();
    expect(sdk.deleteObject).not.toHaveBeenCalled();
  });

  it('deletes the object a storage link points at', async () => {
    await deleteStorageFileByUrl('https://firebasestorage.googleapis.com/v0/b/x/o/expenses%2Fa%20b.jpg?alt=media&token=t');
    expect(sdk.ref).toHaveBeenCalledWith({ bucket: 'b' }, 'expenses/a b.jpg');
    expect(sdk.deleteObject).toHaveBeenCalledOnce();
  });

  it('only warns when the delete fails', async () => {
    sdk.deleteObject.mockRejectedValueOnce(new Error('object-not-found'));
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    await expect(deleteStorageFileByUrl('https://x.test/v0/b/x/o/gone.jpg?alt=media')).resolves.toBeUndefined();
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });
});
