import type { Letter, LetterType } from '../../../../types';

/** This client's letters, newest first (by letter date, then by when it was written). */
export function selectClientLetters(letters: readonly Letter[], clientId: string | undefined): Letter[] {
  if (!clientId) return [];
  return letters
    .filter((l) => l.clientId === clientId)
    .sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt));
}

/** How many letters of each type, in the order the letters page lists them. */
export function countLettersByType(letters: readonly Letter[]): { type: LetterType; count: number }[] {
  const order: LetterType[] = ['official', 'offer', 'entitlement'];
  return order.map((type) => ({ type, count: letters.filter((l) => l.type === type).length }));
}
