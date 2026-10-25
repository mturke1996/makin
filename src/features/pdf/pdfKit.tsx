// @ts-nocheck
/**
 * pdfKit — the building blocks of every MAKIN document.
 *
 * The look is a printed ledger, not a dashboard: no boxes, no coloured bars, no repeated card shapes.
 * Structure comes from hairline rules and type alone, and each fact is printed once:
 *  - The letterhead (logo, company line, services, phones) is on the first page only.
 *  - Continuation pages carry a slim running header and a footer with the reference and page number.
 *  - A total is shown in one place, not again under the table.
 * Figures are set in Cairo, whose digits are all the same width, so columns line up.
 */
import React from 'react';
import { Image, Page, StyleSheet, Text, View } from '@react-pdf/renderer';
import './pdfFonts';
import { PDF_FONT_FAMILY, PDF_NUM_FONT } from './pdfFonts';
import { ar, arDate } from './arabicPDF';
import { getPdfBrand, type PdfBrandSnapshot } from './pdfBrand';
import { getPdfCompanyInfo } from './pdfCompanyInfo';
import { usePdfLogoDataUri } from './pdf-logo-context';

export const INK = {
  text: '#1F2633',
  muted: '#5E6472',
  faint: '#8B909B',
  border: '#DAD6CB',
  hair: '#E9E6DE',
  zebra: '#FBFAF7',
  panel: '#F6F3EC',
  white: '#FFFFFF',
  gold: '#C9972B',
  success: '#0F766E',
  warning: '#B45309',
  danger: '#B42318',
};

export const PDF_PAGINATION = {
  tableHead: 26,
  totalBar: 30,
  minRowHeight: 26,
  section: 34,
  /** Space kept clear above the fixed footer so flowing content never runs into it. */
  footerReserve: 52,
} as const;

/** The logo file is 1600 x 416. */
const LOGO_RATIO = 416 / 1600;
const FF = PDF_FONT_FAMILY;
const NUM = PDF_NUM_FONT;

