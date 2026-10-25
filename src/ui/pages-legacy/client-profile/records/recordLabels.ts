import { getExpenseCategoryLabel } from '../../../../core/utils-formatters';
import { countPhrase, type CountKind } from '../moduleCopy';

/** The Arabic name of an expense category (the shared table also names the legacy ones). */
export const expenseCategoryLabel = getExpenseCategoryLabel;

/** «12 مصروفاً», or «لا نتائج» when a filter leaves nothing (never «لا مصروفات بعد», which would say the list is empty). */
export function countCaption(kind: CountKind, count: number, filtering: boolean): string {
  return filtering && count === 0 ? 'لا نتائج' : countPhrase(kind, count);
}
