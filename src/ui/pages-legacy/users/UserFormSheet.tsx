import { useState } from 'react';
import { DeleteOutline, MailOutline, Visibility, VisibilityOff } from '@mui/icons-material';
import { Badge, Button, IconButton, Input, Segmented, Sheet } from '../../../design-system/primitives';
import type { Permission, Role } from '../../../core/access';
import { AdminAccessNote } from './AccessSummary';
import { PermissionsEditor } from './PermissionsEditor';

export interface UserFormData {
  name: string;
  email: string;
  password: string;
  newPassword: string;
  role: Role;
  /** Only meaningful for an employee; kept while the role is toggled so nothing is lost. */
  permissions: Permission[];
}

export interface UserFormErrors {
  name?: string;
  email?: string;
  password?: string;
  newPassword?: string;
}

const ROLE_LABEL: Record<Role, string> = { admin: 'مدير', employee: 'موظف' };

const ROLE_HELP: Record<Role, string> = {
  admin: 'وصول كامل وإدارة المستخدمين والإعدادات.',
  employee: 'يفعل فقط ما تمنحه له من صلاحيات أدناه.',
};

interface UserFormSheetProps {
  open: boolean;
  onClose: () => void;
  editing: boolean;
  formData: UserFormData;
  onChange: (data: UserFormData) => void;
  /** Shown only after the first save attempt. */
  errors: UserFormErrors;
  submitting: boolean;
  onSubmit: () => void;
  /** Firebase only allows changing the password of the signed-in account. */
  canSetPassword: boolean;
  onSendResetEmail: () => void;
  /** Absent for the signed-in user (an admin cannot delete their own account here). */
  onDelete?: () => void;
  /** The person being edited is the signed-in one: their access is shown, not editable. */
  editingSelf?: boolean;
  /** Why the role cannot be changed here (yourself, or the last admin). The role is then only shown. */
  roleLock?: string;
  /** Old profile with no `role` at all: treated as an admin until the role is saved explicitly. */
  legacyRole?: boolean;
  /** Employee whose profile has no permission list: they run on the default set. */
  usesDefaultPermissions?: boolean;
}

