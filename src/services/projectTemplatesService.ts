import { doc, runTransaction, type Firestore } from "firebase/firestore";
import type { ProjectPhase } from "../types";

/** Retry-safe atomic creation: existing stage records are never overwritten. */
export async function applyProjectTemplate(
  db: Firestore,
  clientId: string,
  phases: readonly ProjectPhase[],
): Promise<number> {
  if (
    !clientId ||
    phases.length > 40 ||
    phases.some((p) => p.clientId !== clientId) ||
    new Set(phases.map((p) => p.id)).size !== phases.length
  ) {
    throw new Error(
      "تعذّر تطبيق قالب المراحل. راجع المشروع والمراحل المختارة.",
    );
  }
  if (!phases.length) return 0;
  return runTransaction(db, async (transaction) => {
    const client = await transaction.get(doc(db, "clients", clientId));
    if (!client.exists())
      throw new Error("المشروع لم يعد موجودًا. حدّث الصفحة.");
    const refs = phases.map((p) => doc(db, "project_phases", p.id));
    const snapshots = await Promise.all(
      refs.map((ref) => transaction.get(ref)),
    );
    let count = 0;
    snapshots.forEach((snapshot, index) => {
      if (snapshot.exists()) return;
      transaction.set(refs[index], phases[index]);
      count++;
    });
    return count;
  });
}
