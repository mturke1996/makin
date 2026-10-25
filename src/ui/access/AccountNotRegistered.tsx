import { PersonOffOutlined } from '../../design-system/icons';
import { useAuthStore } from '../../stores/useAuthStore';
import { Button, EmptyState } from '../../design-system/primitives';

/** Signed in with Firebase, but no profile in `users`: nothing can load, so say why instead of showing empty screens. */
export function AccountNotRegistered() {
  const { user, logout, isSubmitting } = useAuthStore();
  return (
    <div className="pwa-safe-top pwa-safe-bottom grid min-h-[100dvh] place-items-center bg-surface-canvas px-4">
      <div className="w-full max-w-md">
        <EmptyState
          Icon={PersonOffOutlined}
          title="حسابك غير مفعّل بعد"
          description={`سجّلت الدخول بـ ${user?.email || 'هذا الحساب'} لكنه غير مضاف إلى المستخدمين في النظام. اطلب من مدير النظام إضافته، ثم أعد تسجيل الدخول.`}
          action={
            <Button variant="outline" onClick={() => void logout()} loading={isSubmitting}>
              تسجيل الخروج
            </Button>
          }
        />
      </div>
    </div>
  );
}
