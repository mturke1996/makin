import { ChangeEvent, useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { CheckCircle, CloudUpload, Download, History, Restore, Upload } from '../../design-system/icons';
import { useBrandStore } from '../../stores/useBrandStore';
import { useBrand } from '../../config/BrandProvider';
import DEFAULT_BRAND from '../../config/brand.config';
import type { BrandConfig } from '../../config/brand.types';
import { Button, Field, Input, ListGroup, ListRow, Modal, PageHeader, PageShell, Section, Segmented } from '../../design-system/primitives';
import { LogoMark } from '../brand/LogoMark';
import { HomeIconTile } from './HomeIconTile';
import { useAccess } from '../../core/access/useAccess';
import { BrandingColors } from './BrandingColors';
import { BrandingCloud, BrandingSecurity } from './BrandingSecurity';
import { LTR_FIELD, PanelHeading, SettingsPanel, useBrandT } from './BrandingPanel';

/** An imported file replaces the whole brand, so it must at least have every group the app reads. */
function isBrandConfig(x: unknown): x is BrandConfig {
  const o = x as Partial<BrandConfig> | null;
  return !!o && typeof o === 'object' && typeof o.name === 'string' && !!o.palette && !!o.logo && !!o.contact && !!o.typography;
}

/**
 * Branding: a live, auto-saving white-label editor. Every change is applied to the app
 * immediately and stored on this device (`useBrandStore`), so there is no Save button.
 * Groups: identity and logo, colors, fonts, contact, access (read only), cloud status, backup, reset.
 */
export function BrandingSettingsPage() {
  const brand = useBrand();
  const t = useBrandT();
  const navigate = useNavigate();
  const { isAdmin } = useAccess();
  const { updateBrand, resetBrand, setBrand } = useBrandStore();

  const [saved, setSaved] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const [pendingImport, setPendingImport] = useState<BrandConfig | null>(null);
  const importRef = useRef<HTMLInputElement>(null);
  const logoRef = useRef<HTMLInputElement>(null);
  const savedTimer = useRef<number>();

  useEffect(() => {
    if (!isAdmin) navigate('/', { replace: true });
  }, [isAdmin, navigate]);
  useEffect(() => () => window.clearTimeout(savedTimer.current), []);

  /** Brief «تم الحفظ» confirmation (announced to screen readers). */
  const flash = useCallback(() => {
    setSaved(true);
    window.clearTimeout(savedTimer.current);
    savedTimer.current = window.setTimeout(() => setSaved(false), 1600);
  }, []);

  const handleLogoUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    e.target.value = '';
    if (!f) return;
    if (f.size > 1024 * 512) {
      toast.error(t('حجم الملف كبير. الحد الأقصى 500KB.', 'File too large. Max 500KB.'));
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      updateBrand({ logo: { src: reader.result as string } });
      flash();
    };
    reader.readAsDataURL(f);
  };

  const exportBrand = () => {
    const blob = new Blob([JSON.stringify(brand, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${brand.name || 'brand'}-config.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const importBrand = (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    e.target.value = '';
    if (!f) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const obj = JSON.parse(reader.result as string);
        if (!isBrandConfig(obj)) throw new Error('shape');
        setPendingImport(obj);
      } catch {
        toast.error(t('الملف غير صالح.', 'Invalid file.'));
      }
    };
    reader.readAsText(f);
  };

  const logoIsUpload = brand.logo.src.startsWith('data:');
  const defaultFonts = DEFAULT_BRAND.typography;
  const fontsAreDefault =
    brand.typography.sansStack === defaultFonts.sansStack &&
    brand.typography.arabicStack === defaultFonts.arabicStack &&
    brand.typography.numericStack === defaultFonts.numericStack;

  return (
    <PageShell width="4xl">
      <PageHeader
        title={t('العلامة التجارية', 'Branding')}
        subtitle={
          <>
            {t('كل تغيير يُطبَّق فوراً ويُحفظ تلقائياً على هذا الجهاز.', 'Every change applies instantly and is saved automatically on this device.')}
            {saved && (
              <span aria-hidden className="ms-2 inline-flex items-center gap-1 whitespace-nowrap font-medium text-success-ink">
                <CheckCircle sx={{ fontSize: 16 }} />
                {t('تم الحفظ', 'Saved')}
              </span>
            )}
          </>
        }
      />
      <p role="status" aria-live="polite" className="sr-only">
        {saved ? t('تم الحفظ', 'Saved') : ''}
      </p>

      {/* Identity + logo */}
      <Section title={t('الهوية والشعار', 'Identity and logo')} description={t('الاسم الذي يظهر في التطبيق والمستندات.', 'The name shown in the app and documents.')}>
        <SettingsPanel>
          <div className="flex items-center gap-3">
            <LogoMark size={56} />
            <div className="min-w-0">
              <p className="truncate text-base font-bold text-fg">{brand.name}</p>
              <p className="truncate text-sm text-fg-subtle">{brand.fullName}</p>
            </div>
          </div>

          <div className="grid gap-4 border-t border-border pt-4 sm:grid-cols-2">
            <Input
              label={t('الاسم المختصر', 'Short name')}
              value={brand.name}
              placeholder={t('ماكين', 'MAKIN')}
              onChange={(e) => {
                updateBrand({ name: e.target.value });
                flash();
              }}
            />
            <Input
              label={t('الاسم الكامل', 'Full name')}
              value={brand.fullName}
              placeholder={t('شركتك الكاملة', 'Acme SaaS, Inc.')}
              onChange={(e) => {
                updateBrand({ fullName: e.target.value });
                flash();
              }}
            />
            <div className="sm:col-span-2">
              <Input
                label={t('الوصف المختصر', 'Tagline')}
                value={brand.tagline}
                placeholder={t('إدارة متكاملة • فواتير • عملاء', 'Operations, simplified.')}
                onChange={(e) => {
                  updateBrand({ tagline: e.target.value });
                  flash();
                }}
              />
            </div>
            <Input
              label={t('اللغة والمنطقة', 'Locale')}
              hint={t('مثل ar-LY أو en-US أو fr-FR', 'e.g. ar-LY, en-US, fr-FR')}
              dir="ltr"
              spellCheck={false}
              autoCapitalize="none"
              className={LTR_FIELD}
              value={brand.locale}
              placeholder="ar-LY"
              onChange={(e) => {
                updateBrand({ locale: e.target.value });
                flash();
              }}
            />
            <Field label={t('اتجاه النص', 'Direction')}>
              <Segmented
                aria-label={t('اتجاه النص', 'Direction')}
                options={[
                  { value: 'rtl', label: t('من اليمين RTL', 'Right to left') },
                  { value: 'ltr', label: t('من اليسار LTR', 'Left to right') },
                ]}
                value={brand.direction}
                onChange={(d) => {
                  updateBrand({ direction: d });
                  flash();
                }}
              />
            </Field>
          </div>

          <div className="space-y-3 border-t border-border pt-4">
            <PanelHeading>{t('الشعار', 'Logo')}</PanelHeading>
            <div className="flex flex-wrap items-center gap-3">
              <Button variant="outline" leftIcon={<CloudUpload sx={{ fontSize: 20 }} />} onClick={() => logoRef.current?.click()}>
                {t('رفع صورة الشعار', 'Upload logo')}
              </Button>
              <p className="text-xs text-fg-muted">{t('PNG أو SVG، حتى 500KB.', 'PNG or SVG, up to 500KB.')}</p>
              <input ref={logoRef} type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} aria-label={t('رفع صورة الشعار', 'Upload logo')} />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Input
                label={t('رابط الشعار', 'Logo URL')}
                hint={logoIsUpload ? t('يُستخدم الآن شعار مرفوع من الجهاز. اكتب رابطاً لاستبداله.', 'An uploaded image is in use. Type a URL to replace it.') : undefined}
                dir="ltr"
                inputMode="url"
                spellCheck={false}
                autoCapitalize="none"
                className={LTR_FIELD}
                value={logoIsUpload ? '' : brand.logo.src}
                placeholder={logoIsUpload ? t('صورة مرفوعة من الجهاز', 'Uploaded image') : '/brand/logo.svg'}
                onChange={(e) => {
                  updateBrand({ logo: { src: e.target.value } });
                  flash();
                }}
              />
              <Input
                label={t('حرف بديل', 'Fallback letter')}
                hint={t('يظهر عند تعذر تحميل الصورة.', 'Shown when the image cannot load.')}
                maxLength={2}
                value={brand.logo.letter}
                onChange={(e) => {
                  updateBrand({ logo: { letter: e.target.value.slice(0, 2) } });
                  flash();
                }}
              />
            </div>
          </div>
        </SettingsPanel>
      </Section>

      <BrandingColors palette={brand.palette} onSaved={flash} />

      {/* Fonts */}
      <Section
        title={t('الخطوط', 'Fonts')}
        description={t('الخط الافتراضي مُضمَّن في التطبيق ويعمل بدون اتصال.', 'The default font ships with the app and works offline.')}
      >
        <SettingsPanel>
          <p
            className="text-lg font-semibold text-fg"
            style={{ fontFamily: brand.typography.arabicStack || brand.typography.sansStack }}
          >
            {t('فاتورة رقم 2026-014 بمبلغ 12,500.00 د.ل', 'Invoice 2026-014 for 12,500.00 LYD')}
          </p>
          <div className="grid gap-4 border-t border-border pt-4">
            {(
              [
                ['sansStack', t('خط الواجهة', 'Interface font')],
                ['arabicStack', t('خط النص العربي', 'Arabic text font')],
                ['numericStack', t('خط الأرقام', 'Numbers font')],
              ] as const
            ).map(([key, label]) => (
              <Input
                key={key}
                label={label}
                dir="ltr"
                spellCheck={false}
                autoCapitalize="none"
                className={LTR_FIELD}
                value={brand.typography[key] || ''}
                onChange={(e) => {
                  updateBrand({ typography: { [key]: e.target.value } });
                  flash();
                }}
              />
            ))}
            <p className="text-xs text-fg-muted">{t('قائمة خطوط CSS مفصولة بفواصل، وأول خط متاح هو المستخدم.', 'A comma-separated CSS font list; the first available font is used.')}</p>
          </div>
          <div>
            <Button
              variant="ghost"
              size="sm"
              leftIcon={<Restore sx={{ fontSize: 18 }} />}
              disabled={fontsAreDefault}
              onClick={() => {
                updateBrand({ typography: { ...defaultFonts } });
                flash();
              }}
            >
              {t('الخطوط الافتراضية', 'Default fonts')}
            </Button>
          </div>
        </SettingsPanel>
      </Section>

      {/* Contact */}
      <Section title={t('معلومات التواصل', 'Contact')} description={t('تظهر في الرأس والتذييل والمستندات.', 'Shown in headers, footers and documents.')}>
        <SettingsPanel>
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label={t('الهاتف', 'Phone')}
              type="tel"
              inputMode="tel"
              autoComplete="off"
              dir="ltr"
              className={LTR_FIELD}
              value={brand.contact.phone || ''}
              onChange={(e) => {
                updateBrand({ contact: { phone: e.target.value } });
                flash();
              }}
            />
            <Input
              label={t('الهاتف الثاني', 'Phone 2')}
              type="tel"
              inputMode="tel"
              autoComplete="off"
              dir="ltr"
              className={LTR_FIELD}
              value={brand.contact.phoneSecondary || ''}
              onChange={(e) => {
                updateBrand({ contact: { phoneSecondary: e.target.value } });
                flash();
              }}
            />
            <Input
              label={t('البريد الإلكتروني', 'Email')}
              type="email"
              inputMode="email"
              autoComplete="off"
              autoCapitalize="none"
              dir="ltr"
              className={LTR_FIELD}
              value={brand.contact.email || ''}
              onChange={(e) => {
                updateBrand({ contact: { email: e.target.value } });
                flash();
              }}
            />
            <Input
              label={t('الموقع الإلكتروني', 'Website')}
              type="url"
              inputMode="url"
              autoComplete="off"
              autoCapitalize="none"
              dir="ltr"
              className={LTR_FIELD}
              value={brand.contact.website || ''}
              onChange={(e) => {
                updateBrand({ contact: { website: e.target.value } });
                flash();
              }}
            />
            <div className="sm:col-span-2">
              <Input
                label={t('العنوان', 'Address')}
                autoComplete="off"
                value={brand.contact.address || ''}
                onChange={(e) => {
                  updateBrand({ contact: { address: e.target.value } });
                  flash();
                }}
              />
            </div>
          </div>
        </SettingsPanel>
      </Section>

      <BrandingSecurity />
      <BrandingCloud />

      <ListGroup>
        <ListRow
          leading={<HomeIconTile Icon={History} />}
          title={t('سجل التدقيق', 'Audit log')}
          subtitle={t('من قام بماذا ومتى', 'Who did what, and when')}
          chevron
          onClick={() => navigate('/settings/audit')}
        />
      </ListGroup>

      {/* Backup */}
      <Section title={t('النسخ الاحتياطي', 'Backup')} description={t('تصدير الإعدادات كاملة أو استيرادها من ملف.', 'Export the whole configuration or import it from a file.')}>
        <SettingsPanel>
          <div className="flex flex-wrap gap-3">
            <Button variant="outline" leftIcon={<Download sx={{ fontSize: 20 }} />} onClick={exportBrand}>
              {t('تصدير', 'Export')}
            </Button>
            <Button variant="outline" leftIcon={<Upload sx={{ fontSize: 20 }} />} onClick={() => importRef.current?.click()}>
              {t('استيراد', 'Import')}
            </Button>
            <input ref={importRef} type="file" accept="application/json" className="hidden" onChange={importBrand} aria-label={t('استيراد ملف الإعدادات', 'Import configuration file')} />
          </div>
        </SettingsPanel>
      </Section>

      {/* Reset: quiet, last, and confirmed */}
      <Section title={t('إعادة الضبط', 'Reset')}>
        <SettingsPanel className="flex flex-wrap items-center justify-between gap-3">
          <p className="min-w-0 flex-1 basis-60 text-sm text-fg-subtle">
            {t(
              'يعيد الاسم والشعار والألوان والخطوط وبيانات التواصل إلى القيم الافتراضية. لا يمس بيانات العمل.',
              'Restores name, logo, colors, fonts and contact details to the defaults. Business data is not touched.'
            )}
          </p>
          <Button variant="ghost" className="text-danger-ink hover:bg-danger-soft hover:text-danger-ink" leftIcon={<Restore sx={{ fontSize: 20 }} />} onClick={() => setConfirmReset(true)}>
            {t('استعادة الافتراضي', 'Restore defaults')}
          </Button>
        </SettingsPanel>
      </Section>

      <Modal
        open={confirmReset}
        onClose={() => setConfirmReset(false)}
        maxWidth="sm"
        title={t('استعادة الإعدادات الافتراضية؟', 'Restore the defaults?')}
        description={t('ستفقد التعديلات الحالية على الهوية والألوان والخطوط والتواصل.', 'Your current identity, color, font and contact changes will be lost.')}
      >
        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button variant="outline" onClick={() => setConfirmReset(false)}>
            {t('إلغاء', 'Cancel')}
          </Button>
          <Button
            variant="danger"
            onClick={() => {
              resetBrand();
              setConfirmReset(false);
              flash();
            }}
          >
            {t('استعادة', 'Restore')}
          </Button>
        </div>
      </Modal>

      <Modal
        open={!!pendingImport}
        onClose={() => setPendingImport(null)}
        maxWidth="sm"
        title={t('استيراد هذا الملف؟', 'Import this file?')}
        description={t('سيحل محل الهوية والألوان والخطوط والتواصل الحالية.', 'It will replace the current identity, colors, fonts and contact details.')}
      >
        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button variant="outline" onClick={() => setPendingImport(null)}>
            {t('إلغاء', 'Cancel')}
          </Button>
          <Button
            onClick={() => {
              if (pendingImport) setBrand(pendingImport);
              setPendingImport(null);
              flash();
            }}
          >
            {t('استيراد', 'Import')}
          </Button>
        </div>
      </Modal>
    </PageShell>
  );
}
