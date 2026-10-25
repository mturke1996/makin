import { useEffect, useState } from 'react';
import dayjs from 'dayjs';
import { Add, DeleteOutline } from '@mui/icons-material';
import { Button, IconButton, Input, Section, Segmented, Select, Sheet, Textarea, cn } from '../../../design-system/primitives';
import type { Client, Letter, LetterType } from '../../../types';
import { CLOSINGS, GREETINGS, createDefaultLetter, presetLabel } from './letterPresets';
import { LetterPreview } from './LetterPreview';

interface LetterFormSheetProps {
  open: boolean;
  onClose: () => void;
  /** `null` creates a letter. */
  letter: Letter | null;
  clients: Client[];
  /** Whether the clients list is available (`clients.view`). Without it the recipient is typed by hand. */
  canPickClient?: boolean;
  /** Pre-filled signer for new letters. */
  defaultSigner: string;
  /** A client to address a NEW letter to (needs `canPickClient`); ignored when editing. */
  initialClientId?: string;
  /** Resolve when saved; reject to keep the sheet open with the typed content. */
  onSave: (data: Letter, editingId: string | null) => Promise<void>;
}

type Mode = 'edit' | 'preview';
const CUSTOM = 'custom';

/** Pick a preset by index, or write by hand. Presets are matched by exact text. */
function PresetSelect({
  label, presets, value, onPick,
}: {
  label: string;
  presets: string[];
  value: string;
  onPick: (text: string) => void;
}) {
  const index = presets.indexOf(value);
  return (
    <Select
      label={label}
      value={index >= 0 ? String(index) : CUSTOM}
      onChange={(e) => {
        if (e.target.value !== CUSTOM) onPick(presets[Number(e.target.value)]);
      }}
    >
      {presets.map((p, i) => (
        <option key={i} value={i}>
          {presetLabel(p)}
        </option>
      ))}
      <option value={CUSTOM}>كتابة يدوية</option>
    </Select>
  );
}

