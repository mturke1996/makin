import toast from 'react-hot-toast';

export const NOT_ALLOWED_MESSAGE = 'ليست لديك صلاحية لهذا الإجراء. إن كنت تظن أن هذا خطأ فأعد فتح الصفحة أو راجع المدير.';

/**
 * A screen that finds out, at the moment of saving, that this person may no longer do it (their rights changed while the
 * form was open). Says so, instead of leaving a button that does nothing, and stops the save.
 */
export function deny(): never {
  toast.error(NOT_ALLOWED_MESSAGE);
  throw new Error('not-allowed');
}
