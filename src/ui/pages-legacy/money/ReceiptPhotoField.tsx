import { useEffect, useMemo, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { AttachFile, Close, PhotoCamera } from '../../../design-system/icons';
import { Button } from '../../../design-system/primitives';
import { checkReceiptFile, compressReceiptImage } from '../../../core/receiptPhoto';
import type { ReceiptChoice } from './receiptAttachment';

interface Props {
  /** The attachment already saved on the expense being edited. */
  existing?: { url?: string; name?: string } | null;
  value: ReceiptChoice;
  onChange: (next: ReceiptChoice) => void;
  disabled?: boolean;
}

/**
 * The receipt of an expense, taken with the phone's camera (or picked from the gallery), scaled down on the
 * spot and uploaded when the expense is saved. Nothing is uploaded here.
 */
export function ReceiptPhotoField({ existing, value, onChange, disabled }: Props) {
  const cameraRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  const preview = useMemo(() => (value.photo ? URL.createObjectURL(value.photo) : null), [value.photo]);
  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);

  const pick = async (file: File | undefined) => {
    if (!file) return;
    const check = checkReceiptFile(file);
    if (check.ok === false) {
      toast.error(check.reason);
      return;
    }
    setBusy(true);
    try {
      onChange({ photo: await compressReceiptImage(file), remove: false });
    } catch (error) {
      console.error('receipt compress', error);
      toast.error('تعذّر قراءة الصورة، جرّب صورة أخرى.');
    } finally {
      setBusy(false);
    }
  };

  const hasSaved = !!existing?.url && !value.remove;
  const inputs = (
    <>
      <input ref={cameraRef} type="file" accept="image/*" capture="environment" hidden data-testid="receipt-camera" onChange={(e) => { void pick(e.target.files?.[0]); e.target.value = ''; }} />
      <input ref={galleryRef} type="file" accept="image/*" hidden data-testid="receipt-gallery" onChange={(e) => { void pick(e.target.files?.[0]); e.target.value = ''; }} />
    </>
  );

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium text-fg">صورة الفاتورة</p>
      {inputs}
      {value.photo && preview ? (
        <div className="flex items-center gap-3 rounded-lg border border-border bg-surface-panel p-2.5">
          <img src={preview} alt="الفاتورة الملتقطة" className="size-16 flex-none rounded-md object-cover" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-fg">جاهزة للرفع</p>
            <p className="text-xs tabular-nums text-fg-muted">{Math.max(1, Math.round(value.photo.size / 1024))} ك.ب · تُرفع عند الحفظ</p>
          </div>
          <Button type="button" size="sm" variant="ghost" className="h-11" disabled={disabled || busy} onClick={() => cameraRef.current?.click()}>إعادة التصوير</Button>
          <button
            type="button"
            aria-label="إزالة الصورة"
            disabled={disabled}
            onClick={() => onChange({ photo: null, remove: false })}
            className="grid size-11 flex-none place-items-center rounded-md text-fg-subtle hover:bg-surface-hover hover:text-fg focus:outline-none focus-visible:shadow-focus"
          >
            <Close sx={{ fontSize: 20 }} />
          </button>
        </div>
      ) : (
        <>
          {hasSaved && (
            <div className="flex items-center justify-between gap-3 rounded-lg border border-border bg-surface-panel px-3 py-2.5">
              <a href={existing!.url} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center gap-1.5 text-sm font-semibold text-accent-ink">
                <AttachFile aria-hidden sx={{ fontSize: 18 }} />
                عرض {existing!.name || 'المرفق المحفوظ'}
              </a>
              <button type="button" disabled={disabled} onClick={() => onChange({ photo: null, remove: true })} className="min-h-11 rounded-md px-2 text-sm font-medium text-danger-ink hover:underline focus:outline-none focus-visible:shadow-focus">
                إزالة المرفق
              </button>
            </div>
          )}
          {value.remove && existing?.url && (
            <p className="text-xs text-fg-muted">
              سيُحذف المرفق عند الحفظ.{' '}
              <button type="button" className="font-semibold text-accent-ink hover:underline" onClick={() => onChange({ photo: null, remove: false })}>تراجع</button>
            </p>
          )}
          <div className="grid grid-cols-2 gap-2">
            <Button type="button" variant="outline" className="h-11" loading={busy} disabled={disabled} leftIcon={<PhotoCamera sx={{ fontSize: 20 }} />} onClick={() => cameraRef.current?.click()}>
              {hasSaved ? 'استبدال بتصوير' : 'تصوير الفاتورة'}
            </Button>
            <Button type="button" variant="outline" className="h-11" disabled={disabled || busy} onClick={() => galleryRef.current?.click()}>
              من المعرض
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