export function makePdfStyles(B: PdfBrandSnapshot) {
  return StyleSheet.create({
    page: {
      fontFamily: FF,
      fontSize: 9,
      color: INK.text,
      backgroundColor: INK.white,
      paddingTop: 62,
      paddingBottom: PDF_PAGINATION.footerReserve + 8,
      paddingHorizontal: 40,
    },

    /* ── Letterhead (first page only) ── */
    letterhead: { alignItems: 'center', marginTop: -26, marginBottom: 20 },
    lhName: { marginTop: 9, fontSize: 10.5, fontWeight: 'bold', letterSpacing: 2.4, color: INK.text, textAlign: 'center' },
    lhServices: { marginTop: 3, fontSize: 7.8, letterSpacing: 0.7, color: INK.muted, textAlign: 'center' },
    lhPhones: { marginTop: 4, fontFamily: NUM, fontSize: 8.6, fontWeight: 'bold', letterSpacing: 0.6, color: INK.text, textAlign: 'center' },
    lhRule: { marginTop: 11, width: '100%', borderTopWidth: 1.6, borderTopColor: INK.gold },
    lhRuleThin: { marginTop: 2, width: '100%', borderTopWidth: 0.5, borderTopColor: INK.text },

    /* ── Running header + footer (every other page) ── */
    runHead: {
      position: 'absolute',
      top: 22,
      left: 40,
      right: 40,
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingBottom: 7,
      borderBottomWidth: 0.6,
      borderBottomColor: INK.border,
    },
    runTitle: { fontSize: 8.4, color: INK.muted, textAlign: 'left' },
    foot: {
      position: 'absolute',
      bottom: 22,
      left: 40,
      right: 40,
      flexDirection: 'row',
      justifyContent: 'space-between',
      paddingTop: 7,
      borderTopWidth: 0.6,
      borderTopColor: INK.border,
    },
    footText: { fontSize: 7.8, color: INK.faint },
    footNum: { fontFamily: NUM, fontSize: 7.6, color: INK.faint },

    /* ── Document title ── */
    docTitleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 16 },
    docTitle: { fontSize: 20, fontWeight: 'bold', color: INK.text, textAlign: 'right', lineHeight: 1.25 },
    docSubtitle: { fontSize: 9.6, color: INK.muted, textAlign: 'right', marginTop: 4 },
    docMeta: { alignItems: 'flex-start', gap: 3 },
    docMetaRow: { flexDirection: 'row', gap: 6 },
    docMetaLabel: { fontSize: 7.8, color: INK.faint, textAlign: 'left' },
    docMetaValue: { fontFamily: NUM, fontSize: 8.4, fontWeight: 'bold', color: INK.text, textAlign: 'left' },

    /* ── Particulars (client, phone, period): plain labelled text, no box ── */
    infoRow: { flexDirection: 'row-reverse', marginBottom: 14, gap: 18 },
    infoCell: { flex: 1, alignItems: 'flex-end' },
    infoLabel: { fontSize: 7.4, color: INK.faint, marginBottom: 3, textAlign: 'right' },
    infoValue: { fontSize: 9.6, fontWeight: 'bold', color: INK.text, textAlign: 'right', lineHeight: 1.35 },
    infoValueNum: { fontFamily: NUM, fontSize: 9.4, fontWeight: 'bold', color: INK.text, textAlign: 'right' },

    /* ── Key figures: one ruled band, figures divided by hairlines ── */
    keyBand: {
      flexDirection: 'row-reverse',
      borderTopWidth: 0.9,
      borderTopColor: INK.text,
      borderBottomWidth: 0.6,
      borderBottomColor: INK.border,
      marginBottom: 6,
    },
    keyCell: { flex: 1, paddingVertical: 11, paddingHorizontal: 12, alignItems: 'flex-end' },
    keyCellDivider: { borderRightWidth: 0.6, borderRightColor: INK.border },
    keyLabel: { fontSize: 7.8, color: INK.muted, marginBottom: 5, textAlign: 'right' },
    keyHint: { fontSize: 7.4, color: INK.faint, marginTop: 3, textAlign: 'right' },

    /* ── Section heading: bold line over a hairline ── */
    sectionTitle: { fontSize: 11, fontWeight: 'bold', color: INK.text, textAlign: 'right' },
    sectionRule: { width: 26, borderTopWidth: 1, borderTopColor: INK.text, marginTop: 3, alignSelf: 'flex-end' },

    /* ── Totals + notes ── */
    totalsBox: { width: 240, alignSelf: 'flex-start', marginTop: 14 },
    totalLine: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', paddingVertical: 4 },
    totalLabel: { fontSize: 9.4, color: INK.muted, textAlign: 'right' },
    grandLine: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', paddingTop: 8, paddingBottom: 6, marginTop: 4, borderTopWidth: 0.9, borderTopColor: INK.text },
    grandLbl: { fontSize: 10.5, fontWeight: 'bold', color: INK.text, textAlign: 'right' },
    notesBox: { marginTop: 16, paddingTop: 8, borderTopWidth: 0.6, borderTopColor: INK.border, alignItems: 'flex-end' },
    notesLbl: { fontSize: 8.2, fontWeight: 'bold', color: INK.text, marginBottom: 4, textAlign: 'right' },
    notesTxt: { fontSize: 9.2, color: INK.muted, textAlign: 'right', lineHeight: 1.7 },
  });
}

/* ───────────────────────────── Figures ───────────────────────────── */

export const hasFraction = (n: number) => Math.abs(n % 1) > 1e-9;

/**
 * One number of decimals for a set of figures that sit together (a column, a statement, a strip):
 * none when they are all whole dinars, otherwise three (the dinar's thousandths) for every one of them,
 * so the decimal points line up.
 */
export const decimalsFor = (values: number[]) => (values.some((v) => Number.isFinite(v) && hasFraction(v)) ? 3 : 0);

