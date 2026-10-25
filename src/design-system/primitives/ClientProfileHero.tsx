import { ReactNode } from 'react';
import { Business, Person, Phone, LocationOn, Settings } from '@mui/icons-material';
import { cn } from './cn';

export type ClientProfileStat = {
  label: string;
  value: ReactNode;
  labelClassName?: string;
  valueClassName?: string;
  cellClassName?: string;
};

export type ClientProfileHeroProps = {
  initial: string;
  isCompany: boolean;
  clientName: string;
  phone?: string;
  statusLabel?: string;
  address?: string;
  profitPercentage?: number;
  profitBaseLabel?: string;
  showProfitBadge?: boolean;
  onSettings?: () => void;
  /** Quick actions row below contact block */
  actions?: ReactNode;
  stats?: ClientProfileStat[];
  className?: string;
  reveal?: boolean;
  /** Tighter padding and type on lg+ only; mobile layout unchanged. */
  desktopCompact?: boolean;
};

/**
 * Rkeaz's client identity composition, with this project's saved status and permissions.
 */
export function ClientProfileHero({
  initial,
  isCompany,
  clientName,
  phone,
  statusLabel,
  address,
  profitPercentage = 0,
  profitBaseLabel,
  showProfitBadge = false,
  onSettings,
  actions,
  stats,
  className,
  reveal,
  desktopCompact = false,
}: ClientProfileHeroProps) {
  return (
    <div className="client-profile-frame hero-bezel">
      <section
        {...(reveal ? { 'data-reveal': '' as const } : {})}
        className={cn('client-profile-hero hero-bezel-inner relative overflow-hidden text-white', className)}
        style={{
          background: 'linear-gradient(152deg, #070b14 0%, var(--brand-primary-base) 48%, #1a3268 100%)',
          boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.12), inset 0 -1px 0 rgba(255,255,255,0.04)',
        }}
      >
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 h-px opacity-60"
          style={{ background: 'linear-gradient(90deg, transparent, rgba(253,226,230,0.55), transparent)' }}
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -end-[18%] -top-[32%] h-[55%] w-[min(75%,300px)] max-w-full rounded-full opacity-[0.14] blur-[48px] motion-reduce:opacity-0"
          style={{ background: 'radial-gradient(closest-side, rgba(253,226,230,0.35) 0%, transparent 70%)' }}
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -start-[12%] bottom-[-32%] h-[50%] w-[60%] rounded-full opacity-[0.12] blur-[56px] motion-reduce:opacity-0"
          style={{ background: 'radial-gradient(closest-side, rgba(96,130,200,0.4) 0%, transparent 72%)' }}
        />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/[0.22] to-transparent" />

        <div
          className={cn(
            'relative z-10 px-4 py-4 sm:px-5 sm:py-4',
            desktopCompact && 'lg:px-5 lg:py-2.5 xl:px-6'
          )}
        >
          <div
            className={cn(
              'flex flex-col gap-3.5 sm:flex-row sm:items-start sm:gap-4',
              desktopCompact && 'lg:flex-row lg:items-center lg:gap-3.5'
            )}
          >
            <div
              className={cn(
                'group relative flex size-14 shrink-0 items-center justify-center self-center rounded-md border border-white/[0.18] text-xl font-extrabold sm:self-start sm:text-2xl',
                desktopCompact && 'lg:size-10 lg:self-center lg:text-base xl:size-11 xl:text-lg'
              )}
              style={{
                background: 'linear-gradient(135deg, rgba(255,255,255,0.22), rgba(255,255,255,0.06))',
                boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.24), 0 4px 16px rgba(0,0,0,0.14)',
              }}
            >
              {initial}
              <div
                className={cn(
                  'absolute -bottom-0.5 -end-0.5 flex size-6 items-center justify-center rounded-sm border border-white/30',
                  desktopCompact && 'lg:size-5'
                )}
                style={{ background: isCompany ? 'var(--brand-info)' : '#64748b' }}
              >
                {isCompany ? (
                  <Business sx={{ fontSize: desktopCompact ? 10 : 11, color: '#fff' }} />
                ) : (
                  <Person sx={{ fontSize: desktopCompact ? 10 : 11, color: '#fff' }} />
                )}
              </div>
            </div>

            <div className="min-w-0 flex-1 text-center sm:text-start">
              <div className="flex flex-wrap items-center justify-center gap-2 sm:justify-between sm:gap-3">
                <div className="flex flex-wrap items-center justify-center gap-2 sm:justify-start">
                  <span className="hero-chip min-h-6 px-2.5 text-2xs font-semibold">
                    {isCompany ? 'شركة' : 'فرد'}
                  </span>
                  {statusLabel && <span className="hero-chip min-h-6 px-2.5 text-2xs font-semibold">{statusLabel}</span>}
                  {showProfitBadge && profitPercentage > 0 && (
                    <span className={cn(
                      'inline-flex h-6 items-center gap-0.5 rounded-sm border border-emerald-400/[0.40] bg-emerald-500/[0.22] px-2 text-2xs font-bold font-num text-emerald-100 tabular-nums shadow-[inset_0_1px_0_rgba(255,255,255,0.1)]',
                      desktopCompact && 'lg:px-1.5'
                    )} title={profitBaseLabel}>
                      <bdi dir="ltr">{profitPercentage}%</bdi>
                    </span>
                  )}
                </div>
                {onSettings && (
                  <button
                    type="button"
                    aria-label="إعدادات العميل"
                    onClick={onSettings}
                    className="hero-action-btn ms-auto shrink-0 focus:outline-none focus-visible:shadow-focus sm:static"
                  >
                    <Settings sx={{ fontSize: desktopCompact ? 18 : 20 }} />
                  </button>
                )}
              </div>

              <h1
                className={cn(
                  'mt-2 break-words font-arabic text-lg font-bold leading-snug text-white text-balance [overflow-wrap:anywhere] sm:text-xl',
                  desktopCompact && 'lg:mt-1 lg:text-lg lg:leading-tight'
                )}
              >
                {clientName}
              </h1>

              {desktopCompact && (phone || address) && (
                <div className="mt-1.5 hidden min-w-0 flex-wrap items-center gap-x-3 gap-y-0.5 text-2xs text-white/[0.78] lg:flex">
                  {phone && (
                    <a
                      href={`tel:${phone.replace(/\s/g, '')}`}
                      className="inline-flex min-w-0 items-center gap-1.5 transition-colors hover:text-white"
                    >
                      <Phone sx={{ fontSize: 13 }} className="shrink-0 opacity-70" aria-hidden />
                      <bdi dir="ltr" className="break-all font-num tabular-nums">{phone}</bdi>
                    </a>
                  )}
                  {phone && address && <span className="text-white/[0.25]" aria-hidden>·</span>}
                  {address && (
                    <span className="inline-flex min-w-0 items-center gap-1.5">
                      <LocationOn sx={{ fontSize: 13 }} className="shrink-0 opacity-70" aria-hidden />
                      <span className="break-words font-arabic [overflow-wrap:anywhere]">{address}</span>
                    </span>
                  )}
                </div>
              )}

              {(phone || address) && (
                <div
                  className={cn(
                    'mt-3.5 overflow-hidden rounded-md border border-white/[0.12] sm:mt-4',
                    desktopCompact && 'lg:hidden'
                  )}
                >
                  {phone && (
                    <a
                      href={`tel:${phone.replace(/\s/g, '')}`}
                      className="flex items-start gap-3 px-3 py-3.5 transition-colors duration-200 ease-[var(--ease-ios)] hover:bg-white/[0.05] sm:items-center sm:gap-3.5 sm:px-4 sm:py-4"
                    >
                      <div
                        className="mt-0.5 grid size-10 shrink-0 place-items-center rounded-sm sm:mt-0"
                        style={{ background: 'rgba(255,255,255,0.14)' }}
                      >
                        <Phone sx={{ fontSize: 20, color: '#fff' }} />
                      </div>
                      <div className="min-w-0 flex-1 text-start">
                        <p className="text-2xs font-semibold text-[var(--client-hero-muted)] font-arabic">الهاتف</p>
                        <p
                          dir="ltr"
                          className="mt-1 break-all font-num text-lg font-semibold tabular-nums leading-snug text-white"
                        >
                          {phone}
                        </p>
                      </div>
                    </a>
                  )}
                  {phone && address && <div className="h-px bg-white/10" role="separator" />}
                  {address && (
                    <div className="flex items-start gap-3 px-3 py-3.5 sm:gap-3.5 sm:px-4 sm:py-4">
                      <div
                        className="mt-0.5 grid size-10 shrink-0 place-items-center rounded-sm sm:mt-0"
                        style={{ background: 'rgba(255,255,255,0.14)' }}
                      >
                        <LocationOn sx={{ fontSize: 20, color: '#fff' }} />
                      </div>
                      <div className="min-w-0 flex-1 text-start">
                        <p className="text-2xs font-semibold text-[var(--client-hero-muted)] font-arabic">العنوان</p>
                        <p className="mt-1.5 whitespace-pre-wrap break-words text-sm leading-7 text-white/[0.92] font-arabic text-pretty">
                          {address}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {actions && (
            <div
              className={cn(
                'relative z-10 mt-4 flex flex-wrap items-center gap-2 border-t border-white/10 pb-1 pt-4',
                desktopCompact && 'lg:hidden'
              )}
            >
              {actions}
            </div>
          )}
        </div>

        {stats && stats.length > 0 && (
          <div
            className={cn(
              'hero-stat-strip relative z-10 grid',
              stats.length === 4 ? 'grid-cols-2 lg:grid-cols-4' : stats.length === 3 ? 'grid-cols-3' : 'grid-cols-2'
            )}
          >
            {stats.map((stat, i) => (
              <div
                key={i}
                className={cn(
                  'p-2.5 text-center transition-colors duration-200 ease-[var(--ease-ios)] hover:bg-white/[0.05] sm:p-3',
                  i % 2 === 0 && stats.length === 4 && 'border-e border-white/10',
                  i === 2 && stats.length === 4 && 'border-t border-white/10 lg:border-t-0',
                  i === 3 && stats.length === 4 && 'border-s border-t border-white/10 sm:border-s-0 sm:border-t-0 lg:border-s lg:border-white/10',
                  stat.cellClassName
                )}
              >
                <div className={cn('text-2xs font-semibold text-white/[0.72] font-arabic', stat.labelClassName)}>
                  {stat.label}
                </div>
                <div
                  className={cn(
                    'mt-1 text-sm font-extrabold text-white font-num tabular-nums sm:text-base',
                    stat.valueClassName
                  )}
                >
                  {stat.value}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
