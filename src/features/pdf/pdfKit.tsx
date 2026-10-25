// @ts-nocheck
/**
 * pdfKit — the building blocks of every MAKIN document.
 *
 * One rule runs through all of it: each fact is printed once.
 *  - The letterhead (logo, company line, services, phones) is on the first page only.
 *  - Continuation pages carry a slim running header (small logo + what this is) and a footer
 *    that holds nothing but the document reference and the page number.
 *  - A total is shown in one place (the summary strip), not again under the table.
 */
import React from 'react';
import { Image, Page, StyleSheet, Text, View } from '@react-pdf/renderer';
import './pdfFonts';
import { PDF_FONT_FAMILY } from './pdfFonts';
import { ar, arDate } from './arabicPDF';
import { getPdfBrand, type PdfBrandSnapshot } from './pdfBrand';
import { getPdfCompanyInfo } from './pdfCompanyInfo';
import { usePdfLogoDataUri } from './pdf-logo-context';

export const INK = {
  text: '#1F2633',
  muted: '#5E6472',
  faint: '#8B909B',
  border: '#E4E0D6',
  hair: '#EDEAE2',
  zebra: '#FBFAF7',
  panel: '#F6F3EC',
  totalBg: '#F6F3EC',
  cardBg: '#FFFFFF',
  paleGold: '#FBF6E9',
  gold: '#C9972B',
  white: '#FFFFFF',
  success: '#0F766E',
  warning: '#B45309',
  danger: '#B42318',
};

export const PDF_PAGINATION = {
  tableHead: 28,
  totalBar: 30,
  minRowHeight: 26,
  section: 36,
  /** Space kept clear above the fixed footer so flowing content never runs into it. */
  footerReserve: 52,
} as const;

/** The logo file is 1600 x 416. */
const LOGO_RATIO = 416 / 1600;
const FF = PDF_FONT_FAMILY;

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
    letterhead: { alignItems: 'center', marginTop: -26, marginBottom: 16 },
    lhName: { marginTop: 9, fontSize: 10.5, fontWeight: 'bold', letterSpacing: 2.4, color: INK.text, textAlign: 'center' },
    lhServices: { marginTop: 3, fontSize: 7.8, letterSpacing: 0.7, color: INK.muted, textAlign: 'center' },
    lhPhones: { marginTop: 4, fontSize: 8.6, fontWeight: 'bold', letterSpacing: 0.6, color: INK.text, textAlign: 'center' },
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

    /* ── Document title ── */
    docTitleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 12 },
    docKicker: { fontSize: 7.4, fontWeight: 'bold', letterSpacing: 1.6, color: INK.gold, textAlign: 'right', marginBottom: 3 },
    docTitle: { fontSize: 19, fontWeight: 'bold', color: INK.text, textAlign: 'right', lineHeight: 1.25 },
    docSubtitle: { fontSize: 9.4, color: INK.muted, textAlign: 'right', marginTop: 3 },
    docMeta: { alignItems: 'flex-start', gap: 3 },
    docMetaRow: { flexDirection: 'row', gap: 6 },
    docMetaLabel: { fontSize: 7.8, color: INK.faint, textAlign: 'left' },
    docMetaValue: { fontSize: 8.6, fontWeight: 'bold', color: INK.text, textAlign: 'left' },

    /* ── Info card ── */
    infoCard: {
      flexDirection: 'row-reverse',
      borderWidth: 0.8,
      borderColor: INK.border,
      borderRadius: 4,
      backgroundColor: INK.zebra,
      marginBottom: 14,
    },
    infoCell: { flex: 1, paddingVertical: 8, paddingHorizontal: 10, alignItems: 'flex-end' },
    infoCellDivider: { borderRightWidth: 0.8, borderRightColor: INK.border },
    infoLabel: { fontSize: 7.4, color: INK.faint, marginBottom: 3, textAlign: 'right' },
    infoValue: { fontSize: 9.6, fontWeight: 'bold', color: INK.text, textAlign: 'right', lineHeight: 1.35 },

    /* ── Summary strip ── */
    summaryRow: { flexDirection: 'row-reverse', gap: 8, marginBottom: 14 },
    summaryCard: {
      flex: 1,
      paddingTop: 9,
      paddingBottom: 9,
      paddingHorizontal: 10,
      borderWidth: 0.8,
      borderColor: INK.border,
      borderRadius: 4,
      backgroundColor: INK.white,
      alignItems: 'flex-end',
    },
    summaryLabel: { fontSize: 7.8, color: INK.muted, marginBottom: 5, textAlign: 'right' },
    summaryValue: { fontSize: 13.5, fontWeight: 'bold', color: INK.text, textAlign: 'right' },
    summaryHint: { fontSize: 7.4, color: INK.faint, marginTop: 3, textAlign: 'right' },

    /* ── Section title ── */
    sectionTitle: { fontSize: 11.2, fontWeight: 'bold', color: INK.text, textAlign: 'right' },
    sectionRule: { width: 26, borderTopWidth: 1.6, borderTopColor: INK.gold, marginTop: 3, alignSelf: 'flex-end' },

    /* ── Totals + notes ── */
    totalsBox: { width: 230, alignSelf: 'flex-start', marginTop: 12 },
    totalLine: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', paddingVertical: 4 },
    totalLabel: { fontSize: 9.4, color: INK.muted, textAlign: 'right' },
    grandBar: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'baseline',
      paddingVertical: 9,
      paddingHorizontal: 10,
      marginTop: 6,
      backgroundColor: INK.text,
      borderRadius: 4,
    },
    grandLbl: { fontSize: 10.5, fontWeight: 'bold', color: INK.white, textAlign: 'right' },
    notesBox: {
      padding: 10,
      backgroundColor: INK.paleGold,
      borderRightWidth: 2.2,
      borderRightColor: INK.gold,
      borderRadius: 3,
      marginTop: 14,
      alignItems: 'flex-end',
    },
    notesLbl: { fontSize: 8.4, fontWeight: 'bold', color: INK.warning, marginBottom: 4, textAlign: 'right' },
    notesTxt: { fontSize: 9.2, color: INK.muted, textAlign: 'right', lineHeight: 1.7 },
  });
}

