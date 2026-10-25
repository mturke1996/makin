import { collection, doc, getDocs, query, where, writeBatch, type DocumentReference, type DocumentData } from 'firebase/firestore';
import { db } from '../../../config/firebase';

type OwnedRecord = { ref: DocumentReference<DocumentData>; data: DocumentData };

/**
 * Everything one user owns: expenses and custody balances. Matched by `userId`, and by the display
 * name only for old records that carry no `userId`: two people can share a first name, so a name
 * must never pull in a record that belongs to a different `userId`.
 *
 * Expenses come back split in two: `expenses` are open, `closedExpenses` already sit inside an expense
 * invoice. A closed expense is part of a financial document, so removing a person leaves those in place
 * (renaming them still refreshes the author name on them).
 */
export async function collectUserRecords(uid: string, name?: string) {
  const fetchOwned = async (collectionName: string, nameField: string): Promise<OwnedRecord[]> => {
    const byId = await getDocs(query(collection(db, collectionName), where('userId', '==', uid)));
    const found = new Map<string, OwnedRecord>();
    byId.forEach((d) => found.set(d.id, { ref: d.ref, data: d.data() }));
    if (name) {
      const byName = await getDocs(query(collection(db, collectionName), where(nameField, '==', name)));
      byName.forEach((d) => {
        if (!d.data().userId) found.set(d.id, { ref: d.ref, data: d.data() });
      });
    }
    return [...found.values()];
  };
  const refs = (rows: OwnedRecord[]) => rows.map((r) => r.ref);
  const expenses = await fetchOwned('expenses', 'createdBy');
  return {
    balances: refs(await fetchOwned('user_balances', 'userName')),
    expenses: refs(expenses.filter((r) => !r.data.isClosed)),
    closedExpenses: refs(expenses.filter((r) => r.data.isClosed)),
  };
}

/** Firestore caps a batch at 500 writes; stay well under it. */
export async function commitInChunks(
  items: DocumentReference<DocumentData>[],
  apply: (batch: ReturnType<typeof writeBatch>, ref: DocumentReference<DocumentData>) => void,
  size = 400,
) {
  for (let i = 0; i < items.length; i += size) {
    const batch = writeBatch(db);
    items.slice(i, i + size).forEach((ref) => apply(batch, ref));
    await batch.commit();
  }
}

export const userDocRef = (id: string) => doc(db, 'users', id);
