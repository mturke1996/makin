import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useEffect } from 'react';
import { CloudUpload, Download, InfoOutlined } from '../../design-system/icons';
import { Button, ListGroup, PageHeader, PageShell } from '../../design-system/primitives';
import { useAccess } from '../../core/access/useAccess';
import { BACKUP_DUE_DAYS, BACKUP_SETS, backupAgeDays, buildBackup, totalRecords } from '../../core/backup';
import { readLastBackup, rememberBackup } from '../../core/backupMemory';
import { formatDate } from '../../core/utils-formatters';
import { useAuthStore } from '../../stores/useAuthStore';
import { useDataSlice } from '../../stores/useDataStore';

const KEYS = BACKUP_SETS.map((s) => s.key);

/** The company's own copy of its data, for the manager: one JSON file with everything, or the same in Excel. */
export const BackupPage = () => {
  const navigate = useNavigate();
  const { isAdmin } = useAccess();
  const user = useAuthStore((s) => s.user);
  const data = useDataSlice(...KEYS, 'isLoading');
  const [last, setLast] = useState<string | null>(() => readLastBackup());
  const [busy, setBusy] = useState<'json' | 'xlsx' | null>(null);

  useEffect(() => {
    if (!isAdmin) navigate('/', { replace: true });
  }, [isAdmin, navigate]);

  const file = useMemo(
    () => buildBackup(Object.fromEntries(KEYS.map((k) => [k, data[k]])), { at: new Date(), by: user?.displayName || user?.email || 'المدير' }),
    // The file is rebuilt when a record arrives; its time is set again at the moment of download.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [...KEYS.map((k) => data[k]), user],
  );
  const total = totalRecords(file.counts);
  const age = backupAgeDays(last, new Date());

  const take = async (kind: 'json' | 'xlsx') => {
    if (busy) return;
    setBusy(kind);
    try {
      const at = new Date();
      const fresh = { ...file, createdAt: at.toISOString() };
      const mod = await import('../../features/export/backupExport');
      if (kind === 'json') mod.downloadBackupJson(fresh, at);
      else mod.downloadBackupExcel(fresh, at);
      rememberBackup(at);
      setLast(at.toISOString());
      toast.success(kind === 'json' ? 'تم تحميل النسخة الاحتياطية' : 'تم تحميل نسخة Excel');
    } catch (error) {
      console.error('backup', error);
      toast.error('تعذّر إنشاء النسخة، حاول مجدداً');
    } finally {
      setBusy(null);
    }
  };

  const due = age === null || age >= BACKUP_DUE_DAYS;

  return (
    <PageShell>
      <PageHeader title="النسخ الاحتياطي" subtitle="نسخة كاملة من بيانات الشركة تحتفظ بها بنفسك" />

      <section className="space-y-3 rounded-lg border border-border bg-surface-panel p-4">
        <div className="flex items-start gap-3">
          <span aria-hidden className="grid size-11 flex-none place-items-center rounded-full bg-accent-soft text-accent-ink">
            <CloudUpload sx={{ fontSize: 22 }} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-base font-semibold text-fg">
              {last ? `آخر نسخة من هذا الجهاز: ${formatDate(last)}` : 'لم تُحمَّل نسخة من هذا الجهاز بعد'}
            </p>
            <p className={due ? 'mt-0.5 text-sm font-medium text-warning-ink' : 'mt-0.5 text-sm text-fg-muted'}>
              {age === null ? 'احتفظ بنسخة الآن، وكرّر ذلك كل أسبوع.' : age === 0 ? 'أُخذت اليوم.' : due ? `مضى ${age} يوماً، حان وقت نسخة جديدة.` : `منذ ${age} ${age === 1 ? 'يوم' : age <= 10 ? 'أيام' : 'يوماً'}.`}
            </p>
          </div>
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          <Button size="lg" block loading={busy === 'json'} disabled={data.isLoading || total === 0} leftIcon={<Download sx={{ fontSize: 20 }} />} onClick={() => void take('json')}>
            تحميل نسخة كاملة (JSON)
          </Button>
          <Button size="lg" block variant="outline" loading={busy === 'xlsx'} disabled={data.isLoading || total === 0} leftIcon={<Download sx={{ fontSize: 20 }} />} onClick={() => void take('xlsx')}>
            تحميل Excel
          </Button>
        </div>
      </section>

      <section aria-label="ما تتضمنه النسخة" className="space-y-2">
        <h2 className="px-1 text-sm font-semibold text-fg-subtle">ما تتضمنه النسخة <span className="font-normal text-fg-muted">({total.toLocaleString('en-US')} سجل)</span></h2>
        <ListGroup>
          {BACKUP_SETS.map(({ key, label }) => (
            <div key={key} className="flex min-h-12 items-center justify-between gap-3 px-4 py-2.5">
              <span className="text-sm text-fg">{label}</span>
              <span className="text-sm font-semibold tabular-nums text-fg-subtle">{file.counts[key].toLocaleString('en-US')}</span>
            </div>
          ))}
        </ListGroup>
      </section>

      <section className="flex items-start gap-2.5 rounded-lg bg-surface-sunken p-4 text-sm leading-relaxed text-fg-subtle">
        <InfoOutlined sx={{ fontSize: 20 }} aria-hidden className="mt-0.5 flex-none" />
        <ul className="space-y-1.5">
          <li>بياناتك محفوظة على خوادم Firebase، وهذه نسخة إضافية بيدك تحميك من الحذف الخاطئ أو فقدان الحساب.</li>
          <li>الملف يحوي أرقام الشركة المالية كاملة: احفظه في مكان آمن ولا ترسله لأحد.</li>
          <li>لا تشمل النسخة حسابات المستخدمين ولا صلاحياتهم ولا الصور المرفقة بمصروفات قديمة.</li>
          <li>نسخة JSON هي الأدق لاستعادة البيانات لاحقاً، ونسخة Excel للقراءة والمراجعة.</li>
        </ul>
      </section>
    </PageShell>
  );
};
