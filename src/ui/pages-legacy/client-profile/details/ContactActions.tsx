import type { ElementType } from 'react';
import { CallOutlined, PlaceOutlined, WhatsApp } from '@mui/icons-material';
import { cn } from '../../../../design-system/primitives/cn';
import { mapsHref, phoneHref, whatsappHref } from './contactLinks';

const LINK =
  'inline-flex h-12 min-w-0 items-center justify-center gap-1.5 rounded-md border border-border-strong bg-surface-panel px-2 ' +
  'text-sm font-semibold text-fg select-none transition-[transform,background-color] duration-fast ease-out ' +
  'hover:bg-surface-sunken active:scale-[0.98] focus:outline-none focus-visible:shadow-focus';

function ActionLink({ href, label, Icon, external }: { href: string; label: string; Icon: ElementType; external?: boolean }) {
  return (
    <a
      href={href}
      className={LINK}
      {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
    >
      <Icon sx={{ fontSize: 20 }} className="flex-none text-accent-ink" aria-hidden />
      <span className="truncate">{label}</span>
    </a>
  );
}

/**
 * Call, WhatsApp and open-in-maps for a client. A button exists only when its datum does (no usable phone
 * number, no address), and the row is absent when there is nothing to offer.
 */
export function ContactActions({ phone, address, className }: { phone?: string | null; address?: string | null; className?: string }) {
  const call = phoneHref(phone);
  const chat = whatsappHref(phone);
  const map = mapsHref(address);
  if (!call && !chat && !map) return null;
  return (
    <div className={cn('grid grid-cols-[repeat(auto-fit,minmax(5.75rem,1fr))] gap-2', className)}>
      {call && <ActionLink href={call} label="اتصال" Icon={CallOutlined} />}
      {chat && <ActionLink href={chat} label="واتساب" Icon={WhatsApp} external />}
      {map && <ActionLink href={map} label="الخريطة" Icon={PlaceOutlined} external />}
    </div>
  );
}