const groupAmount = (amount: number) => {
  const hasFraction = Math.abs(amount % 1) > 1e-9;
  return new Intl.NumberFormat('en-US', { maximumFractionDigits: hasFraction ? 3 : 0, minimumFractionDigits: hasFraction ? 1 : 0 }).format(Math.abs(amount));
};

/** An amount, then the currency: the number reads left to right and the symbol sits quietly after it. */
export const PdfMoneyText = ({
  amount,
  style,
  currStyle,
  containerStyle,
  currency = 'د.ل',
  color,
  light = false,
  bare = false,
}: {
  amount: number;
  style?: any;
  currStyle?: any;
  containerStyle?: any;
  currency?: string;
  color?: string;
  light?: boolean;
  /** Number only: for table cells whose header already names the currency. */
  bare?: boolean;
}) => {
  const sign = amount < 0 && Math.abs(amount) >= 0.0005 ? '-' : '';
  const amtColor = color || (light ? INK.white : INK.text);
  return (
    <View wrap={false} style={[{ flexDirection: 'row-reverse', alignItems: 'baseline', justifyContent: 'flex-start' }, containerStyle]}>
      <Text style={[{ fontSize: 9, fontWeight: 'bold', color: amtColor, fontFamily: FF }, style]}>{`${sign}${groupAmount(amount)}`}</Text>
      {bare ? null : (
        <Text style={[{ fontSize: 7.4, color: light ? 'rgba(255,255,255,0.8)' : INK.faint, marginRight: 3, fontFamily: FF }, currStyle]}>{currency}</Text>
      )}
    </View>
  );
};

/**
 * The letterhead: the logo, then the company line, the services line and the phones, centred.
 * Printed once, at the top of the first page.
 */
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
  B,
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
        <Text style={s.footText}>{docRef ?? ''}</Text>
      </View>
    </Page>
  );
};

/** Title block: kicker + Arabic title on the start side, reference and date on the other. */
export const PdfDocTitle = ({
  s,
  titleEn,
  titleAr,
  subtitle,
  meta,
}: {
  s: any;
  titleEn: string;
  titleAr: string;
  subtitle?: string;
  meta?: { label: string; value: string }[];
}) => (
  <View style={s.docTitleRow} wrap={false}>
    <View style={s.docMeta}>
      {(meta ?? [{ label: 'تاريخ الإصدار', value: arDate(new Date().toISOString()) }]).map((m) => (
        <View key={m.label} style={s.docMetaRow}>
          <Text style={s.docMetaValue}>{m.value}</Text>
          <Text style={s.docMetaLabel}>{ar(m.label)}</Text>
        </View>
      ))}
    </View>
    <View style={{ flex: 1, alignItems: 'flex-end' }}>
      <Text style={s.docKicker}>{titleEn}</Text>
      <Text style={s.docTitle}>{ar(titleAr)}</Text>
      {subtitle ? <Text style={s.docSubtitle}>{ar(subtitle)}</Text> : null}
    </View>
  </View>
);