function PasswordField({
  label, value, onChange, error, hint, placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  error?: string;
  hint?: string;
  placeholder?: string;
}) {
  const [visible, setVisible] = useState(false);
  return (
    <Input
      label={label}
      type={visible ? 'text' : 'password'}
      dir="ltr"
      className="text-right"
      autoComplete="new-password"
      placeholder={placeholder}
      value={value}
      error={error}
      hint={hint}
      onChange={(e) => onChange(e.target.value)}
      rightIcon={
        <IconButton
          label={visible ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور'}
          size="md"
          className="-me-2"
          onClick={() => setVisible((v) => !v)}
        >
          {visible ? <VisibilityOff sx={{ fontSize: 20 }} /> : <Visibility sx={{ fontSize: 20 }} />}
        </IconButton>
      }
    />
  );
}

/** Add or edit a user. Presentational: all Firebase work happens in the page. */
export function UserFormSheet({
  open, onClose, editing, formData, onChange, errors, submitting, onSubmit, canSetPassword, onSendResetEmail, onDelete,
  editingSelf, roleLock, legacyRole, usesDefaultPermissions,
}: UserFormSheetProps) {
  const set = <K extends keyof UserFormData>(key: K, value: UserFormData[K]) => onChange({ ...formData, [key]: value });
  return (
    <Sheet
      open={open}
      onClose={() => !submitting && onClose()}
      mobile="bottom"
      maxWidth="md"
      title={editing ? 'تعديل المستخدم' : 'مستخدم جديد'}
      subtitle={editing ? formData.email : 'حساب جديد لتسجيل الدخول'}
      footer={
        <Button block loading={submitting} onClick={onSubmit}>
          {editing ? 'حفظ التعديلات' : 'إضافة المستخدم'}
        </Button>
      }
    >
      <form
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit();
        }}
        className="space-y-5 p-4 lg:p-6"
      >
        <Input
          label="الاسم الكامل"
          required
          autoComplete="off"
          placeholder="محمد أحمد"
          value={formData.name}
          error={errors.name}
          onChange={(e) => set('name', e.target.value)}
        />
        <Input
          label="البريد الإلكتروني"
          required={!editing}
          type="email"
          inputMode="email"
          dir="ltr"
          className="text-right"
          autoComplete="off"
          placeholder="name@example.com"
          disabled={editing}
          hint={editing ? 'لا يمكن تغيير البريد' : undefined}
          value={formData.email}
          error={errors.email}
          onChange={(e) => set('email', e.target.value)}
        />

        {!editing ? (
          <PasswordField
            label="كلمة المرور الأولية"
            hint="6 أحرف على الأقل"
            value={formData.password}
            error={errors.password}
            onChange={(v) => set('password', v)}
          />
        ) : (
          <div className="space-y-3 border-t border-border pt-5">
            <p className="text-sm font-semibold text-fg">كلمة المرور</p>
            {canSetPassword ? (
              <PasswordField
                label="كلمة مرور جديدة"
                hint="اتركها فارغة بدون تغيير. 6 أحرف على الأقل"
                value={formData.newPassword}
                error={errors.newPassword}
                onChange={(v) => set('newPassword', v)}
              />
            ) : (
              <p className="text-sm leading-relaxed text-fg-subtle">
                لا يمكن تغيير كلمة مرور حساب آخر مباشرة. أرسل له رابط استعادة على بريده.
              </p>
            )}
            <Button variant="outline" block leftIcon={<MailOutline sx={{ fontSize: 20 }} />} onClick={onSendResetEmail}>
              إرسال رابط الاستعادة للبريد
            </Button>
          </div>
        )}

        <div className="space-y-4 border-t border-border pt-5">
          <p className="text-sm font-semibold text-fg">الدور والصلاحيات</p>

          <div className="space-y-1.5">
            <span className="text-sm font-medium text-fg-subtle">الدور</span>
            {roleLock ? (
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone={formData.role === 'admin' ? 'brand' : 'neutral'} dot>
                  {ROLE_LABEL[formData.role]}
                </Badge>
                <span className="text-xs text-fg-muted">{roleLock}</span>
              </div>
            ) : (
              <>
                <Segmented<Role>
                  aria-label="الدور"
                  value={formData.role}
                  onChange={(role) => set('role', role)}
                  options={[
                    { value: 'employee', label: ROLE_LABEL.employee },
                    { value: 'admin', label: ROLE_LABEL.admin },
                  ]}
                />
                <p className="text-xs text-fg-muted">{ROLE_HELP[formData.role]}</p>
              </>
            )}
          </div>

          {legacyRole && (
            <p className="rounded-md bg-warning-soft px-3 py-2 text-xs leading-relaxed text-warning-ink">
              حساب قديم بلا دور محدد، ويُعامل كمدير.{' '}
              {roleLock ? 'احفظ ليُسجَّل دوره مديراً صراحةً.' : 'اختر الدور ثم احفظ ليُسجَّل صراحةً.'}
            </p>
          )}

          {formData.role === 'admin' ? (
            <AdminAccessNote own={editingSelf} />
          ) : (
            <>
              {usesDefaultPermissions && (
                <p className="text-xs leading-relaxed text-fg-muted">
                  هذا الحساب يعمل بالصلاحيات الافتراضية. عند الحفظ تُسجَّل كقائمة صريحة يمكنك تعديلها.
                </p>
              )}
              <PermissionsEditor
                value={formData.permissions}
                onChange={(permissions) => set('permissions', permissions)}
                readOnly={editingSelf}
              />
            </>
          )}
        </div>

        {editing && onDelete && (
          <div className="border-t border-border pt-5">
            <Button variant="danger-soft" block leftIcon={<DeleteOutline sx={{ fontSize: 20 }} />} onClick={onDelete}>
              حذف المستخدم
            </Button>
          </div>
        )}
      </form>
    </Sheet>
  );
}