function splitAmount(amount: number, decimals: number) {
  const value = Number.isFinite(amount) ? amount : 0;
  const rounded = Math.round(Math.abs(value) * 10 ** decimals) / 10 ** decimals;
  const [int, frac = ''] = new Intl.NumberFormat('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals, useGrouping: true })
    .format(rounded)
    .split('.');
  const negative = value < 0 && rounded > 0;
  return { sign: negative ? '−' : '', int, frac };
}

/**
 * An amount, set in Cairo's even-width digits: the whole part in full weight, the thousandths lighter and a
 * touch smaller, and the currency after it, small and quiet. `bare` drops the currency for table cells whose
 * header already names it.
 */
export const PdfAmount = ({
  amount,
  decimals,
  size = 9.2,
  color,
  bold = true,
  light = false,
  bare = false,
  currency = 'د.ل',
  align = 'end',
  containerStyle,
}: {
  amount: number;
  /** Fixed number of decimals; derived from the amount when omitted. */
  decimals?: number;
  size?: number;
  color?: string;
  bold?: boolean;
  light?: boolean;
  bare?: boolean;
  currency?: string;
  /** `end` packs to the right edge (the reading start), so decimal points line up in a column. */
  align?: 'start' | 'end';
  containerStyle?: any;
}) => {
  const d = decimals ?? (hasFraction(amount) ? 3 : 0);
  const { sign, int, frac } = splitAmount(amount, d);
  const ink = color || (light ? INK.white : INK.text);
  return (
    <View wrap={false} style={[{ flexDirection: 'row-reverse', alignItems: 'baseline', justifyContent: align === 'end' ? 'flex-start' : 'flex-end' }, containerStyle]}>
      <Text style={{ fontFamily: NUM, fontSize: size, fontWeight: bold ? 'bold' : 'normal', color: ink }}>
        {`${sign}${int}`}
        {frac ? <Text style={{ fontSize: size * 0.8, fontWeight: 'normal', opacity: 0.6 }}>{`.${frac}`}</Text> : null}
      </Text>
      {bare ? null : (
        <Text style={{ fontFamily: FF, fontSize: size * 0.74, color: light ? 'rgba(255,255,255,0.78)' : INK.faint, marginRight: size * 0.32 }}>{currency}</Text>
      )}
    </View>
  );
};

/** Back-compatible name for an amount in a flowing layout. */
export const PdfMoneyText = ({ amount, style, containerStyle, color, light = false, bare = false, decimals }: any) => (
  <PdfAmount amount={amount} decimals={decimals} color={color} light={light} bare={bare} size={style?.fontSize ?? 9.2} bold={style?.fontWeight !== 'normal'} containerStyle={containerStyle} />
);

/** A value made only of digits and separators (a phone, a date range) is set in the figures font. */
const isNumeric = (value?: string | null) => !!value && /^[\d\s+\-/–.:,]+$/.test(value);

/* ───────────────────────────── Page frame ───────────────────────────── */

/** The letterhead: the logo, then the company line, the services line and the phones, centred. First page only. */
export const PdfLetterhead = ({ s, logo }: { s: any; logo?: string | null }) => {
  const info = getPdfCompanyInfo();
  return (
    <View style={s.letterhead} wrap={false}>
      {logo ? <Image src={logo} style={{ width: 176, height: 176 * LOGO_RATIO }} /> : <Text style={{ fontSize: 26, fontWeight: 'bold', letterSpacing: 4 }}>MAKIN</Text>}
      <Text style={s.lhName}>{info.nameEn}</Text>
      <Text style={s.lhServices}>{info.servicesEn}</Text>
      {info.phones.length > 0 ? <Text style={s.lhPhones}>{info.phones.join('   |   ')}</Text> : null}
      <View style={s.lhRule} />
      <View style={s.lhRuleThin} />
    </View>
  );
};

/**
 * A page of a document. `letterhead` puts the full letterhead on top of the first page; every page
 * without it gets the slim running header. The footer is the same on all of them.
 */
export const PdfPage = ({
  s,
  letterhead = false,
  runningTitle,
  docRef,
  children,
}: {
  B?: PdfBrandSnapshot;
  s: any;
  letterhead?: boolean;
  /** What the slim header says (e.g. «كشف المصروفات · مشروع الفيلا»). */
  runningTitle: string;
  docRef?: string;
  children: React.ReactNode;
}) => {
  const logo = usePdfLogoDataUri();
  return (
    <Page size="A4" style={s.page} wrap>
      <View
        fixed
        style={{ position: 'absolute', top: 0, left: 0, right: 0 }}
        render={({ subPageNumber }) =>
          letterhead && subPageNumber === 1 ? null : (
            <View style={s.runHead}>
              <Text style={s.runTitle}>{ar(runningTitle)}</Text>
              {logo ? <Image src={logo} style={{ width: 72, height: 72 * LOGO_RATIO }} /> : <Text style={{ fontSize: 10, fontWeight: 'bold', letterSpacing: 2 }}>MAKIN</Text>}
            </View>
          )
        }
      />
      {letterhead ? <PdfLetterhead s={s} logo={logo} /> : null}
      {children}
      <View fixed style={s.foot}>
        <Text style={s.footText} render={({ pageNumber, totalPages }) => ar(`صفحة ${pageNumber} من ${totalPages}`)} />
        <Text style={s.footNum}>{docRef ?? ''}</Text>
      </View>
    </Page>
  );
};

/** Title block: the Arabic title (and a line under it) on the start side, reference and date on the other. */
export const PdfDocTitle = ({
  s,
  titleAr,
  subtitle,
  meta,
}: {
  s: any;
  titleAr: string;
  subtitle?: string;
  meta?: { label: string; value: string }[];
  /** @deprecated documents no longer carry an English kicker. */
  titleEn?: string;
}) => (
  <View style={s.docTitleRow} wrap={false}>
    <View style={s.docMeta}>
      {(meta ?? [{ label: 'تاريخ الإصدار', value: arDate(new Date().toISOString()) }]).map((m) => (
        <View key={m.label} style={s.docMetaRow}>
          <Text style={[s.docMetaValue, /[\u0600-\u06FF]/.test(m.value) ? { fontFamily: FF } : null]}>{/[\u0600-\u06FF]/.test(m.value) ? ar(m.value) : m.value}</Text>
          <Text style={s.docMetaLabel}>{ar(m.label)}</Text>
        </View>
      ))}
    </View>
    <View style={{ flex: 1, alignItems: 'flex-end' }}>
      <Text style={s.docTitle}>{ar(titleAr)}</Text>
      {subtitle ? <Text style={s.docSubtitle}>{ar(subtitle)}</Text> : null}
    </View>
  </View>
);

/** The particulars of a document (client, phone, address, period) as plain labelled text. Empty values are dropped. */
export const PdfInfoCard = ({ s, items }: { s: any; items: { label: string; value?: string | null }[] }) => {
  const shown = items.filter((i) => i.value);
  if (shown.length === 0) return null;
  return (
    <View style={s.infoRow} wrap={false}>
      {shown.map((item) => (
        <View key={item.label} style={s.infoCell}>
          <Text style={s.infoLabel}>{ar(item.label)}</Text>
          <Text style={isNumeric(item.value) ? s.infoValueNum : s.infoValue}>{isNumeric(item.value) ? item.value : ar(item.value)}</Text>
        </View>
      ))}
    </View>
  );
};

/**
 * The headline figures in one ruled band. A colour sits on the figure itself when it carries a meaning;
 * nothing is boxed. Amounts share one number of decimals so they read as a set.
 */
export const PdfSummaryStrip = ({
  s,
  cells,
}: {
  s: any;
  cells: { label: string; value: string | number; color?: string; hint?: string; count?: boolean; accent?: boolean }[];
}) => {
  const decimals = decimalsFor(cells.filter((c) => typeof c.value === 'number' && !c.count).map((c) => c.value as number));
  return (
    <View style={s.keyBand} wrap={false}>
      {cells.map((cell, i) => (
        <View key={i} style={[s.keyCell, i > 0 ? s.keyCellDivider : null]}>
          <Text style={s.keyLabel}>{ar(cell.label)}</Text>
          {typeof cell.value === 'number' && !cell.count ? (
            <PdfAmount amount={cell.value} decimals={decimals} size={14} color={cell.color} />
          ) : typeof cell.value === 'number' || isNumeric(String(cell.value)) ? (
            <Text style={{ fontFamily: NUM, fontSize: 14, fontWeight: 'bold', color: cell.color || INK.text }}>{String(cell.value)}</Text>
          ) : (
            <Text style={{ fontFamily: FF, fontSize: 11.5, fontWeight: 'bold', color: cell.color || INK.text, textAlign: 'right', lineHeight: 1.3 }}>{ar(String(cell.value))}</Text>
          )}
          {cell.hint ? <Text style={s.keyHint}>{ar(cell.hint)}</Text> : null}
        </View>
      ))}
    </View>
  );
};

/** Section heading over a full-width hairline; an optional count sits on the far side. */
export const PdfSectionHeading = ({ s, children, hint }: { s: any; children: string; hint?: string }) => (
  <View style={{ marginTop: 18, marginBottom: 6 }} minPresenceAhead={PDF_PAGINATION.section + PDF_PAGINATION.minRowHeight}>
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', paddingBottom: 5, borderBottomWidth: 0.6, borderBottomColor: INK.border }}>
      <Text style={{ fontSize: 7.8, color: INK.faint }}>{hint ? ar(hint) : ''}</Text>
      <Text style={s.sectionTitle}>{ar(children)}</Text>
    </View>
  </View>
);

/**
 * Share of a total as quiet horizontal bars: where the money went (categories) or how it came in (methods).
 * Rows are sorted largest first by the caller; `total` is the whole the bars are a share of.
 */
export const PdfBreakdown = ({ rows, total, color = INK.text }: { rows: { label: string; amount: number }[]; total: number; color?: string }) => {
  const decimals = decimalsFor(rows.map((r) => r.amount));
  return (
    <View style={{ gap: 6 }}>
      {rows.map((row) => {
        const share = total > 0 ? Math.max(0, Math.min(1, row.amount / total)) : 0;
        return (
          <View key={row.label} wrap={false} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <View style={{ width: 64 }}>
              <PdfAmount amount={row.amount} decimals={decimals} bare bold={false} size={8.6} />
            </View>
            <Text style={{ width: 28, fontFamily: NUM, fontSize: 7.8, color: INK.muted, textAlign: 'left' }}>{`${Math.round(share * 100)}%`}</Text>
            <View style={{ flex: 1, height: 3, backgroundColor: INK.hair, flexDirection: 'row-reverse' }}>
              <View style={{ width: `${Math.max(share * 100, share > 0 ? 1.5 : 0)}%`, height: 3, backgroundColor: color }} />
            </View>
            <Text style={{ width: 120, fontSize: 8.8, color: INK.text, textAlign: 'right' }}>{ar(row.label)}</Text>
          </View>
        );
      })}
    </View>
  );
};

const DoubleRule = () => (
  <View>
    <View style={{ borderTopWidth: 0.7, borderTopColor: INK.text }} />
    <View style={{ marginTop: 1.6, borderTopWidth: 0.7, borderTopColor: INK.text }} />
  </View>
);

/**
 * An account in ledger form: lines with a sign (+ −) and a final figure under a double rule (=).
 * No fills, no boxes; the lines share one number of decimals.
 */
export const PdfStatement = ({
  lines,
  net,
}: {
  lines: { label: string; note?: string; sign?: string; amount: number; color?: string }[];
  net: { label: string; amount: number; color?: string };
}) => {
  const decimals = decimalsFor([...lines.map((l) => l.amount), net.amount]);
  return (
    <View wrap={false} style={{ marginBottom: 8 }}>
      {lines.map((line) => (
        <View key={line.label} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 7, borderBottomWidth: 0.6, borderBottomColor: INK.hair }}>
          <PdfAmount amount={line.amount} decimals={decimals} size={10} color={line.color} bold={false} />
          <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 8 }}>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={{ fontSize: 9.6, color: INK.text, textAlign: 'right' }}>{ar(line.label)}</Text>
              {line.note ? <Text style={{ fontSize: 7.6, color: INK.faint, textAlign: 'right', marginTop: 1 }}>{ar(line.note)}</Text> : null}
            </View>
            <Text style={{ width: 10, fontFamily: NUM, fontSize: 10.5, color: INK.faint, textAlign: 'center' }}>{line.sign ?? ''}</Text>
          </View>
        </View>
      ))}
      <View style={{ paddingTop: 9, paddingBottom: 7 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <PdfAmount amount={net.amount} decimals={decimals} size={15} color={net.color} />
          <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 8 }}>
            <Text style={{ fontSize: 11, fontWeight: 'bold', color: INK.text, textAlign: 'right' }}>{ar(net.label)}</Text>
            <Text style={{ width: 10, fontFamily: NUM, fontSize: 11, color: INK.faint, textAlign: 'center' }}>=</Text>
          </View>
        </View>
      </View>
      <DoubleRule />
    </View>
  );
};