/** A single bordered row of labelled facts (client, phone, period...). Empty values are dropped. */
export const PdfInfoCard = ({ s, items }: { s: any; items: { label: string; value?: string | null }[] }) => {
  const shown = items.filter((i) => i.value);
  if (shown.length === 0) return null;
  return (
    <View style={s.infoCard} wrap={false}>
      {shown.map((item, i) => (
        <View key={item.label} style={[s.infoCell, i > 0 ? s.infoCellDivider : null]}>
          <Text style={s.infoLabel}>{ar(item.label)}</Text>
          <Text style={s.infoValue}>{ar(item.value)}</Text>
        </View>
      ))}
    </View>
  );
};

/** Headline figures. A colour marks the figure that matters; a hint says what it is made of. */
export const PdfSummaryStrip = ({
  s,
  cells,
}: {
  s: any;
  cells: { label: string; value: string | number; color?: string; accent?: boolean; hint?: string; count?: boolean }[];
}) => (
  <View style={s.summaryRow} wrap={false}>
    {cells.map((cell, i) => (
      <View key={i} style={[s.summaryCard, cell.accent ? { borderTopWidth: 2.4, borderTopColor: cell.color || INK.gold } : null]}>
        <Text style={s.summaryLabel}>{ar(cell.label)}</Text>
        {typeof cell.value === 'number' && !cell.count ? (
          <PdfMoneyText amount={cell.value} style={[s.summaryValue, cell.color ? { color: cell.color } : null]} currStyle={{ fontSize: 8 }} />
        ) : (
          <Text style={[s.summaryValue, cell.color ? { color: cell.color } : null]}>{ar(String(cell.value))}</Text>
        )}
        {cell.hint ? <Text style={s.summaryHint}>{ar(cell.hint)}</Text> : null}
      </View>
    ))}
  </View>
);

/** Section heading with the short gold rule. */
export const PdfSectionHeading = ({ s, children, hint }: { s: any; children: string; hint?: string }) => (
  <View style={{ marginTop: 14, marginBottom: 8 }} minPresenceAhead={PDF_PAGINATION.section + PDF_PAGINATION.minRowHeight}>
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' }}>
      <Text style={{ fontSize: 8.2, color: INK.faint }}>{hint ? ar(hint) : ''}</Text>
      <Text style={s.sectionTitle}>{ar(children)}</Text>
    </View>
    <View style={s.sectionRule} />
  </View>
);

/**
 * Share of a total, as labelled bars: where the money went (categories) or how it came in (methods).
 * Rows are sorted largest first by the caller; `total` is the whole the bars are a share of.
 */
export const PdfBreakdown = ({
  rows,
  total,
  color = INK.text,
}: {
  rows: { label: string; amount: number }[];
  total: number;
  color?: string;
}) => (
  <View style={{ gap: 7 }}>
    {rows.map((row) => {
      const share = total > 0 ? Math.max(0, Math.min(1, row.amount / total)) : 0;
      return (
        <View key={row.label} wrap={false} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <View style={{ width: 62 }}>
            <PdfMoneyText amount={row.amount} bare style={{ fontSize: 8.6, color: INK.text }} />
          </View>
          <View style={{ width: 30 }}>
            <Text style={{ fontSize: 8, color: INK.muted, textAlign: 'left' }}>{`${Math.round(share * 100)}%`}</Text>
          </View>
          <View style={{ flex: 1, height: 5, backgroundColor: INK.hair, borderRadius: 2.5, flexDirection: 'row-reverse' }}>
            <View style={{ width: `${Math.max(share * 100, share > 0 ? 2 : 0)}%`, height: 5, backgroundColor: color, borderRadius: 2.5 }} />
          </View>
          <Text style={{ width: 118, fontSize: 8.8, color: INK.text, textAlign: 'right' }}>{ar(row.label)}</Text>
        </View>
      );
    })}
  </View>
);

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
  const taxLbl = taxLabel || (taxRate != null ? `ضريبة (${taxRate}%)` : 'الضريبة');
  return (
    <View style={s.totalsBox} wrap={false}>
      {taxAmount > 0 ? (
        <>
          <View style={s.totalLine}>
            <PdfMoneyText amount={subtotal} style={{ fontSize: 9.6, color: INK.text }} />
            <Text style={s.totalLabel}>{ar(subtotalLabel)}</Text>
          </View>
          <View style={s.totalLine}>
            <PdfMoneyText amount={taxAmount} style={{ fontSize: 9.6, color: INK.text }} />
            <Text style={s.totalLabel}>{ar(taxLbl)}</Text>
          </View>
        </>
      ) : null}
      <View style={s.grandBar}>
        <PdfMoneyText amount={total} light style={{ fontSize: 14 }} currStyle={{ fontSize: 8.5 }} />
        <Text style={s.grandLbl}>{ar(grandLabel)}</Text>
      </View>
    </View>
  );
};

/** Notes with a gold edge. */
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