/** Create / edit a letter with a live preview (side by side on desktop, a tab on phones). */
export function LetterFormSheet({ open, onClose, letter, clients, canPickClient = true, defaultSigner, initialClientId, onSave }: LetterFormSheetProps) {
  const [form, setForm] = useState<Partial<Letter>>(createDefaultLetter());
  const [useExistingClient, setUseExistingClient] = useState(true);
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [mode, setMode] = useState<Mode>('edit');
  const [tried, setTried] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setMode('edit');
    setTried(false);
    if (letter) {
      setForm({ ...letter, bodyParagraphs: letter.bodyParagraphs?.length ? letter.bodyParagraphs : [''] });
      setUseExistingClient(canPickClient && !!letter.clientId);
      setSelectedClientId(letter.clientId || null);
    } else {
      const client = canPickClient && initialClientId ? clients.find((c) => c.id === initialClientId) : undefined;
      setForm({
        ...createDefaultLetter(),
        signerName: defaultSigner,
        ...(client
          ? { clientId: client.id, recipientName: client.name, recipientAddress: client.address || '', recipientPhone: client.phone || '' }
          : {}),
      });
      setUseExistingClient(canPickClient);
      setSelectedClientId(client?.id ?? null);
    }
    // Re-seed only when the sheet opens for a (different) letter.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, letter?.id, canPickClient]);

  const set = <K extends keyof Letter>(key: K, value: Letter[K]) => setForm((p) => ({ ...p, [key]: value }));
  const paragraphs = form.bodyParagraphs || [''];
  const setParagraph = (i: number, value: string) => set('bodyParagraphs', paragraphs.map((p, x) => (x === i ? value : p)));
  const removeParagraph = (i: number) => {
    const next = paragraphs.filter((_, x) => x !== i);
    set('bodyParagraphs', next.length ? next : ['']);
  };

  const pickClient = (clientId: string) => {
    setSelectedClientId(clientId || null);
    const c = clients.find((x) => x.id === clientId);
    if (c) setForm((p) => ({ ...p, clientId: c.id, recipientName: c.name, recipientAddress: c.address || '', recipientPhone: c.phone || '' }));
  };

  const switchMode = (existing: boolean) => {
    setUseExistingClient(existing);
    setSelectedClientId(null);
    setForm((p) => ({ ...p, ...(existing ? {} : { clientId: '' }), recipientName: '', recipientAddress: '', recipientPhone: '' }));
  };

  const recipientError = tried && !form.recipientName?.trim() ? (useExistingClient ? 'اختر العميل المستلم' : 'اكتب اسم المستلم') : undefined;
  const subjectError = tried && !form.subject?.trim() ? 'اكتب موضوع الرسالة' : undefined;

  const submit = async () => {
    setTried(true);
    if (!form.recipientName?.trim() || !form.subject?.trim()) {
      setMode('edit');
      requestAnimationFrame(() => document.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus({ preventScroll: false }));
      return;
    }
    const now = dayjs().toISOString();
    const nonEmpty = (form.bodyParagraphs || ['']).filter((p) => p.trim());
    const data: Letter = {
      id: letter?.id || crypto.randomUUID(),
      type: form.type as LetterType,
      refNumber: form.refNumber || '',
      date: form.date || dayjs().format('YYYY-MM-DD'),
      recipientName: form.recipientName || '',
      recipientTitle: form.recipientTitle || '',
      recipientAddress: form.recipientAddress || '',
      recipientPhone: form.recipientPhone || '',
      // Without the clients list an existing letter keeps the client it already points to.
      clientId: useExistingClient ? selectedClientId || '' : !canPickClient ? letter?.clientId || '' : '',
      subject: form.subject || '',
      greeting: form.greeting || GREETINGS[0],
      bodyParagraphs: nonEmpty.length ? nonEmpty : [''],
      notes: form.notes || '',
      closing: form.closing || CLOSINGS[0],
      signerName: form.signerName || '',
      signerTitle: form.signerTitle || '',
      showStamp: form.showStamp !== false,
      createdAt: letter ? form.createdAt || now : now,
    };
    setSaving(true);
    try {
      await onSave(data, letter?.id ?? null);
      onClose();
    } catch {
      /* the store showed the error; keep the typed content */
    } finally {
      setSaving(false);
    }
  };

  return (
    <Sheet
      open={open}
      onClose={onClose}
      maxWidth="lg"
      title={letter ? 'تعديل الرسالة' : 'رسالة جديدة'}
      subtitle={letter ? letter.subject : 'اكتب الرسالة وراجعها قبل الحفظ'}
      footer={
        <Button block loading={saving} onClick={submit}>
          {letter ? 'حفظ التعديلات' : 'حفظ الرسالة'}
        </Button>
      }
    >
      <div className="sticky top-0 z-10 bg-surface-canvas px-4 pb-2 pt-3 lg:hidden">
        <Segmented<Mode>
          aria-label="تحرير أو معاينة"
          value={mode}
          onChange={setMode}
          options={[
            { value: 'edit', label: 'تحرير' },
            { value: 'preview', label: 'معاينة' },
          ]}
        />
      </div>

      <div className="grid gap-6 p-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,22rem)] lg:gap-8 lg:p-6">
        <form
          noValidate
          onSubmit={(e) => {
            e.preventDefault();
            void submit();
          }}
          className={cn('min-w-0 space-y-8', mode === 'preview' && 'max-lg:hidden')}
        >
          <Section title="النوع والمرجع">
            <div className="space-y-4">
              <Segmented<LetterType>
                aria-label="نوع الرسالة"
                value={(form.type || 'official') as LetterType}
                onChange={(v) => set('type', v)}
                options={[
                  { value: 'official', label: 'خطاب رسمي' },
                  { value: 'offer', label: 'عرض سعر' },
                  { value: 'entitlement', label: 'مستخلص' },
                ]}
              />
              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="رقم المرجع"
                  dir="ltr"
                  className="text-right"
                  value={form.refNumber || ''}
                  onChange={(e) => set('refNumber', e.target.value)}
                />
                <Input label="التاريخ" type="date" value={form.date || ''} onChange={(e) => set('date', e.target.value)} />
              </div>
            </div>
          </Section>

          <Section title="المستلم">
            <div className="space-y-4">
              {canPickClient && (
                <Segmented<'existing' | 'temp'>
                  aria-label="مصدر المستلم"
                  value={useExistingClient ? 'existing' : 'temp'}
                  onChange={(v) => switchMode(v === 'existing')}
                  options={[
                    { value: 'existing', label: 'من العملاء' },
                    { value: 'temp', label: 'جهة أخرى' },
                  ]}
                />
              )}
              {useExistingClient ? (
                <Select
                  label="العميل"
                  value={selectedClientId || ''}
                  error={recipientError}
                  onChange={(e) => pickClient(e.target.value)}
                >
                  <option value="" disabled>
                    اختر العميل
                  </option>
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </Select>
              ) : (
                <Input
                  label="اسم المستلم"
                  required
                  autoComplete="off"
                  value={form.recipientName || ''}
                  error={recipientError}
                  onChange={(e) => set('recipientName', e.target.value)}
                />
              )}
              <Input
                label="صفة المستلم"
                hint="اختياري، مثل: المدير العام"
                autoComplete="off"
                value={form.recipientTitle || ''}
                onChange={(e) => set('recipientTitle', e.target.value)}
              />
              <div className="grid gap-4 sm:grid-cols-2">
                <Input
                  label="العنوان"
                  autoComplete="off"
                  value={form.recipientAddress || ''}
                  onChange={(e) => set('recipientAddress', e.target.value)}
                />
                <Input
                  label="الهاتف"
                  type="tel"
                  inputMode="tel"
                  dir="ltr"
                  className="text-right"
                  autoComplete="off"
                  value={form.recipientPhone || ''}
                  onChange={(e) => set('recipientPhone', e.target.value)}
                />
              </div>
            </div>
          </Section>

          <Section title="الموضوع والمحتوى">
            <div className="space-y-4">
              <Input
                label="الموضوع"
                required
                autoComplete="off"
                value={form.subject || ''}
                error={subjectError}
                onChange={(e) => set('subject', e.target.value)}
              />
              <PresetSelect label="بداية الرسالة" presets={GREETINGS} value={form.greeting || ''} onPick={(t) => set('greeting', t)} />
              <Textarea
                aria-label="نص البداية"
                rows={3}
                value={form.greeting || ''}
                onChange={(e) => set('greeting', e.target.value)}
              />

              <div className="space-y-3">
                <span className="block text-sm font-medium text-fg-subtle">فقرات الرسالة</span>
                {paragraphs.map((para, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <div className="min-w-0 flex-1">
                      <Textarea
                        aria-label={`الفقرة ${i + 1}`}
                        placeholder={`الفقرة ${i + 1}`}
                        rows={3}
                        value={para}
                        onChange={(e) => setParagraph(i, e.target.value)}
                      />
                    </div>
                    {paragraphs.length > 1 && (
                      <IconButton
                        label={`حذف الفقرة ${i + 1}`}
                        className="mt-0.5 text-danger-ink hover:text-danger-ink"
                        onClick={() => removeParagraph(i)}
                      >
                        <DeleteOutline sx={{ fontSize: 22 }} />
                      </IconButton>
                    )}
                  </div>
                ))}
                <Button
                  variant="outline"
                  block
                  leftIcon={<Add sx={{ fontSize: 20 }} />}
                  onClick={() => set('bodyParagraphs', [...paragraphs, ''])}
                >
                  إضافة فقرة
                </Button>
              </div>

              <Textarea
                label="ملاحظات"
                hint="اختياري"
                rows={2}
                value={form.notes || ''}
                onChange={(e) => set('notes', e.target.value)}
              />
              <PresetSelect label="خاتمة الرسالة" presets={CLOSINGS} value={form.closing || ''} onPick={(t) => set('closing', t)} />
              <Textarea
                aria-label="نص الخاتمة"
                rows={3}
                value={form.closing || ''}
                onChange={(e) => set('closing', e.target.value)}
              />
            </div>
          </Section>

          <Section title="التوقيع والختم">
            <div className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <Input
                  label="اسم الموقع"
                  autoComplete="off"
                  value={form.signerName || ''}
                  onChange={(e) => set('signerName', e.target.value)}
                />
                <Input
                  label="صفة الموقع"
                  autoComplete="off"
                  value={form.signerTitle || ''}
                  onChange={(e) => set('signerTitle', e.target.value)}
                />
              </div>
              <Segmented<'yes' | 'no'>
                aria-label="إظهار الختم"
                value={form.showStamp === false ? 'no' : 'yes'}
                onChange={(v) => set('showStamp', v === 'yes')}
                options={[
                  { value: 'yes', label: 'مع الختم' },
                  { value: 'no', label: 'بدون ختم' },
                ]}
              />
            </div>
          </Section>
        </form>

        <div className={cn('lg:sticky lg:top-4 lg:self-start', mode === 'edit' && 'max-lg:hidden')}>
          <p className="mb-2 hidden px-1 text-sm font-semibold text-fg-subtle lg:block">معاينة مباشرة</p>
          <LetterPreview form={form} />
        </div>
      </div>
    </Sheet>
  );
}