/** Subtotal, tax and the grand total, for documents that bill (invoices). */
export const PdfTotalsBlock = ({
  s,
  subtotal,
  taxAmount = 0,
  taxRate,
  total,
  subtotalLabel = 'المجموع الفرعي',
  taxLabel,
  grandLabel = 'الإجمالي المستحق',
}: {
  s: any;
  B?: PdfBrandSnapshot;
  subtotal: number;
  taxAmount?: number;
  taxRate?: number;
  total: number;
  subtotalLabel?: string;
  taxLabel?: string;
  grandLabel?: string;
}) => {
  const taxLbl = taxLabel || (taxRate != null ? `ضريبة (${taxRate} بالمئة)` : 'الضريبة');
  const decimals = decimalsFor([subtotal, taxAmount, total]);
  return (
    <View style={s.totalsBox} wrap={false}>
      {taxAmount > 0 ? (
        <>
          <View style={s.totalLine}>
            <PdfAmount amount={subtotal} decimals={decimals} bold={false} size={9.8} />
            <Text style={s.totalLabel}>{ar(subtotalLabel)}</Text>
          </View>
          <View style={s.totalLine}>
            <PdfAmount amount={taxAmount} decimals={decimals} bold={false} size={9.8} />
            <Text style={s.totalLabel}>{ar(taxLbl)}</Text>
          </View>
        </>
      ) : null}
      <View style={s.grandLine}>
        <PdfAmount amount={total} decimals={decimals} size={14.5} />
        <Text style={s.grandLbl}>{ar(grandLabel)}</Text>
      </View>
      <DoubleRule />
    </View>
  );
};

/** Notes under a hairline. */
export const PdfNotesBox = ({ s, label = 'ملاحظات', children }: { s: any; label?: string; children: React.ReactNode }) => (
  <View style={s.notesBox} wrap={false}>
    <Text style={s.notesLbl}>{ar(label)}</Text>
    {children}
  </View>
);

/** «١ دفعة، دفعتان، ٣ دفعات، ١١ دفعة»: the Arabic counted noun. */
export function countWord(n: number, forms: { one: string; two: string; few: string; many: string }): string {
  if (n === 1) return forms.one;
  if (n === 2) return forms.two;
  return `${n} ${n >= 3 && n <= 10 ? forms.few : forms.many}`;
}

export { ar, arDate, getPdfBrand };
