/**
 * Maps common Firebase / Firestore / Auth errors to short Arabic messages
 * (primary UI language in this app). Falls back to Error.message.
 */
const CODE_AR: Record<string, string> = {
  'permission-denied': 'لا تملك صلاحية لتنفيذ هذه العملية',
  'unavailable': 'الخدمة غير متاحة مؤقتاً. تحقق من الاتصال',
  'failed-precondition': 'شرط مسبق غير متحقق. جرّب مرة أخرى',
  'aborted': 'تم إلغاء العملية',
  'already-exists': 'هذا السجل موجود مسبقاً',
  'not-found': 'العنصر غير موجود',
  'resource-exhausted': 'تجاوزت الحد المسموح. حاول لاحقاً',
  'unauthenticated': 'انتهت الجلسة. سجّل الدخول مرة أخرى',
  'invalid-argument': 'بيانات غير صالحة',
  'deadline-exceeded': 'انتهت مهلة الطلب. تحقق من الاتصال',
  'cancelled': 'تم إلغاء الطلب',
  'data-loss': 'فقدان بيانات غير متوقع',
  'out-of-range': 'قيمة خارج النطاق',
  'internal': 'خطأ داخلي في الخادم',
};

export function formatFirebaseError(error: unknown, fallback = 'حدث خطأ أثناء تنفيذ العملية'): string {
  if (error == null) return fallback;
  if (typeof error === 'string') return error;
  if (error instanceof Error) {
    const code = (error as Error & { code?: string }).code;
    if (code && typeof code === 'string') {
      const k = code.replace('firestore/', '').replace('auth/', '');
      if (CODE_AR[k]) return CODE_AR[k];
    }
    if (error.message && error.message.length < 200) {
      if (/network|fetch|Load failed|Failed to fetch/i.test(error.message)) {
        return 'تعذّر الاتصال. تحقق من الإنترنت';
      }
      return error.message;
    }
  }
  if (typeof error === 'object' && 'code' in (error as object)) {
    const c = String((error as { code?: string }).code || '')
      .replace('firestore/', '')
      .replace('auth/', '');
    if (CODE_AR[c]) return CODE_AR[c];
  }
  return fallback;
}
