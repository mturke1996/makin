import type { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { LockOutlined } from '@mui/icons-material';
import { useAccess } from '../../core/access/useAccess';
import type { AppModule } from '../../core/access/modules';
import type { Permission } from '../../core/access/permissions';
import { Button, EmptyState, PageShell } from '../../design-system/primitives';

interface Props {
  /** Open when the person may open this area of the app. */
  module?: AppModule;
  /** Open when the person holds ANY of these. */
  anyOf?: readonly Permission[];
  /** Open for admins only. */
  admin?: boolean;
  children: ReactNode;
  /** Shown instead of the "no access" page, for parts of a screen that simply disappear. */
  fallback?: ReactNode;
}

/**
 * Route / section guard. The decision is the same pure rule the Firestore rules apply on the server,
 * so a page that opens is a page whose data actually loads.
 */
export function RequireAccess({ module, anyOf, admin, children, fallback }: Props) {
  const access = useAccess();
  const navigate = useNavigate();

  const allowed = admin
    ? access.isAdmin
    : module
      ? access.canAccessModule(module)
      : anyOf
        ? access.canAny(anyOf)
        : true;

  if (allowed) return <>{children}</>;
  if (fallback !== undefined) return <>{fallback}</>;

  return (
    <PageShell>
      <EmptyState
        Icon={LockOutlined}
        title="لا تملك صلاحية لفتح هذه الصفحة"
        description="يحدد مدير النظام ما يمكن لكل مستخدم فعله. اطلب منه إضافة هذه الصلاحية إن كنت تحتاجها."
        action={<Button onClick={() => navigate('/')}>العودة إلى الرئيسية</Button>}
      />
    </PageShell>
  );
}
