import toast from 'react-hot-toast';
import { deleteStorageFileByUrl, uploadExpenseReceipt } from '../../../services/storageService';
import type { Expense } from '../../../types';

/** What the person did with the receipt photo in the expense form. */
export interface ReceiptChoice {
  /** A new photo, already scaled down; null when none was taken or picked. */
  photo: Blob | null;
  /** The saved attachment was removed (and not replaced). */
  remove: boolean;
}

export const NO_RECEIPT_CHANGE: ReceiptChoice = { photo: null, remove: false };

/**
 * The attachment fields to save with the expense, after acting on the choice: a new photo is uploaded (and the
 * one it replaces deleted), a removal deletes the file and clears the fields. A failed upload never loses the
 * expense: it is saved without the photo and the person is told to add it again.
 * Firestore strips `undefined`, so a cleared field is `null` (the same convention the other forms use).
 */
export async function receiptPatch(
  expenseId: string,
  existing: Pick<Expense, 'attachmentUrl' | 'attachmentName'> | null | undefined,
  choice: ReceiptChoice,
): Promise<Partial<Pick<Expense, 'attachmentUrl' | 'attachmentName'>>> {
  const cleared = null as unknown as undefined;
  if (choice.photo) {
    try {
      const saved = await uploadExpenseReceipt(expenseId, choice.photo);
      if (existing?.attachmentUrl) void deleteStorageFileByUrl(existing.attachmentUrl);
      return { attachmentUrl: saved.url, attachmentName: saved.name };
    } catch (error) {
      console.error('receipt upload', error);
      toast.error('تعذّر رفع صورة الفاتورة، حُفظ المصروف بدونها. أضفها من تعديل المصروف عند توفر الاتصال.');
      return {};
    }
  }
  if (choice.remove && existing?.attachmentUrl) {
    void deleteStorageFileByUrl(existing.attachmentUrl);
    return { attachmentUrl: cleared, attachmentName: cleared };
  }
  return {};
}
