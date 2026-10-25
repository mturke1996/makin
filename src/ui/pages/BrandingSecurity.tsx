import { useNavigate } from 'react-router-dom';
import { CloudDone, CloudOff, ManageAccounts, Remove } from '@mui/icons-material';
import { Badge, Button, ListGroup, Section } from '../../design-system/primitives';
import { cn } from '../../design-system/primitives/cn';
import { hasValidFirebase, firebaseConfig } from '../../config/firebase';
import { useAccess } from '../../core/access/useAccess';
import {
  DEFAULT_EMPLOYEE_PERMISSIONS,
  PERMISSION_GROUPS,
  PERMISSION_TEMPLATES,
  permissionDef,
} from '../../core/access/permissions';
import { SettingsPanel, PanelHeading, useBrandT } from './BrandingPanel';
import { templateMatrix, type AccessLevel } from './accessMatrix';

const LEVEL_STYLE: Record<Exclude<AccessLevel, 'none'>, string> = {
  view: 'font-medium text-fg-subtle',
  manage: 'font-semibold text-fg',
  delete: 'font-semibold text-warning-ink',
};

/**
 * Access, explained and read only. There is nothing to switch here: roles and permissions are set per
 * person in the users screen, and the Firestore rules enforce them on the server.
 */
export function BrandingSecurity() {
  const t = useBrandT();
  const navigate = useNavigate();
  const { isAdmin } = useAccess();
  if (!isAdmin) return null;

  const matrix = templateMatrix(PERMISSION_GROUPS, PERMISSION_TEMPLATES);
  const defaults = DEFAULT_EMPLOYEE_PERMISSIONS.map((id) => permissionDef(id).label).join('، ');

  return (
    <Section
      title={t('الصلاحيات والأمان', 'Permissions and security')}
      description={t('كيف يعمل الوصول في التطبيق. للقراءة فقط.', 'How access works in the app. Read only.')}
    >
      <SettingsPanel>
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone="success" dot>
            {t('تُفرض على الخادم', 'Enforced on the server')}
          </Badge>
        </div>

        <ul className="list-disc space-y-1.5 ps-5 text-sm leading-relaxed text-fg-subtle">
          <li>
            {t(
              'لكل مستخدم دور وقائمة صلاحيات، والخادم هو من يفرضها: ما لا يملك صلاحيته لا يصل إلى جهازه أصلاً.',
              'Every user has a role and a list of permissions, and the server enforces them: data they may not read never reaches their device.'
            )}
          </li>
          <li>
            {t(
              'يرى كل شخص ما يُسمح له به فقط، وما لا يملك صلاحيته يختفي من القوائم.',
              'Each person sees only what they are allowed to; what they cannot open does not appear in the menus.'
            )}
          </li>
          <li>
            {t(
              'الموظف يرى مصروفاته فقط، ما لم تمنحه عرض مصروفات الجميع.',
              'An employee sees their own expenses only, unless you grant them access to everyone’s.'
            )}
          </li>
          <li>
            {t(
              'المدير وحده يدير المستخدمين والإعدادات وسجل التدقيق.',
              'Only an admin manages users, settings and the audit log.'
            )}
          </li>
          <li>
            {t(`من لم تُحدَّد له صلاحيات يحصل على: ${defaults}.`, `Someone with no permissions set gets the default employee set: ${defaults}.`)}
          </li>
        </ul>

        <div className="space-y-2 border-t border-border pt-4">
          <PanelHeading>{t('قوالب الصلاحيات', 'Permission templates')}</PanelHeading>
          <p className="text-xs leading-relaxed text-fg-muted">
            {t('نقاط بداية عند إنشاء مستخدم، وتُعدَّل بعدها لكل شخص.', 'Starting points when you create a user. Each person can be adjusted afterwards.')}
          </p>
          <ListGroup>
            <table className="w-full table-fixed border-collapse">
              <caption className="sr-only">{t('ما يمنحه كل قالب في كل مجال', 'What each template grants in each area')}</caption>
              <thead>
                <tr className="bg-surface-sunken">
                  <th scope="col" className="w-[24%] px-2.5 py-2.5 text-start text-2xs font-semibold text-fg-muted">
                    {t('المجال', 'Area')}
                  </th>
                  {PERMISSION_TEMPLATES.map((template) => (
                    <th key={template.id} scope="col" className="px-1 py-2.5 text-center text-2xs font-semibold leading-snug text-fg">
                      {template.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {matrix.map((row) => (
                  <tr key={row.id}>
                    <th scope="row" className="px-2.5 py-2.5 text-start text-xs font-medium leading-snug text-fg">
                      {row.label}
                    </th>
                    {row.cells.map((cell, i) => (
                      <td key={PERMISSION_TEMPLATES[i].id} className="px-1 py-2.5 text-center align-middle text-2xs leading-snug">
                        {cell.level === 'none' ? (
                          <>
                            <Remove sx={{ fontSize: 16 }} aria-hidden className="text-fg-muted" />
                            <span className="sr-only">{t('بدون', 'None')}</span>
                          </>
                        ) : (
                          <span className={cn(LEVEL_STYLE[cell.level])}>{cell.label}</span>
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </ListGroup>
          <p className="text-2xs leading-relaxed text-fg-muted">
            {t(
              'عرض ثم تعديل ثم حذف: كل مستوى يشمل ما قبله. المدير يملك كل شيء.',
              'View, then edit, then delete: each level includes the one before. An admin can do everything.'
            )}
          </p>
          <ul className="space-y-1 text-xs leading-relaxed text-fg-subtle">
            {PERMISSION_TEMPLATES.map((template) => (
              <li key={template.id}>
                <span className="font-semibold text-fg">{template.label}</span>
                {': '}
                {template.description}
              </li>
            ))}
          </ul>
        </div>

        <Button className="w-full sm:w-auto" leftIcon={<ManageAccounts sx={{ fontSize: 20 }} />} onClick={() => navigate('/users')}>
          {t('إدارة المستخدمين والصلاحيات', 'Manage users and permissions')}
        </Button>
      </SettingsPanel>
    </Section>
  );
}

/** Read-only cloud connection status. The safety notes stay visible, never behind a toggle. */
export function BrandingCloud() {
  const t = useBrandT();
  return (
    <Section title={t('الاتصال بالسحابة', 'Cloud connection')} description={t('للقراءة فقط.', 'Read only.')}>
      <SettingsPanel>
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone={hasValidFirebase ? 'success' : 'danger'} dot>
            {hasValidFirebase ? t('متصل', 'Connected') : t('غير متصل', 'Not connected')}
          </Badge>
        </div>
        {hasValidFirebase ? (
          <dl className="grid gap-3 text-sm sm:grid-cols-2">
            <div className="min-w-0">
              <dt className="flex items-center gap-1.5 text-xs font-medium text-fg-muted">
                <CloudDone sx={{ fontSize: 16 }} aria-hidden />
                {t('المشروع', 'Project')}
              </dt>
              <dd className="mt-0.5 truncate text-end font-semibold text-fg" dir="ltr">
                {firebaseConfig.projectId}
              </dd>
            </div>
            <div className="min-w-0">
              <dt className="text-xs font-medium text-fg-muted">{t('النطاق', 'Auth domain')}</dt>
              <dd className="mt-0.5 truncate text-end font-semibold text-fg" dir="ltr">
                {firebaseConfig.authDomain}
              </dd>
            </div>
          </dl>
        ) : (
          <p className="flex items-start gap-2 text-sm text-danger-ink">
            <CloudOff sx={{ fontSize: 20 }} className="mt-px flex-none" aria-hidden />
            {t('لا توجد بيانات اتصال صالحة. أضف متغيرات VITE_FIREBASE_* عند النشر.', 'No valid credentials. Add the VITE_FIREBASE_* variables at deploy time.')}
          </p>
        )}
        <ul className="list-disc space-y-1 ps-5 text-xs leading-relaxed text-fg-muted">
          <li>{t('مفتاح Firebase الظاهر في التطبيق معرّف عام وليس سراً.', 'The Firebase web key is a public identifier, not a secret.')}</li>
          <li>{t('الحماية الفعلية تأتي من قواعد Firestore على الخادم.', 'Real protection comes from the Firestore security rules on the server.')}</li>
          <li>{t('تُضبط بيانات الاتصال بمتغيرات VITE_FIREBASE_* ولا تُعدَّل من هذه الصفحة.', 'Credentials are set with VITE_FIREBASE_* variables and cannot be edited here.')}</li>
        </ul>
      </SettingsPanel>
    </Section>
  );
}
