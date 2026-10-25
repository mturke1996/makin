import { where, type QueryConstraint } from 'firebase/firestore';
import type { QuerySpec } from './dataPlan';

/**
 * The plan's plain query descriptions as Firestore constraints. One function, used by the app's
 * subscriptions AND by the rules tests, so what the tests prove is exactly what the app sends.
 * (Kept out of the pure barrel: it imports the Firestore SDK, though it needs no app instance.)
 */
export const toConstraints = (spec: QuerySpec): QueryConstraint[] => spec.map((w) => where(w.field, w.op, w.value));
