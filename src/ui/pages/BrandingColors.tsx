import { useEffect, useState } from 'react';
import { Badge, Button, Input, ProgressBar, Section } from '../../design-system/primitives';
import { useBrandStore } from '../../stores/useBrandStore';
import type { BrandPalette } from '../../config/brand.types';
import { LTR_FIELD, PanelHeading, SettingsPanel, useBrandT } from './BrandingPanel';

const HEX = /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i;

/** `#abc` -> `#aabbcc` (the native color input only accepts the long form). */
function toLongHex(hex: string): string {
  const h = hex.toLowerCase();
  return h.length === 4 ? `#${h[1]}${h[1]}${h[2]}${h[2]}${h[3]}${h[3]}` : h;
}

const PALETTE_ORDER: (keyof BrandPalette)[] = ['primary', 'secondary', 'success', 'warning', 'danger', 'info'];

interface ColorFieldProps {
  label: string;
  value: string;
  invalidMessage: string;
  onCommit: (hex: string) => void;
}

/**
 * Native picker + a hex field. The hex text is a draft: only a complete, valid color
 * reaches the brand store (a half-typed value would otherwise break the live theme).
 */
function ColorField({ label, value, invalidMessage, onCommit }: ColorFieldProps) {
  const [draft, setDraft] = useState(value);
  useEffect(() => setDraft(value), [value]);
  const valid = HEX.test(draft);

  return (
    <Input
      label={label}
      dir="ltr"
      spellCheck={false}
      autoCapitalize="characters"
      autoComplete="off"
      maxLength={7}
      value={draft}
      error={valid ? undefined : invalidMessage}
      className={`${LTR_FIELD} font-mono uppercase`}
      leftIcon={
        <input
          type="color"
          aria-label={label}
          value={toLongHex(valid ? draft : value)}
          onChange={(e) => onCommit(e.target.value)}
          className={
            '-ms-2.5 h-11 w-11 cursor-pointer rounded-md border border-border-strong bg-transparent p-1 ' +
            '[&::-webkit-color-swatch-wrapper]:p-0 [&::-webkit-color-swatch]:rounded-sm [&::-webkit-color-swatch]:border-0 ' +
            '[&::-moz-color-swatch]:rounded-sm [&::-moz-color-swatch]:border-0'
          }
        />
      }
      onChange={(e) => {
        let next = e.target.value.trim();
        if (next && !next.startsWith('#')) next = `#${next}`;
        setDraft(next);
        if (HEX.test(next)) onCommit(next);
      }}
      onBlur={() => setDraft(value)}
    />
  );
}

/**
 * The real primitives, drawn with the colors being edited. They read the CSS variables the
 * store writes, so what you see here is exactly what the app will look like.
 */
function LivePreview() {
  const t = useBrandT();
  return (
    <div className="space-y-3" aria-label={t('معاينة مباشرة', 'Live preview')} role="group">
      <PanelHeading>{t('معاينة مباشرة', 'Live preview')}</PanelHeading>
      <div className="flex flex-wrap items-center gap-2">
        <Button size="sm">{t('زر أساسي', 'Primary')}</Button>
        <Button size="sm" variant="secondary">
          {t('زر ثانوي', 'Secondary')}
        </Button>
        <Button size="sm" variant="outline">
          {t('إطار', 'Outline')}
        </Button>
        <Button size="sm" variant="danger-soft">
          {t('حذف', 'Delete')}
        </Button>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Badge tone="brand">{t('أساسي', 'Brand')}</Badge>
        <Badge tone="success" dot>
          {t('مدفوعة', 'Paid')}
        </Badge>
        <Badge tone="warning" dot>
          {t('معلّقة', 'Pending')}
        </Badge>
        <Badge tone="danger" dot>
          {t('متأخرة', 'Overdue')}
        </Badge>
        <Badge tone="info" dot>
          {t('مسودة', 'Draft')}
        </Badge>
      </div>
      <ProgressBar value={64} label={t('مثال على شريط التقدم', 'Progress sample')} />
    </div>
  );
}

/** Colors section: live preview on top, then one picker + hex field per palette role. */
export function BrandingColors({ palette, onSaved }: { palette: BrandPalette; onSaved: () => void }) {
  const t = useBrandT();
  const updateBrand = useBrandStore((s) => s.updateBrand);
  const labels: Record<keyof BrandPalette, string> = {
    primary: t('الأساسي', 'Primary'),
    secondary: t('الثانوي', 'Secondary'),
    success: t('النجاح', 'Success'),
    warning: t('التحذير', 'Warning'),
    danger: t('الخطر', 'Danger'),
    info: t('المعلومة', 'Info'),
  };
  return (
    <Section
      title={t('الألوان', 'Colors')}
      description={t('اللون الأساسي للأزرار والروابط، والبقية لمعاني الحالات.', 'Primary for buttons and links; the rest carry status meaning.')}
    >
      <SettingsPanel>
        <LivePreview />
        <div className="grid gap-4 border-t border-border pt-4 sm:grid-cols-2 lg:grid-cols-3">
          {PALETTE_ORDER.map((key) => (
            <ColorField
              key={key}
              label={labels[key]}
              value={palette[key]}
              invalidMessage={t('مثال: #1F2633', 'Example: #1F2633')}
              onCommit={(hex) => {
                updateBrand({ palette: { [key]: hex } });
                onSaved();
              }}
            />
          ))}
        </div>
      </SettingsPanel>
    </Section>
  );
}
